import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useResetOnUserChange } from "@/src/hooks/useResetOnUserChange";
import { onNetworkRestored } from "@/src/services/network";
import { AppBanner, DeliveryOffer, FastFood } from "@/src/types";
import { useFastFoodFetch } from "../hooks/useFastFoodFetch";
import { useFastFoodHomeSettings } from "../hooks/useFastFoodHomeSettings";
import { useFastFoodPagination } from "../hooks/useFastFoodPagination";
import { useFastFoodSocketUpdates } from "../hooks/useFastFoodSocketUpdates";
import { type HomeClientSettings } from "../utils/homeClientSettings";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
// ⚠️ `prefetchHomeImages` n'est PLUS appele. Chaque carte monte desormais son
// image des son rendu (cf. DesignItem) : le prechargement faisait donc DOUBLON.
// Les deux mecanismes se disputaient la bande passante, les requetes
// s'accumulaient, et les images arrivaient toutes en bloc au lieu d'apparaitre
// boutique par boutique. La FlatList ne monte que ce qui est visible : le
// chargement suit donc naturellement l'ordre d'affichage, sans file a gerer.

// Assemblage du home client. Chaque mecanique vit dans son module :
// pagination (`hooks/useFastFoodPagination`), requetes du catalogue
// (`hooks/useFastFoodFetch`), injection socket (`hooks/useFastFoodSocketUpdates`),
// reglages serveur (`hooks/useFastFoodHomeSettings`), normalisation
// (`utils/normalizeFastFood`). Ici : identite, reseau, recherche, `loadMore`.

/** Délai avant qu'une frappe dans la recherche parte au serveur. */
const SEARCH_DEBOUNCE_MS = 350;

interface FastFoodContextType {
  fastFoods: FastFood[];
  loading: boolean;
  /** Chargement d'une page SUIVANTE (le pull-to-refresh utilise `loading`). */
  loadingMore: boolean;
  /** false quand toutes les boutiques ont été chargées. */
  hasMore: boolean;
  /**
   * Charge la page suivante et l'ajoute à la liste. Sans effet si un
   * chargement est déjà en cours ou si la fin est atteinte.
   */
  loadMore: () => void;
  /** true une fois le 1er fetch terminé (succès, liste vide OU erreur). Reste true
   *  ensuite, même pendant un pull-to-refresh. Sert à savoir quand la home a fini
   *  son chargement initial → bascule login → home. */
  hasLoadedOnce: boolean;
  /** Mode review Apple : renvoyé par GET /fastFood/all. Quand true, le flux
   *  « buy » (home) et « Tout payer » (panier) crée la commande directement via
   *  /transaction avec des valeurs de paiement par défaut (pas de saisie USSD) ;
   *  les items Paiement/Portefeuille des settings sont masqués. En mémoire
   *  uniquement (rafraîchi à chaque fetch). */
  appleReviewMode: boolean;
  error: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (category: string) => void;
  refresh: () => Promise<void>;
  /**
   * Met a jour les boutiques deja chargees sans loader ni troncature : la
   * position de scroll est preservee. Pour le catch-up socket, pas pour un geste
   * utilisateur (celui-la passe par `refresh`).
   */
  refreshLoadedSilently: () => Promise<void>;
  /**
   * Tronque la liste a la premiere page, sans requete. Appele au retour en haut
   * du home pour ne pas garder des dizaines de cellules en memoire.
   */
  resetToFirstPage: () => void;
  /**
   * Signale un geste de scroll reel de l'utilisateur. Rearme `loadMore` apres
   * une troncature (voir `notifyUserScroll` dans l'implementation).
   */
  notifyUserScroll: () => void;
  /**
   * Invalide une page suivante encore en vol, sans tronquer. A appeler au DEBUT
   * d'une remontee vers le haut : le montage de ses cellules bloquerait le
   * thread JS pendant l'animation de scroll.
   */
  cancelPendingLoadMore: () => void;
  /**
   * Signale que la liste est STRICTEMENT en bas (a 10 px pres). Tant que ce
   * n'est pas le cas, une page arrivee RESTE EN ATTENTE : rien ne s'insere
   * sous un utilisateur remonte lire le haut. L'insertion reprend des son
   * retour au bas. Voir `pumpStaggeredAppend`.
   */
  setListAtBottom: (atBottom: boolean) => void;
  /**
   * Signale que le contenu a grandi (commit + layout des nouvelles rangees).
   * Libere le verrou de page en attente. Voir `notifyPageLaidOut`.
   */
  notifyPageLaidOut: () => void;
  /**
   * Vrai pendant l'insertion d'une page suivante (montage + layout des
   * nouvelles rangees). L'ecran fige le scroll vertical tant qu'il est vrai :
   * on ne scrolle jamais sur des cellules en cours de montage.
   */
  insertLock: boolean;
  // ── Injection directe depuis les payloads socket (pas de refetch) ──
  /** newGlobalMenu / globalMenuUpdated → upsert d'un menu dans son fastfood. */
  upsertMenuFromSocket: (menu: any) => void;
  /** globalMenuDeleted → retire un menu d'un fastfood. */
  removeMenuFromSocket: (fastFoodId: string, menuId: string) => void;
  /** newFastfood → ajoute un restaurant à la liste. */
  upsertFastFoodFromSocket: (fastFood: any) => void;
  /**
   * `bonus.armed` / `bonus.disarmed` → applique l'offre de livraison du bonus
   * armé sans refetch. Voir `applyDeliveryOffer` pour la règle de portée.
   */
  applyDeliveryOffer: (offer: DeliveryOffer | null) => void;
  /**
   * `bonus.redeemed` épuisé → retire l'offre issue de CE bonus uniquement
   * (celles d'autres bonus / campagnes sont préservées).
   */
  clearDeliveryOfferForBonus: (bonusId: string) => void;
  /** Bannières publicitaires actives du home, reçues via GET /fastfood/all. */
  banners: AppBanner[];
  /**
   * Taille de page et distance de prechargement du home, pilotees par le
   * serveur (`clientSettings`). Voir `utils/homeClientSettings`.
   */
  homeSettings: HomeClientSettings;
}

const FastFoodContext = createContext<FastFoodContextType | undefined>(
  undefined,
);

export const FastFoodProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // `user` (Firebase User) plutôt que `userData` : c'est lui qui porte le token,
  // et il devient disponible dès la restauration de session.
  // `loading` : Firebase n'a pas encore tranche sur la session. Tant qu'il est
  // vrai, `user` peut etre `null` alors qu'une session existe — d'ou la garde
  // du premier fetch plus bas (suppression du double appel au boot).
  const { user, loading: authLoading } = useAuth();
  const [fastFoods, setFastFoods] = useState<FastFood[]>([]);
  const pagination = useFastFoodPagination(fastFoods.length, setFastFoods);
  const {
    fastFoodsLenRef,
    cursorRef,
    resetLockRef,
    pendingPageRef,
    pageFetchRef,
    loadingMore,
    hasMore,
    insertLock,
    resetToFirstPage,
    notifyUserScroll,
    cancelPendingLoadMore,
    setListAtBottom,
    notifyPageLaidOut,
  } = pagination;
  const settings = useFastFoodHomeSettings();
  const { homeSettings } = settings;
  const {
    loading,
    setLoading,
    hasLoadedOnce,
    appleReviewMode,
    banners,
    setBanners,
    error,
    setError,
    errorRef,
    fetchPage,
    refreshLoadedSilently,
  } = useFastFoodFetch({ setFastFoods, pagination, settings });
  const {
    upsertMenuFromSocket,
    removeMenuFromSocket,
    upsertFastFoodFromSocket,
    applyDeliveryOffer,
    clearDeliveryOfferForBonus,
  } = useFastFoodSocketUpdates(setFastFoods);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // ⚠️ La recherche courante est lue via une REF, pas via la dependance d'un
  // `useCallback`. Sinon `refresh` et `loadMore` changent de reference a chaque
  // frappe, ce qui reexecute les effets qui en dependent (chez leurs
  // consommateurs comme ici) et peut relancer des requetes.
  const searchRef = useRef("");
  searchRef.current = searchQuery;

  /** Recharge depuis le début (pull-to-refresh). */
  const refresh = useCallback(async () => {
    cursorRef.current = null;
    await fetchPage(undefined, searchRef.current.trim() || undefined);
  }, [fetchPage, cursorRef]);

  /** Lance reellement la page suivante, une fois toutes les gardes passees. */
  const runLoadMore = useCallback(() => {
    if (!cursorRef.current) return;
    void fetchPage(cursorRef.current, searchRef.current.trim() || undefined);
  }, [fetchPage, cursorRef]);

  const loadMore = useCallback(() => {
    // Une recherche affiche ses propres résultats pagines ; on continue de
    // paginer dedans avec le meme `q`, sinon on melangerait deux listes.
    if (loadingMore || loading || !cursorRef.current) {
      console.log(
        `[ROW] LOADMORE-SKIP loadingMore=${loadingMore} loading=${loading} cursor=${cursorRef.current ? "ok" : "null"}`,
      );
      return;
    }

    // ⚠️ Verrou de troncature : on refuse UNIQUEMENT le rebond automatique.
    //
    // Juste apres `resetToFirstPage()`, la `FlatList` voit sa fin remonter sous
    // le viewport et rappelle `onEndReached` d'elle-meme, sans geste de
    // l'utilisateur. C'est CETTE demande-la qu'il faut refuser — pas la suivante.
    // Le verrou tombe des que `notifyUserScroll()` signale un scroll reel, donc
    // un utilisateur qui redescend est servi immediatement, quelle que soit sa
    // vitesse. Le refus n'a rien a reporter : le seuil sera franchi a nouveau
    // par le scroll qui leve justement le verrou.
    if (resetLockRef.current) return;

    // Page precedente pas encore inseree (en vol OU en HOLD hors du bas) : on
    // ne consomme pas le curseur suivant. Le retour au bas relancera
    // l'insertion via `setListAtBottom`, et le fetch suivant ne partira qu'au
    // NOUVEAU bas, une fois cette page en place.
    if (pendingPageRef.current) {
      console.log(`[ROW] LOADMORE-SKIP page precedente pas inseree`);
      return;
    }

    // Preuve de pagination UNE PAR UNE : n = page demandee, len = boutiques
    // deja affichees (donc bas de la page n-1). Si le bas de la page 1
    // fetchait tout, on verrait n grimper sans nouveau `AT-BOTTOM`.
    pageFetchRef.current += 1;
    pendingPageRef.current = true;
    console.log(
      `[ROW] FETCH-PAGE n=${pageFetchRef.current} len=${fastFoodsLenRef.current}`,
    );
    runLoadMore();
  }, [
    loading,
    loadingMore,
    runLoadMore,
    cursorRef,
    resetLockRef,
    pendingPageRef,
    pageFetchRef,
    fastFoodsLenRef,
  ]);

  // Refetch à CHAQUE changement d'identité — mais JAMAIS avant que Firebase
  // ait tranché.
  //
  // ⚠️ `authLoading` est la garde qui supprime le DOUBLE appel du boot. La
  // restauration de session Firebase est asynchrone : sans elle, `user` vaut
  // `null` au montage, un premier `/fastFood/all` partait SANS Bearer (donc
  // `deliveryOffer: null` partout, resultat inutilisable), puis la session
  // arrivait et un SECOND appel repartait avec le token. Deux fois la meme
  // page, dont la premiere jetee — visible dans les logs backend en paires
  // « AUCUN Bearer envoye » suivi de « token OK ».
  //
  // On attend donc la resolution : un seul appel part, deja authentifie. Le
  // refetch sur changement d'uid (login, logout, bascule de compte) reste
  // assure par `user?.uid` dans les dependances.
  //
  // ⚠️ Invite → connecte (login via la sheet d'auth, home deja affichee) : on
  // NE recharge PAS la premiere page. Ce rechargement vidait la liste et
  // allumait le loader plein ecran — la home « clignotait » en page blanche au
  // login. On rafraichit les boutiques deja chargees SUR PLACE (le Bearer
  // resout les `deliveryOffer` du compte), sans loader ni perte de scroll.
  // `null` = aucun fetch encore fait ; `undefined` = dernier fetch en invite.
  const fetchedUidRef = useRef<string | null | undefined>(null);
  useEffect(() => {
    if (authLoading) return;
    const uid = user?.uid;
    const prevUid = fetchedUidRef.current;
    fetchedUidRef.current = uid;
    if (prevUid === undefined && uid && fastFoodsLenRef.current > 0) {
      void refreshLoadedSilently();
      return;
    }
    cursorRef.current = null;
    void fetchPage(undefined, undefined);
  }, [
    fetchPage,
    refreshLoadedSilently,
    user?.uid,
    authLoading,
    fastFoodsLenRef,
    cursorRef,
  ]);

  // Retour du reseau : on recharge SEULEMENT si l'ecran d'erreur est affiche.
  // Sans cela l'utilisateur reste bloque dessus jusqu'a taper « Reessayer », le
  // reseau fut-il revenu depuis longtemps. La garde sur `error` evite de
  // rafraichir une liste deja remplie a chaque bascule WiFi / 4G.
  useEffect(
    () =>
      onNetworkRestored(() => {
        if (!errorRef.current) return;
        cursorRef.current = null;
        void fetchPage(undefined, undefined);
      }),
    [fetchPage, errorRef, cursorRef],
  );

  // Changement de compte : on repart de zero. La liste porte les
  // `deliveryOffer` du compte precedent (le backend les resout depuis le
  // Bearer), donc on la vide et le refetch ci-dessus la recharge — loader
  // compris, comme un premier chargement.
  // Sauf invite → connecte : la liste invite ne porte aucune offre de compte,
  // elle est rafraichie sur place (voir l'effet d'identite ci-dessus).
  const resetUidRef = useRef(user?.uid);
  useResetOnUserChange(user?.uid, () => {
    const wasGuest = !resetUidRef.current;
    resetUidRef.current = user?.uid;
    if (wasGuest && fastFoodsLenRef.current > 0) return;
    setFastFoods([]);
    setBanners([]);
    setError(null);
    setLoading(true);
  });

  // Recherche serveur, debouncée.
  //
  // ⚠️ Declenchee par la SAISIE, pas par un `useEffect` sur `searchQuery`. Un
  // effet se serait execute au montage — donc pendant le splash, avant meme
  // que le home existe — et aurait rejoue a chaque changement de reference de
  // `fetchPage`, ajoutant des requetes au boot. Le chargement initial est le
  // seul fait de l'effet d'identite ci-dessus, comme avant la pagination.
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => {
        cursorRef.current = null;
        void fetchPage(undefined, query.trim() || undefined);
      }, SEARCH_DEBOUNCE_MS);
    },
    [fetchPage, cursorRef],
  );

  // Un timer en vol au demontage relancerait un fetch sur un contexte mort.
  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    [],
  );

  // ⚠️ `useMemo` OBLIGATOIRE — ne JAMAIS repasser un objet litteral en `value`.
  //
  // Un litteral est recree a chaque rendu du provider : TOUS les consommateurs
  // du contexte se re-rendent alors, meme quand aucune donnee n'a bouge. Sur le
  // home, cela re-rendait en vagues les cellules visibles de la `FlatList` —
  // des cartes pourtant immobiles — avec 70 a 190 ms de blocage JS a chaque
  // vague. C'etait la cause de la micro-saccade au scroll.
  const value = useMemo(
    () => ({
      fastFoods,
      loading,
      loadingMore,
      hasMore,
      loadMore,
      hasLoadedOnce,
      appleReviewMode,
      banners,
      error,
      searchQuery,
      // Expose le handler debounce, pas le setter brut : taper doit lancer la
      // recherche serveur, et l'ecran n'a pas a s'en charger.
      setSearchQuery: handleSearchChange,
      selectedCategory,
      setSelectedCategory,
      refresh,
      refreshLoadedSilently,
      resetToFirstPage,
      notifyUserScroll,
      cancelPendingLoadMore,
      setListAtBottom,
      notifyPageLaidOut,
      insertLock,
      upsertMenuFromSocket,
      removeMenuFromSocket,
      upsertFastFoodFromSocket,
      applyDeliveryOffer,
      clearDeliveryOfferForBonus,
      homeSettings,
    }),
    [
      fastFoods,
      loading,
      loadingMore,
      hasMore,
      loadMore,
      hasLoadedOnce,
      appleReviewMode,
      banners,
      error,
      searchQuery,
      handleSearchChange,
      selectedCategory,
      refresh,
      refreshLoadedSilently,
      resetToFirstPage,
      notifyUserScroll,
      cancelPendingLoadMore,
      setListAtBottom,
      notifyPageLaidOut,
      insertLock,
      upsertMenuFromSocket,
      removeMenuFromSocket,
      upsertFastFoodFromSocket,
      applyDeliveryOffer,
      clearDeliveryOfferForBonus,
      homeSettings,
    ],
  );

  return (
    <FastFoodContext.Provider value={value}>
      {children}
    </FastFoodContext.Provider>
  );
};

export const useFastFoodContext = () => {
  const context = useContext(FastFoodContext);
  if (context === undefined) {
    throw new Error(
      "useFastFoodContext must be used within a FastFoodProvider",
    );
  }
  return context;
};

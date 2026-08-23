import { Config } from "@/src/api/config";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { auth } from "@/src/services/firebase";
import { AppBanner, DeliveryOffer, FastFood } from "@/src/types";
import axios from "axios";
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

/**
 * Boutiques chargées par page. Le catalogue vise 500 boutiques : tout charger
 * d'un coup, c'est plusieurs Mo de JSON avant le premier pixel.
 *
 */
const PAGE_SIZE = 3;

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
   * Tronque la liste a la premiere page, sans requete. Appele au retour en haut
   * du home pour ne pas garder des dizaines de cellules en memoire.
   */
  resetToFirstPage: () => void;
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
}

// ── Normalisation (partagée entre le fetch HTTP et l'injection socket) ──

/** Normalise un menu brut backend vers le format attendu par l'UI. */
export const normalizeMenu = (m: any) => {
  const menuImage =
    m.image ||
    m.coverImage ||
    (m.images && m.images.length > 0 ? m.images[0] : null);
  return {
    ...m,
    titre: m.titre || m.name || "Produit",
    prix1: m.prix1 || (m.prices && m.prices[0] ? m.prices[0].price : 0),
    prix2: m.prix2 || (m.prices && m.prices[1] ? m.prices[1].price : 0),
    prix3: m.prix3 || (m.prices && m.prices[2] ? m.prices[2].price : 0),
    optionPrix1:
      m.optionPrix1 || (m.prices && m.prices[0] ? m.prices[0].description : ""),
    optionPrix2:
      m.optionPrix2 || (m.prices && m.prices[1] ? m.prices[1].description : ""),
    optionPrix3:
      m.optionPrix3 || (m.prices && m.prices[2] ? m.prices[2].description : ""),
    // Prix bruts (hors marge) aplatis depuis `prices[]`, comme prix1/2/3.
    rawPrice1: m.prices?.[0]?.rawPrice,
    rawPrice2: m.prices?.[1]?.rawPrice,
    rawPrice3: m.prices?.[2]?.rawPrice,
    image: menuImage || "",
    images:
      m.images && m.images.length > 0 ? m.images : menuImage ? [menuImage] : [],
    disponibilite: m.disponibilite || m.status || "available",
  };
};

/** Normalise un fastfood brut backend (avec ses menus) vers le format UI. */
export const normalizeFastFood = (item: any, designIndex = 0) => {
  const RawMenu = item.menus || item.menu || [];
  const mappedMenu = RawMenu.map(normalizeMenu);
  const restaurantImage =
    item.image ||
    item.coverImage ||
    (item.images && item.images[0]) ||
    (mappedMenu.length > 0 ? mappedMenu[0].image : null);
  return {
    ...item,
    nom: item.nom || item.name || "Restaurant",
    image: restaurantImage || "",
    menu: mappedMenu,
    designIndex,
  };
};

const FastFoodContext = createContext<FastFoodContextType | undefined>(
  undefined,
);

export const FastFoodProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // `user` (Firebase User) plutôt que `userData` : c'est lui qui porte le token,
  // et il devient disponible dès la restauration de session.
  const { user } = useAuth();
  const [fastFoods, setFastFoods] = useState<FastFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  /** Curseur de la page suivante. `null` = fin de liste atteinte. */
  const cursorRef = useRef<string | null>(null);
  /**
   * Curseur rendu par la PREMIERE page. Conserve pour que
   * `resetToFirstPage()` puisse repartir exactement de la fin de cette page.
   */
  const firstPageCursorRef = useRef<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  /**
   * Numéro de la requête en cours. Une réponse dont le numéro n'est plus le
   * dernier est ignorée : sans ça, une recherche lente écraserait le résultat
   * d'une frappe plus récente, et un `loadMore` en vol viendrait polluer une
   * liste déjà réinitialisée.
   */
  const runIdRef = useRef(0);
  const [appleReviewMode, setAppleReviewMode] = useState(false);
  const [banners, setBanners] = useState<AppBanner[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  /**
   * Charge UNE page de boutiques.
   *
   * @param cursor `undefined` = première page (remplace la liste) ; sinon on
   *   concatène à l'existant.
   * @param q recherche par nom, résolue par le serveur.
   *
   * ⚠️ La recherche est SERVEUR et non locale : filtrer `fastFoods` côté client
   * ne verrait que les pages déjà chargées, donc une boutique du fond du
   * catalogue serait introuvable — une régression silencieuse.
   */
  const fetchPage = useCallback(async (cursor?: string, q?: string) => {
    const isFirstPage = !cursor;
    // ⚠️ Le compteur de génération sert UNIQUEMENT à la recherche : empêcher
    // qu'une frappe lente écrase le résultat d'une frappe plus récente. Il ne
    // doit PAS arbitrer entre deux chargements normaux.
    //
    // Au boot, l'effet d'identité part deux fois (`user = null`, puis la
    // session restaurée). Quand ce garde s'appliquait à tous les appels, le
    // second invalidait le premier : la réponse du premier était jetée sans
    // remplir la liste, et le home restait en chargement jusqu'au second
    // aller-retour. C'était la latence ressentie en cliquant « Plus tard ».
    //
    // Une liste remplie par un fetch « périmé » n'est pas un problème : le
    // fetch suivant la remplacera. Une liste VIDE, elle, bloque l'affichage.
    const myRun = isFirstPage ? ++runIdRef.current : runIdRef.current;
    /** Seule une recherche a un résultat à protéger d'une réponse tardive. */
    const guarded = !!q;
    try {
      if (isFirstPage) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      // Route PUBLIQUE mais à auth OPTIONNELLE : sans Bearer, le backend ne sait
      // pas quel user demande et renvoie `deliveryOffer: null` sur TOUS les
      // fastfoods — silencieusement, sans erreur HTTP. Le token est donc envoyé
      // dès qu'un user est connecté, pour que ses bonus livraison ARMÉS soient
      // résolus. Visiteur anonyme (ou token indisponible) : appel sans header,
      // la route continue de répondre normalement.
      const idToken = await auth.currentUser?.getIdToken().catch(() => null);
      const response = await axios.get(`${Config.apiUrl}/fastFood/all`, {
        headers: idToken ? { Authorization: `Bearer ${idToken}` } : undefined,
        params: {
          limit: PAGE_SIZE,
          ...(cursor ? { cursor } : {}),
          ...(q ? { q } : {}),
        },
      });

      // Réponse d'une recherche périmée : l'appliquer ferait réapparaître les
      // résultats d'une frappe précédente. Hors recherche, on applique
      // toujours — voir l'explication sur `guarded` plus haut.
      if (guarded && myRun !== runIdRef.current) return;

      // Flag review Apple porté par la réponse (défaut false si absent).
      setAppleReviewMode(response.data?.appleReviewMode === true);

      // Bannières : servies uniquement sur la première page par le backend.
      // Sur un `loadMore` le tableau est vide — ne pas écraser celles en place.
      if (isFirstPage) {
        setBanners(
          Array.isArray(response.data?.banners) ? response.data.banners : [],
        );
      }

      const next = response.data?.nextCursor ?? null;
      cursorRef.current = next;
      if (isFirstPage) firstPageCursorRef.current = next;
      setHasMore(!!next);

      if (response.data && response.data.data) {
        const raw: any[] = response.data.data;
        if (isFirstPage) {
          const data = raw.map((item, index) =>
            normalizeFastFood(item, index % 6),
          );
          setFastFoods(data);
        } else {
          setFastFoods((prev) => {
            // Dédup par id : un `newFastfood` reçu par socket pendant le
            // chargement peut déjà avoir inséré une boutique de cette page.
            const known = new Set(prev.map((ff) => ff.id));
            const added = raw
              .filter((item) => item?.id && !known.has(item.id))
              .map((item, i) => normalizeFastFood(item, (prev.length + i) % 6));
            if (added.length === 0) return prev;
            return [...prev, ...added];
          });
        }
      }
    } catch (err: any) {
      if (guarded && myRun !== runIdRef.current) return;
      console.error("Error fetching fast foods:", err);
      setError("Connection internet indisponible, vérifiez votre réseau");
    } finally {
      // `hasLoadedOnce` pilote la revelation de (tabs) : une reponse recue,
      // quelle qu'elle soit, prouve que le chargement a eu lieu.
      setHasLoadedOnce(true);

      // Chaque appel n'eteint QUE son propre indicateur, sinon un `loadMore`
      // masquerait une premiere page encore en vol.
      if (isFirstPage) setLoading(false);
      else setLoadingMore(false);
    }
  }, []);

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
  }, [fetchPage]);

  /**
   * Instant du dernier `resetToFirstPage()`. Juste apres une troncature, la
   * liste raccourcit brutalement : sa fin remonte sous le viewport et
   * `onEndReached` repart aussitot. Sans ce verrou, on rechargeait la page
   * qu'on venait de retirer — boucle de pagination infinie.
   */
  const lastResetAtRef = useRef(0);
  const RESET_COOLDOWN_MS = 800;

  const loadMore = useCallback(() => {
    // Une recherche affiche ses propres résultats pagines ; on continue de
    // paginer dedans avec le meme `q`, sinon on melangerait deux listes.
    if (loadingMore || loading || !cursorRef.current) return;
    if (Date.now() - lastResetAtRef.current < RESET_COOLDOWN_MS) return;
    void fetchPage(cursorRef.current, searchRef.current.trim() || undefined);
  }, [fetchPage, loading, loadingMore]);

  /**
   * Retour a la premiere page SANS requete : on tronque la liste deja chargee.
   *
   * Appele quand l'utilisateur revient en haut du home. Moins de cellules en
   * memoire = moins de travail pour la `FlatList`, et la liste retrouve l'etat
   * exact qu'elle avait apres le premier GET. Les pages suivantes seront
   * rechargees normalement au scroll.
   *
   * ⚠️ Sans effet si rien n'a ete pagine (`fastFoods.length <= PAGE_SIZE`) :
   * declencher un rendu pour rien reintroduirait le probleme qu'on corrige.
   */
  const resetToFirstPage = useCallback(() => {
    setFastFoods((prev) => {
      if (prev.length <= PAGE_SIZE) return prev;
      lastResetAtRef.current = Date.now();
      // Le curseur doit repartir de la fin de la page conservee, sinon
      // `loadMore` rechargerait des boutiques deja affichees.
      cursorRef.current = firstPageCursorRef.current;
      setHasMore(!!firstPageCursorRef.current);
      return prev.slice(0, PAGE_SIZE);
    });
  }, []);

  // Refetch à CHAQUE changement d'identité (y compris `null` → user au boot :
  // la restauration de session Firebase est asynchrone et se termine APRÈS le
  // montage). Sans ce second passage, le premier appel partirait sans Bearer et
  // la home resterait sur des `deliveryOffer: null` jusqu'au prochain reload.
  useEffect(() => {
    cursorRef.current = null;
    void fetchPage(undefined, undefined);
  }, [fetchPage, user?.uid]);

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
    [fetchPage],
  );

  // Un timer en vol au demontage relancerait un fetch sur un contexte mort.
  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    [],
  );

  // ── Injection socket : upsert/remove sur le state local, sans requête ──
  const upsertMenuFromSocket = useCallback((rawMenu: any) => {
    const menu = normalizeMenu(rawMenu);
    const ffId = rawMenu?.fastFoodId;
    if (!menu?.id || !ffId) return;
    setFastFoods((prev) =>
      prev.map((ff) => {
        if (ff.id !== ffId) return ff;
        const list = Array.isArray(ff.menu) ? ff.menu : [];
        const idx = list.findIndex((m: any) => m.id === menu.id);
        const nextMenu =
          idx >= 0
            ? list.map((m: any) => (m.id === menu.id ? { ...m, ...menu } : m))
            : [menu, ...list];
        return { ...ff, menu: nextMenu };
      }),
    );
  }, []);

  const removeMenuFromSocket = useCallback((ffId: string, menuId: string) => {
    if (!ffId || !menuId) return;
    setFastFoods((prev) =>
      prev.map((ff) =>
        ff.id === ffId
          ? { ...ff, menu: (ff.menu || []).filter((m: any) => m.id !== menuId) }
          : ff,
      ),
    );
  }, []);

  const upsertFastFoodFromSocket = useCallback((rawFastFood: any) => {
    if (!rawFastFood?.id) return;
    // Le payload contient-il les menus ? (ex. fastfoodUpdated n'envoie que les
    // infos boutique, sans les plats). Si non, on NE doit pas écraser les menus
    // déjà chargés — sinon le fast food passerait à menu=[] et disparaîtrait de
    // la home (filtre « sans plat »).
    const payloadHasMenus =
      Array.isArray(rawFastFood.menus) || Array.isArray(rawFastFood.menu);
    setFastFoods((prev) => {
      const idx = prev.findIndex((ff) => ff.id === rawFastFood.id);
      const normalized = normalizeFastFood(
        rawFastFood,
        // Insertion en tête (voir plus bas) : le design 0 est celui de la
        // première position. `prev.length % 6` valait pour un ajout en fin.
        idx >= 0 ? (prev[idx].designIndex ?? 0) : 0,
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          ...normalized,
          // Préserve les menus existants si le payload ne les fournit pas.
          menu: payloadHasMenus ? normalized.menu : next[idx].menu,
        };
        return next;
      }
      // ⚠️ Nouvelle boutique : elle s'insère en TÊTE, pas en fin. Le backend
      // trie par `createdAt` décroissant — la plus récente est donc première.
      // L'ajouter en fin la placerait au milieu d'une liste paginée, à un
      // endroit qui ne correspond à rien, et elle disparaîtrait au prochain
      // refresh. En tête, rien ne se décale sous les yeux de l'utilisateur.
      return [normalized, ...prev];
    });
  }, []);

  /**
   * Applique l'offre de livraison portée par `bonus.armed` / `bonus.disarmed`,
   * exactement comme le ferait `GET /fastFood/all` — sans refetch.
   *
   * Portée : une offre **plateforme** (`fastFoodId: null`) couvre TOUTES les
   * boutiques ; une offre ciblée ne touche que la sienne. Au désarmement le
   * backend envoie `deliveryOffer: null` sans portée : on efface donc partout,
   * le user ne pouvant avoir qu'une offre livraison active à la fois.
   */
  const clearDeliveryOfferForBonus = useCallback((bonusId: string) => {
    if (!bonusId) return;
    setFastFoods((prev) =>
      prev.map((ff) => {
        const offer = (ff as any).deliveryOffer;
        // Ciblé : on n'efface QUE si l'offre affichée vient bien de ce bonus —
        // une offre issue d'un autre bonus (ou d'une campagne) doit survivre.
        if (!offer || offer.bonusId !== bonusId) return ff;
        return { ...ff, deliveryOffer: null } as FastFood;
      }),
    );
  }, []);

  const applyDeliveryOffer = useCallback((offer: DeliveryOffer | null) => {
    setFastFoods((prev) =>
      prev.map((ff) => {
        const targets =
          !offer || offer.fastFoodId == null || offer.fastFoodId === ff.id;
        if (!targets) return ff;
        return { ...ff, deliveryOffer: offer ?? null } as FastFood;
      }),
    );
  }, []);

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
      resetToFirstPage,
      upsertMenuFromSocket,
      removeMenuFromSocket,
      upsertFastFoodFromSocket,
      applyDeliveryOffer,
      clearDeliveryOfferForBonus,
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
      resetToFirstPage,
      upsertMenuFromSocket,
      removeMenuFromSocket,
      upsertFastFoodFromSocket,
      applyDeliveryOffer,
      clearDeliveryOfferForBonus,
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

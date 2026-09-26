import { Config } from "@/src/api/config";
import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useResetOnUserChange } from "@/src/hooks/useResetOnUserChange";
import { trackBootStep } from "@/src/services/bootTelemetry";
import { getOptionalIdToken } from "@/src/services/idToken";
import { onNetworkRestored } from "@/src/services/network";
import { AppBanner, DeliveryOffer, FastFood } from "@/src/types";
import { sinceBoot } from "@/src/utils/bootClock";
import { placeholderKey } from "../utils/pagePlaceholders";
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
export const PAGE_SIZE = 6;

/**
 * Insertion DANS les fantomes de la page suivante (`utils/pagePlaceholders`) :
 * leurs cellules sont deja montees, l'insertion n'est plus qu'un rebind. On
 * insere donc des l'arrivee, sans attendre le bas (HOLD) et sans figer le
 * scroll (`insertLock`) — deux protections qui n'existaient que contre le cout
 * du montage. `false` = retour au comportement precedent.
 */
export const FILL_PLACEHOLDERS = true;

/**
 * Delai avant d'inserer une page en attente (HOLD) au retour en bas : le
 * loader reste visible 1 s, puis les donnees s'affichent a sa disparition.
 */
const HOLD_REVEAL_DELAY_MS = 1000;

/**
 * Securite du verrou d'insertion (`insertLock`) : si le layout ne confirme
 * jamais l'insertion (ex. page entierement dedupee, aucun rendu), le scroll
 * se libere seul au lieu de rester fige.
 *
 * Le verrou tient desormais jusqu'a la REVELATION des images (voir
 * `PageRevealGate`), d'ou une valeur alignee sur `MAX_WAIT_MS` de
 * `ShopRevealContext` (8 s) : a 2 s, un reseau lent liberait avant les images.
 */
const INSERT_LOCK_SAFETY_MS = 8000;

/**
 * TEST [ROW] — `false` = `resetToFirstPage()` ne tronque plus (mesure du scroll
 * sans destruction). Remettre `true` avant tout merge : sans troncature la
 * liste garde toutes ses pages en memoire.
 */
const RESET_ENABLED = false;

/**
 * Plafond de `limit` IMPOSE par le backend (`GET /fastFood/all`). Demander plus
 * n'echoue pas : le serveur rabote silencieusement, d'ou des boutiques non
 * rafraichies sans le moindre signal. Voir `architecture/restaurants.md`.
 */
const MAX_SERVER_LIMIT = 50;

/**
 * Delai au-dela duquel on entre dans la home sans le catalogue.
 *
 * `/fastFood/all` repond en ~1,5 s de façon stable (mesure : 5 appels
 * consecutifs, machine Fly.io maintenue eveillee). 12 s laissent donc huit fois
 * la marge : seul un vrai blocage declenche le garde-fou, jamais une reponse
 * simplement lente.
 */
const BOOT_GIVE_UP_MS = 12000;

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
  // `loading` : Firebase n'a pas encore tranche sur la session. Tant qu'il est
  // vrai, `user` peut etre `null` alors qu'une session existe — d'ou la garde
  // du premier fetch plus bas (suppression du double appel au boot).
  const { user, loading: authLoading } = useAuth();
  const [fastFoods, setFastFoods] = useState<FastFood[]>([]);
  /**
   * Longueur courante de `fastFoods`, lisible HORS d'un updater.
   * `resetToFirstPage()` en a besoin pour decider s'il y a lieu de tronquer
   * sans avoir a placer ses effets de bord dans le `setFastFoods` — un updater
   * peut etre rejoue par React, ce qui reposerait le verrou de troncature.
   */
  const fastFoodsLenRef = useRef(0);
  fastFoodsLenRef.current = fastFoods.length;
  // Longueur SYNCHRONE (valeur + file d'attente) : `fastFoodsLenRef` ne suit
  // que les rendus valides, donc un scroll rapide l'observe perime (fetch n=3
  // vu a `len=3` alors que la page 2 etait deja inseree) et les `designIndex`
  // de la page suivante se decalait. Ici on compte au moment meme ou on
  // empile, sans attendre le rendu.
  const pumpLenRef = useRef(0);
  // Rattrapage vers le haut uniquement (insertion socket en tete) : vers le
  // bas, ce sont le reset et la premiere page qui fixent la valeur.
  if (fastFoods.length > pumpLenRef.current)
    pumpLenRef.current = fastFoods.length;
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [insertLock, setInsertLock] = useState(false);
  // Securite : libere `insertLock` si le layout ne confirme jamais
  // l'insertion (page entierement dedupee → aucun rendu, aucun layout).
  const insertLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  /**
   * Garde-fou du splash : on entre dans la home au bout de `BOOT_GIVE_UP_MS`,
   * meme si le catalogue n'a pas repondu.
   *
   * ⚠️ `hasLoadedOnce` pilote la revelation de (tabs) et ne passait a `true`
   * qu'au `finally` du premier fetch. Or cette requete peut ne JAMAIS revenir :
   * aucun timeout axios (volontaire, cf. `setupHttp`), et le backend est
   * heberge sur Fly.io, qui endort les machines — un demarrage a froid de
   * `/fastFood/all` a ete mesure a 15-20 s, contre 1,3 s a chaud. L'app restait
   * bloquee sur le splash pendant tout ce temps, et indefiniment si la reponse
   * ne venait pas.
   *
   * Mieux vaut la home avec son message d'erreur — l'utilisateur voit l'app,
   * peut naviguer, et la reponse tardive remplit la liste quand elle arrive.
   */
  useEffect(() => {
    if (hasLoadedOnce) return;
    const t = setTimeout(() => {
      console.log("[boot] catalogue sans reponse, on entre dans la home");
      setError("Connection internet indisponible, vérifiez votre réseau");
      setHasLoadedOnce(true);
    }, BOOT_GIVE_UP_MS);
    return () => clearTimeout(t);
  }, [hasLoadedOnce]);
  /** Curseur de la page suivante. `null` = fin de liste atteinte. */
  const cursorRef = useRef<string | null>(null);
  /**
   * Curseur rendu par la PREMIERE page. Conserve pour que
   * `resetToFirstPage()` puisse repartir exactement de la fin de cette page.
   */
  const firstPageCursorRef = useRef<string | null>(null);
  /**
   * Curseur de la page suivante EN ATTENTE d'insertion. Applique dans
   * `pumpStaggeredAppend` au moment de l'insertion reelle, pas a l'arrivee
   * reseau : sinon, pendant un HOLD (utilisateur remonte), `hasMore` bascule
   * deja et la liste affiche « fin » + cache le loader alors que la derniere
   * page n'est pas encore inseree.
   */
  const pendingCursorRef = useRef<string | null | undefined>(undefined);
  /**
   * Numero de troncature, incremente a chaque `resetToFirstPage()`. Compare a
   * l'arrivee d'une page suivante : un `loadMore` parti AVANT le reset a une
   * reponse caduque, qu'il ne faut ni concatener ni laisser ecrire le curseur
   * ou `loadingMore`. Un enchainement rapide haut/bas incremente autant de
   * fois : toute reponse anterieure au dernier reset est ecartee.
   */
  const resetSeqRef = useRef(0);
  // Compteur de pages demandees (1 = premiere page du boot) : prouve dans les
  // logs que chaque page suivante est fetchee UNE PAR UNE au bas de la
  // precedente, jamais toutes d'un coup depuis le bas de la page 1.
  const pageFetchRef = useRef(1);
  // Verrou "page en attente" : `true` entre le depart du fetch et l'insertion
  // de sa page (ou son echec). Un retour au bas de la page PRECEDENTE pendant
  // ce temps ne refetch PAS : chaque bas de page ne fait qu'UN fetch, et la
  // page N+1 ne part qu'une fois la page N inseree.
  //
  // ⚠️ Libere par le LAYOUT (`notifyPageLaidOut`), pas par l'insertion : le
  // `setFastFoods` de la pompe ne commite qu'apres, et un `AT-BOTTOM` mesure
  // sur l'ancien contenu partirait sinon chercher la page N+1 depuis le bas
  // de la page N-1.
  const pendingPageRef = useRef(false);
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
  // Double l'etat : le callback de retour reseau est pose UNE fois et lirait
  // sinon un `error` fige par la closure.
  const errorRef = useRef<string | null>(null);
  errorRef.current = error;
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
    /**
     * Numero de troncature au moment du DEPART de cette requete.
     *
     * ⚠️ Un `loadMore` peut etre encore en vol quand l'utilisateur remonte en
     * haut : `resetToFirstPage()` tronque la liste, mais n'annule pas la
     * requete. Sa reponse arrivait ensuite et concatenait sa page aux boutiques
     * conservees — on rechargeait donc exactement ce qu'on venait de retirer,
     * avec la pause du reseau et un ordre qui ne correspondait plus a la
     * position de l'utilisateur. On compare donc ce numero a l'arrivee.
     */
    const myReset = resetSeqRef.current;
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
    const startedAt = Date.now();
    try {
      // SONDE [ROW] : un fetch premiere page hors boot = remplacement brutal
      // de la liste (meme effet qu'une troncature). A retirer avec la sonde.
      if (isFirstPage) console.log(`[ROW] FETCH-P1 q=${q ?? ""}`);
      if (isFirstPage) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      // Route PUBLIQUE mais à auth OPTIONNELLE : sans Bearer, le backend ne sait
      // pas quel user demande et renvoie `deliveryOffer: null` sur TOUS les
      // fastfoods — silencieusement, sans erreur HTTP. Le token est donc envoyé
      // dès qu'un user est connecté, pour que ses bonus livraison ARMÉS soient
      // résolus. Visiteur anonyme (ou token indisponible) : appel sans header,
      // la route continue de répondre normalement.
      const idToken = await getOptionalIdToken();
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

      // ⚠️ Page suivante devenue caduque : un `resetToFirstPage()` est survenu
      // pendant le vol. Concatener cette page ARAJOUTERAIT exactement les
      // boutiques qu'on vient de retirer, et `cursorRef` (remis a la fin de la
      // premiere page par le reset) serait ecrase par le curseur de cette
      // reponse — la pagination repartirait du mauvais endroit. On jette donc
      // AVANT toute ecriture. Le `finally` n'eteint plus `loadingMore` pour ce
      // cas : le reset l'a deja eteint, et le prochain `loadMore` est libre.
      if (!isFirstPage && myReset !== resetSeqRef.current) return;

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
      if (isFirstPage) {
        cursorRef.current = next;
        firstPageCursorRef.current = next;
        setHasMore(!!next);
      } else {
        // Page suivante : curseur + `hasMore` appliques a l'INSERTION reelle
        // (`pumpStaggeredAppend`), pas ici. Sinon un HOLD afficherait la fin
        // de catalogue avant que la page en attente soit inseree.
        pendingCursorRef.current = next;
      }

      if (response.data && response.data.data) {
        const raw: any[] = response.data.data;
        if (isFirstPage) {
          pageFetchRef.current = 1;
          const data = raw.map((item, index) =>
            normalizeFastFood(item, index % 6),
          );
          pumpLenRef.current = data.length;
          setFastFoods(data);
        } else {
          // La page s'insere ENTIERE D'UN COUP, mais seulement au bas strict
          // (voir `pumpStaggeredAppend`) : jamais en plein defilement, jamais
          // rangee par rangee.
          //
          // ⚠️ `pumpLenRef`, pas `fastFoodsLenRef` : celui-ci ne suit que les
          // rendus valides, perime des qu'on scrolle vite (page N inseree mais
          // pas encore commitee quand la N+1 calcule sa base). On compte au
          // moment ou on empile : la base reste exacte meme en fling.
          const base = pumpLenRef.current + staggerQueueRef.current.length;
          const batch = raw
            .filter((item) => item?.id)
            .map((item, i) => normalizeFastFood(item, (base + i) % 6));
          pumpLenRef.current += batch.length;
          staggerQueueRef.current.push(...batch);
          // Page vide : rien ne s'insera, on applique le curseur tout de suite
          // puis on libere le fetch suivant et on eteint le loader (aucun
          // layout a attendre).
          if (batch.length === 0) {
            if (pendingCursorRef.current !== undefined) {
              cursorRef.current = pendingCursorRef.current;
              setHasMore(!!pendingCursorRef.current);
              pendingCursorRef.current = undefined;
            }
            pendingPageRef.current = false;
            setLoadingMore(false);
          }
          console.log(
            `[ROW] PAGE-ARRIVEE +${batch.length} (file=${staggerQueueRef.current.length})`,
          );
          pumpStaggeredAppend();
        }
      }
    } catch (err: any) {
      if (guarded && myRun !== runIdRef.current) return;
      console.error("Error fetching fast foods:", err);
      setError("Connection internet indisponible, vérifiez votre réseau");
      // Echec d'une page suivante : rien ne s'insera, le prochain bas
      // pourra reessayer au lieu de rester verrouille. Le loader s'eteint
      // tout de suite (aucun layout a attendre).
      if (!isFirstPage) {
        pendingPageRef.current = false;
        if (myReset === resetSeqRef.current) setLoadingMore(false);
      }
    } finally {
      // Mesure du chargement qui LEVE LE SPLASH : c'est le chemin critique du
      // demarrage, la seule requete dont l'affichage depend vraiment.
      if (isFirstPage && !hasLoadedOnce) {
        const elapsed = Date.now() - startedAt;
        console.log(
          `[boot t=${sinceBoot()}s] /fastFood/all en ${(elapsed / 1000).toFixed(2)}s`,
        );
        trackBootStep("catalogue", elapsed);
      }

      // `hasLoadedOnce` pilote la revelation de (tabs) : une reponse recue,
      // quelle qu'elle soit, prouve que le chargement a eu lieu.
      setHasLoadedOnce(true);

      // Chaque appel n'eteint QUE son propre indicateur, sinon un `loadMore`
      // masquerait une premiere page encore en vol.
      //
      // ⚠️ Une page suivante devenue caduque (reset pendant son vol) ne touche
      // plus a `loadingMore` : le reset l'a deja eteint pour faire disparaitre
      // le loader tout de suite, et un `loadMore` legitime a pu repartir
      // depuis. L'eteindre ici masquerait CE chargement-la.
      //
      // ⚠️ Le loader d'une page suivante ne s'eteint PAS a la reponse : il
      // reste visible pendant l'attente (HOLD) et l'insertion, jusqu'au layout
      // (`notifyPageLaidOut`). Sinon l'utilisateur ne verrait rien entre la
      // fin du fetch et l'apparition des cartes.
      if (isFirstPage) setLoading(false);
    }
  }, []);

  // ⚠️ La recherche courante est lue via une REF, pas via la dependance d'un
  // `useCallback`. Sinon `refresh` et `loadMore` changent de reference a chaque
  // frappe, ce qui reexecute les effets qui en dependent (chez leurs
  // consommateurs comme ici) et peut relancer des requetes.
  const searchRef = useRef("");
  searchRef.current = searchQuery;

  /**
   * Rafraichit SILENCIEUSEMENT les boutiques deja chargees, sans toucher ni au
   * loader, ni au curseur, ni a l'ordre de la liste.
   *
   * ⚠️ Volontairement distinct de `refresh()` : celui-ci repart de la premiere
   * page, ce qui allume le loader plein ecran et TRONQUE la liste — l'utilisateur
   * revenant dans l'app perdrait sa position de scroll et verrait un ecran de
   * chargement sur une liste deja affichee.
   *
   * Ici on remplace chaque boutique par sa version fraiche, a la meme position.
   * Une boutique absente de la reponse est CONSERVEE : elle appartient peut-etre
   * a une page au-dela de `limit`, et la retirer la ferait disparaitre de l'ecran.
   *
   * Appele par le catch-up socket (retour au premier plan, reconnexion) : les
   * events du catalogue sont des broadcasts globaux que le backend ne rejoue
   * jamais, donc prix et menus modifies pendant l'absence seraient perdus.
   */
  const refreshLoadedSilently = useCallback(async () => {
    const loadedCount = fastFoodsLenRef.current;
    if (loadedCount === 0) return;

    try {
      const idToken = await getOptionalIdToken();
      const headers = idToken
        ? { Authorization: `Bearer ${idToken}` }
        : undefined;

      // ⚠️ Le backend PLAFONNE `limit` a 50. Une seule requete laisserait donc
      // les boutiques au-dela du 50e avec leurs anciens prix — silencieusement.
      // On enchaine les pages par curseur jusqu'a couvrir tout ce qui est
      // affiche. `PAGE_SIZE` vaut 3 : sans ce plafond de 50 par requete, un
      // catalogue de 100 boutiques demanderait 34 allers-retours au lieu de 2.
      const fresh = new Map<string, any>();
      let cursor: string | null = null;

      while (fresh.size < loadedCount) {
        const response: any = await axios.get(`${Config.apiUrl}/fastFood/all`, {
          headers,
          params: {
            limit: Math.min(loadedCount - fresh.size, MAX_SERVER_LIMIT),
            ...(cursor ? { cursor } : {}),
          },
        });

        // Au login invite → connecte, c'est ce rafraichissement qui remplace le
        // fetch premiere page : le flag review doit suivre le compte connecte.
        if (!cursor) setAppleReviewMode(response.data?.appleReviewMode === true);

        const raw: any[] = response.data?.data ?? [];
        for (const item of raw) {
          if (item?.id) fresh.set(item.id, item);
        }

        cursor = response.data?.nextCursor ?? null;
        // Fin de catalogue, ou page vide : insister bouclerait a l'infini.
        if (!cursor || raw.length === 0) break;
      }

      if (fresh.size === 0) return;

      setFastFoods((prev) =>
        prev.map((ff, index) => {
          const updated = fresh.get(ff.id);
          // `designIndex` suit la POSITION dans la liste, pas la boutique : on
          // le recalcule ici, sinon une boutique gardee changerait d'apparence.
          // `listKey` conserve : la perdre changerait la cle de ligne et
          // remonterait la cellule.
          return updated
            ? { ...normalizeFastFood(updated, index % 6), listKey: (ff as any).listKey }
            : ff;
        }),
      );
    } catch {
      // Rattrapage silencieux : un echec ne doit ni afficher d'erreur, ni
      // remplacer les donnees en place. Le prochain retour reessaiera.
    }
  }, []);

  /** Recharge depuis le début (pull-to-refresh). */
  const refresh = useCallback(async () => {
    cursorRef.current = null;
    await fetchPage(undefined, searchRef.current.trim() || undefined);
  }, [fetchPage]);

  /**
   * Verrou pose par `resetToFirstPage()`. Juste apres une troncature, la liste
   * raccourcit brutalement : sa fin remonte sous le viewport et `onEndReached`
   * repart AUSSITOT, sans le moindre geste de l'utilisateur. Sans verrou, on
   * rechargeait la page qu'on venait de retirer — boucle de pagination infinie.
   *
   * ⚠️ Ce verrou etait un COOLDOWN de 800 ms, remplace ici par un rearmement au
   * geste (`notifyUserScroll`). Un delai fixe est une devinette : il refusait
   * aussi les demandes LEGITIMES d'un utilisateur qui redescend vite — avec
   * PAGE_SIZE=3 le bas de liste est atteint en ~300 ms, donc quasi toujours
   * dans la fenetre. Le loader restait alors fige et la page suivante
   * n'arrivait jamais. On ne devine plus une duree : on distingue le rebond
   * automatique (aucun scroll entre la troncature et `onEndReached`) du scroll
   * reel (un `onScroll` est passe entre-temps).
   */
  const resetLockRef = useRef(false);

  /** Lance reellement la page suivante, une fois toutes les gardes passees. */
  const runLoadMore = useCallback(() => {
    if (!cursorRef.current) return;
    void fetchPage(cursorRef.current, searchRef.current.trim() || undefined);
  }, [fetchPage]);

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
  }, [loading, loadingMore, runLoadMore]);

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
    if (!RESET_ENABLED) return;
    // ⚠️ Les effets de bord sont ICI, PAS dans l'updater de `setFastFoods`.
    // Un updater n'est pas garanti execute une seule fois : React le rejoue
    // (StrictMode, rendu concurrent, re-rendu declenche par un contexte
    // voisin — frequent sur ce home). Quand le verrou et le curseur y vivaient,
    // une simple notification entrante les reposait apres coup et gelait la
    // pagination. Ne pas les y remettre.
    if (fastFoodsLenRef.current <= PAGE_SIZE) return;

    // SONDE [ROW] : qui tronque pendant le scroll ? A retirer avec la sonde.
    console.log(
      `[ROW] RESET-TRONCATURE len=${fastFoodsLenRef.current} seq=${resetSeqRef.current + 1}`,
    );

    // Verrou leve au premier scroll reel (`notifyUserScroll`) : seule la
    // demande automatique nee de la troncature est refusee.
    resetLockRef.current = true;
    // Invalide toute page suivante encore en vol : sa reponse ne sera ni
    // concatenee ni autorisee a ecrire le curseur (voir `fetchPage`).
    resetSeqRef.current += 1;
    // Une page en attente (HOLD) ne doit pas ressusciter apres la troncature :
    // la file est videe, la pagination repartira du curseur remis plus bas.
    staggerQueueRef.current = [];
    staggerPumpOnRef.current = false;
    pumpHoldLoggedRef.current = false;
    pendingCursorRef.current = undefined;
    if (holdRevealTimerRef.current) {
      clearTimeout(holdRevealTimerRef.current);
      holdRevealTimerRef.current = null;
    }
    if (insertLockTimerRef.current) {
      clearTimeout(insertLockTimerRef.current);
      insertLockTimerRef.current = null;
    }
    setInsertLock(false);
    pendingPageRef.current = false;
    // ⚠️ Le loader de pagination s'eteint ICI, sans attendre la reponse en vol.
    // Sinon il restait anime en bas d'une liste qu'on vient de tronquer, alors
    // que l'utilisateur est remonte en haut et que plus rien ne sera ajoute.
    setLoadingMore(false);
    // Le curseur doit repartir de la fin de la page conservee, sinon
    // `loadMore` rechargerait des boutiques deja affichees.
    cursorRef.current = firstPageCursorRef.current;
    setHasMore(!!firstPageCursorRef.current);
    // La base des designs repart de la liste conservee.
    pumpLenRef.current = PAGE_SIZE;
    setFastFoods((prev) =>
      prev.length <= PAGE_SIZE ? prev : prev.slice(0, PAGE_SIZE),
    );
  }, []);

  /**
   * Appele par l'ecran a chaque `onScroll`. Leve le verrou pose par la
   * troncature : a partir de la, `onEndReached` traduit une intention reelle
   * de l'utilisateur et non le rebond de la liste qui vient de raccourcir.
   */
  const notifyUserScroll = useCallback(() => {
    if (resetLockRef.current) resetLockRef.current = false;
  }, []);

  /**
   * Appele au DEBUT d'une remontee vers le haut (tap sur l'onglet Home), avant
   * l'animation de scroll et donc bien avant la troncature.
   *
   * ⚠️ Sans lui, une page suivante encore en vol arrivait PENDANT la remontee :
   * la `FlatList` montait ses cellules (~100 ms de commit natif chacune, cf.
   * architecture/restaurants.md), ce qui bloque le thread JS au moment precis
   * ou l'animation de scroll doit tourner — d'où la pause et le saut ressentis.
   * Le reset seul ne suffisait pas : il n'intervient qu'a la fin de l'animation
   * (`setTimeout(450)`), donc apres que les cellules se sont montees pour rien.
   */
  const cancelPendingLoadMore = useCallback(() => {
    resetSeqRef.current += 1;
    // Comme pour le reset : pas de page en attente qui surgirait pendant la
    // remontee.
    staggerQueueRef.current = [];
    staggerPumpOnRef.current = false;
    pumpHoldLoggedRef.current = false;
    pendingCursorRef.current = undefined;
    if (holdRevealTimerRef.current) {
      clearTimeout(holdRevealTimerRef.current);
      holdRevealTimerRef.current = null;
    }
    if (insertLockTimerRef.current) {
      clearTimeout(insertLockTimerRef.current);
      insertLockTimerRef.current = null;
    }
    setInsertLock(false);
    pendingPageRef.current = false;
    setLoadingMore(false);
  }, []);

  /**
   * File d'insertion : les pages suivantes s'ajoutent LA PAGE ENTIERE D'UN
   * COUP, en un seul rendu, jamais rangee par rangee. Une seule pompe tourne
   * a la fois pour preserver l'ordre des pages.
   *
   * ⚠️ JAMAIS d'insertion hors du bas strict : si l'utilisateur est remonte
   * entre le fetch et l'arrivee, la page attend (pompe arretee, `HOLD`) et ne
   * s'insere qu'a son retour au bas (`setListAtBottom(true)` relance).
   *
   * ⚠️ Le fetch reste UNE PAGE par arrivee au bas (voir `loadMore`) : on
   * n'insere d'un coup que la page qui vient d'arriver, jamais tout le
   * catalogue.
   */
  const staggerQueueRef = useRef<any[]>([]);
  const staggerPumpOnRef = useRef(false);
  // Vrai = liste strictement en bas (pose par l'ecran, a 10 px pres).
  const listAtBottomRef = useRef(false);
  // Sonde : n'afficher `PUMP-HOLD` qu'une fois par attente, pas a chaque frame.
  const pumpHoldLoggedRef = useRef(false);
  // Insertion differee d'une page en HOLD au retour en bas (voir
  // `setListAtBottom`). Annulee si l'utilisateur remonte avant la fin.
  const holdRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pumpStaggeredAppend = useCallback(() => {
    // Une seule pompe a la fois : une page arrivant pendant qu'une pompe
    // tourne est prise en charge par celle-ci, jamais en double.
    if (staggerPumpOnRef.current) return;
    staggerPumpOnRef.current = true;
    // Pas en bas : on ARRETE la pompe sans consommer, la page attend. Le
    // retour au bas relance via `setListAtBottom`.
    // (`FILL_PLACEHOLDERS` : jamais d'attente, la page remplit ses fantomes.)
    if (!listAtBottomRef.current && !FILL_PLACEHOLDERS) {
      staggerPumpOnRef.current = false;
      if (!pumpHoldLoggedRef.current) {
        pumpHoldLoggedRef.current = true;
        console.log(
          `[ROW] PUMP-HOLD en attente du bas (${staggerQueueRef.current.length} en file)`,
        );
      }
      return;
    }
    const batch = staggerQueueRef.current;
    staggerQueueRef.current = [];
    staggerPumpOnRef.current = false;
    if (batch.length === 0) return;
    // Insertion reelle : le curseur de cette page prend effet ici seulement.
    // Pendant un HOLD, `hasMore` gardait donc l'ancienne valeur et le loader
    // restait affichable jusqu'au retour en bas.
    if (pendingCursorRef.current !== undefined) {
      cursorRef.current = pendingCursorRef.current;
      setHasMore(!!pendingCursorRef.current);
      pendingCursorRef.current = undefined;
    }
    pumpHoldLoggedRef.current = false;
    console.log(`[ROW] PUMP-APPEND page de ${batch.length} D'UN COUP`);
    // Verrou : le scroll vertical est fige jusqu'au layout des nouvelles
    // rangees (`notifyPageLaidOut`) — jamais de scroll sur un montage en
    // cours. Pose AVANT le `setFastFoods` pour couvrir aussi le commit.
    // Sans objet en `FILL_PLACEHOLDERS` : rien ne se monte, tout se rebind.
    if (!FILL_PLACEHOLDERS) {
      setInsertLock(true);
      if (insertLockTimerRef.current) clearTimeout(insertLockTimerRef.current);
      insertLockTimerRef.current = setTimeout(() => {
        insertLockTimerRef.current = null;
        setInsertLock(false);
      }, INSERT_LOCK_SAFETY_MS);
    } else {
      // Fin du chargement DANS LE MEME LOT que le remplissage : un seul rendu.
      // Sinon `notifyPageLaidOut` (croissance du contenu, donc seulement quand
      // de nouveaux fantomes s'ajoutent : page 2, pas la derniere) relancait
      // un second rendu complet du home en plein scroll — la pause ressentie
      // au remplissage de l'avant-derniere page, absente a la derniere.
      pendingPageRef.current = false;
      setLoadingMore(false);
    }
    setFastFoods((prev) => {
      // Dédup par id : un `newFastfood` reçu par socket pendant le
      // chargement peut déjà avoir inséré une boutique de cette page.
      const known = new Set(prev.map((ff) => ff.id));
      const added = batch.filter((item) => item?.id && !known.has(item.id));
      if (added.length === 0) return prev;
      if (!FILL_PLACEHOLDERS) return [...prev, ...added];
      // Chaque boutique reprend la cle de ligne ET le design du fantome qu'elle
      // remplace (rang reel `prev.length + i`, exact meme apres une insertion
      // socket en tete) : FlashList remplit la meme cellule, rien ne bouge.
      return [
        ...prev,
        ...added.map((ff, i) => ({
          ...ff,
          designIndex: (prev.length + i) % 6,
          listKey: placeholderKey(prev.length + i),
        })),
      ];
    });
  }, []);

  // Retour au bas strict : relance l'insertion d'une page en attente, après
  // `HOLD_REVEAL_DELAY_MS` (loader visible 1 s, donnees ensuite).
  const setListAtBottom = useCallback(
    (atBottom: boolean) => {
      listAtBottomRef.current = atBottom;
      // Remontee avant la fin du delai : on annule la revelation, la page
      // reste en attente et ne s'inserera jamais hors du bas.
      if (!atBottom) {
        if (holdRevealTimerRef.current) {
          clearTimeout(holdRevealTimerRef.current);
          holdRevealTimerRef.current = null;
        }
        return;
      }
      if (
        atBottom &&
        staggerQueueRef.current.length > 0 &&
        !staggerPumpOnRef.current &&
        !holdRevealTimerRef.current
      ) {
        // Le loader se rallume pour l'insertion differee.
        setLoadingMore(true);
        holdRevealTimerRef.current = setTimeout(() => {
          holdRevealTimerRef.current = null;
          pumpStaggeredAppend();
        }, HOLD_REVEAL_DELAY_MS);
      }
    },
    [pumpStaggeredAppend],
  );

  // Timers en vol au demontage : ne pas inserer sur un contexte mort.
  useEffect(
    () => () => {
      if (holdRevealTimerRef.current) clearTimeout(holdRevealTimerRef.current);
      if (insertLockTimerRef.current) clearTimeout(insertLockTimerRef.current);
    },
    [],
  );

  /**
   * Le contenu de la liste a GRANDI (nouvelles rangees commitees et mesurees).
   * Libere le verrou `pendingPageRef`, le verrou de scroll (`insertLock`) ET
   * eteint le loader : le bas est desormais le vrai bas de la nouvelle page,
   * le fetch suivant y est autorise. Sans cela, un `AT-BOTTOM` mesure sur
   * l'ancien contenu (avant le commit) partait chercher la page N+1 depuis le
   * bas de la page N-1.
   */
  const notifyPageLaidOut = useCallback(() => {
    if (pendingPageRef.current) {
      pendingPageRef.current = false;
      console.log(`[ROW] LAYOUT-OK verrou page libere`);
    }
    if (insertLockTimerRef.current) {
      clearTimeout(insertLockTimerRef.current);
      insertLockTimerRef.current = null;
    }
    setInsertLock(false);
    setLoadingMore(false);
  }, []);

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
  }, [fetchPage, refreshLoadedSilently, user?.uid, authLoading]);

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
    [fetchPage],
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

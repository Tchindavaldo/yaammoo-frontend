import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import { Config } from '@/src/api/config';
import { auth } from '@/src/services/firebase';
import { useAuth } from '@/src/features/auth/context/AuthContext';
import { DeliveryOffer, FastFood, AppBanner } from '@/src/types';
import { prefetchHomeImages } from '@/src/features/restaurants/utils/prefetchHomeImages';

/**
 * Boutiques chargées par page. Le catalogue vise 500 boutiques : tout charger
 * d'un coup, c'est plusieurs Mo de JSON avant le premier pixel.
 */
const PAGE_SIZE = 10;

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
    m.image || m.coverImage || (m.images && m.images.length > 0 ? m.images[0] : null);
  return {
    ...m,
    titre: m.titre || m.name || 'Produit',
    prix1: m.prix1 || (m.prices && m.prices[0] ? m.prices[0].price : 0),
    prix2: m.prix2 || (m.prices && m.prices[1] ? m.prices[1].price : 0),
    prix3: m.prix3 || (m.prices && m.prices[2] ? m.prices[2].price : 0),
    optionPrix1: m.optionPrix1 || (m.prices && m.prices[0] ? m.prices[0].description : ''),
    optionPrix2: m.optionPrix2 || (m.prices && m.prices[1] ? m.prices[1].description : ''),
    optionPrix3: m.optionPrix3 || (m.prices && m.prices[2] ? m.prices[2].description : ''),
    // Prix bruts (hors marge) aplatis depuis `prices[]`, comme prix1/2/3.
    rawPrice1: m.prices?.[0]?.rawPrice,
    rawPrice2: m.prices?.[1]?.rawPrice,
    rawPrice3: m.prices?.[2]?.rawPrice,
    image: menuImage || '',
    images: m.images && m.images.length > 0 ? m.images : (menuImage ? [menuImage] : []),
    disponibilite: m.disponibilite || m.status || 'available',
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
    nom: item.nom || item.name || 'Restaurant',
    image: restaurantImage || '',
    menu: mappedMenu,
    designIndex,
  };
};

const FastFoodContext = createContext<FastFoodContextType | undefined>(undefined);

export const FastFoodProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // `user` (Firebase User) plutôt que `userData` : c'est lui qui porte le token,
  // et il devient disponible dès la restauration de session.
  const { user } = useAuth();
  const [fastFoods, setFastFoods] = useState<FastFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  /** Curseur de la page suivante. `null` = fin de liste atteinte. */
  const cursorRef = useRef<string | null>(null);
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

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
    // ⚠️ Seule une PREMIÈRE page ouvre une nouvelle génération. Un `loadMore`
    // se contente de vérifier qu'il appartient toujours à la génération
    // courante : s'il l'incrémentait, il invaliderait la première page encore
    // en vol et la liste ne serait jamais remplacée.
    const myRun = isFirstPage ? ++runIdRef.current : runIdRef.current;
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

      // Réponse périmée (recherche plus récente, ou liste réinitialisée) :
      // l'appliquer ferait réapparaître des résultats obsolètes.
      if (myRun !== runIdRef.current) return;

      // Flag review Apple porté par la réponse (défaut false si absent).
      setAppleReviewMode(response.data?.appleReviewMode === true);

      // Bannières : servies uniquement sur la première page par le backend.
      // Sur un `loadMore` le tableau est vide — ne pas écraser celles en place.
      if (isFirstPage) {
        setBanners(Array.isArray(response.data?.banners) ? response.data.banners : []);
      }

      const next = response.data?.nextCursor ?? null;
      cursorRef.current = next;
      setHasMore(!!next);

      if (response.data && response.data.data) {
        const raw: any[] = response.data.data;
        if (isFirstPage) {
          const data = raw.map((item, index) => normalizeFastFood(item, index % 6));
          setFastFoods(data);
          prefetchHomeImages(data, response.data?.banners);
        } else {
          setFastFoods((prev) => {
            // Dédup par id : un `newFastfood` reçu par socket pendant le
            // chargement peut déjà avoir inséré une boutique de cette page.
            const known = new Set(prev.map((ff) => ff.id));
            const added = raw
              .filter((item) => item?.id && !known.has(item.id))
              .map((item, i) => normalizeFastFood(item, (prev.length + i) % 6));
            if (added.length === 0) return prev;
            // Les images des pages suivantes doivent aussi être préchargées,
            // sinon seule la première page en profite.
            prefetchHomeImages(added);
            return [...prev, ...added];
          });
        }
      }
    } catch (err: any) {
      if (myRun !== runIdRef.current) return;
      console.error('Error fetching fast foods:', err);
      setError('Connection internet indisponible, vérifiez votre réseau');
    } finally {
      // Chaque appel n'éteint QUE son propre indicateur : un `loadMore` qui
      // remettrait `loading` à false masquerait une première page encore en vol.
      if (myRun === runIdRef.current) {
        if (isFirstPage) setLoading(false);
        else setLoadingMore(false);
        setHasLoadedOnce(true);
      }
    }
  }, []);

  /** Recharge depuis le début (boot, pull-to-refresh, changement d'identité). */
  const refresh = useCallback(async () => {
    cursorRef.current = null;
    await fetchPage(undefined, searchQuery.trim() || undefined);
  }, [fetchPage, searchQuery]);

  const loadMore = useCallback(() => {
    // Une recherche affiche ses propres résultats pagines ; on continue de
    // paginer dedans avec le meme `q`, sinon on melangerait deux listes.
    if (loadingMore || loading || !cursorRef.current) return;
    void fetchPage(cursorRef.current, searchQuery.trim() || undefined);
  }, [fetchPage, loading, loadingMore, searchQuery]);

  // Refetch à CHAQUE changement d'identité (y compris `null` → user au boot :
  // la restauration de session Firebase est asynchrone et se termine APRÈS le
  // montage). Sans ce second passage, le premier appel partirait sans Bearer et
  // la home resterait sur des `deliveryOffer: null` jusqu'au prochain reload.
  useEffect(() => {
    cursorRef.current = null;
    void fetchPage(undefined, undefined);
  }, [fetchPage, user?.uid]);

  // Recherche serveur, debouncée : chaque frappe repart de la première page.
  // ⚠️ On saute le tout premier passage — l'effet d'identité ci-dessus a déjà
  // lancé le chargement initial, et le rejouer ici doublerait la requête.
  const searchMounted = useRef(false);
  useEffect(() => {
    if (!searchMounted.current) {
      searchMounted.current = true;
      return;
    }
    const t = setTimeout(() => {
      cursorRef.current = null;
      void fetchPage(undefined, searchQuery.trim() || undefined);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery, fetchPage]);

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
        idx >= 0 ? prev[idx].designIndex ?? 0 : 0,
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

  return (
    <FastFoodContext.Provider
      value={{
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
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        refresh,
        upsertMenuFromSocket,
        removeMenuFromSocket,
        upsertFastFoodFromSocket,
        applyDeliveryOffer,
        clearDeliveryOfferForBonus,
      }}
    >
      {children}
    </FastFoodContext.Provider>
  );
};

export const useFastFoodContext = () => {
  const context = useContext(FastFoodContext);
  if (context === undefined) {
    throw new Error('useFastFoodContext must be used within a FastFoodProvider');
  }
  return context;
};

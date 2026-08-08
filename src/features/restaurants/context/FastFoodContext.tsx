import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { Config } from '@/src/api/config';
import { auth } from '@/src/services/firebase';
import { useAuth } from '@/src/features/auth/context/AuthContext';
import { DeliveryOffer, FastFood } from '@/src/types';

interface FastFoodContextType {
  fastFoods: FastFood[];
  loading: boolean;
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
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [appleReviewMode, setAppleReviewMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const fetchFastFoods = useCallback(async () => {
    try {
      setLoading(true);
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
      });

      // Flag review Apple porté par la réponse (défaut false si absent).
      setAppleReviewMode(response.data?.appleReviewMode === true);

      if (response.data && response.data.data) {
        const data = response.data.data.map((item: any, index: number) =>
          normalizeFastFood(item, index % 6),
        );
        setFastFoods(data);
      }
    } catch (err: any) {
      console.error('Error fetching fast foods:', err);
      setError('Connection internet indisponible, vérifiez votre réseau');
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  }, []);

  // Refetch à CHAQUE changement d'identité (y compris `null` → user au boot :
  // la restauration de session Firebase est asynchrone et se termine APRÈS le
  // montage). Sans ce second passage, le premier appel partirait sans Bearer et
  // la home resterait sur des `deliveryOffer: null` jusqu'au prochain reload.
  useEffect(() => {
    fetchFastFoods();
  }, [fetchFastFoods, user?.uid]);

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
        idx >= 0 ? prev[idx].designIndex ?? 0 : prev.length % 6,
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
      return [...prev, normalized];
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
        hasLoadedOnce,
        appleReviewMode,
        error,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        refresh: fetchFastFoods,
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

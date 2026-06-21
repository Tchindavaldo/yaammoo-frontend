import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { Config } from '@/src/api/config';
import { FastFood } from '@/src/types';

interface FastFoodContextType {
  fastFoods: FastFood[];
  loading: boolean;
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
  const [fastFoods, setFastFoods] = useState<FastFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const fetchFastFoods = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${Config.apiUrl}/fastFood/all`);

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
    }
  }, []);

  useEffect(() => {
    fetchFastFoods();
  }, [fetchFastFoods]);

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
    setFastFoods((prev) => {
      const idx = prev.findIndex((ff) => ff.id === rawFastFood.id);
      const normalized = normalizeFastFood(
        rawFastFood,
        idx >= 0 ? prev[idx].designIndex ?? 0 : prev.length % 6,
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...normalized };
        return next;
      }
      return [...prev, normalized];
    });
  }, []);

  return (
    <FastFoodContext.Provider
      value={{
        fastFoods,
        loading,
        error,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        refresh: fetchFastFoods,
        upsertMenuFromSocket,
        removeMenuFromSocket,
        upsertFastFoodFromSocket,
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

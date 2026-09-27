import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo } from "react";
import { Text, View } from "react-native";
import { Theme } from "@/src/theme";
import { AppBanner, Menu } from "@/src/types";
import { DesignRouter } from "../components/DesignRouter";
import { HeroBanner } from "../components/HeroBanner";
import { homeStyles as styles } from "../components/home/homeScreenStyles";
import { designNumberFor } from "../utils/designCycle";
import { isBannerItem } from "../utils/homeListConfig";

interface Params {
  banners: AppBanner[];
  loading: boolean;
  hasMore: boolean;
  fastFoodsCount: number;
  searchQuery: string;
  onBannerPress: (banner: AppBanner) => void;
  /** Handler a identite FIGEE (`useHomeCheckout().onMenuClickStable`). */
  onMenuClick: (menu: Menu) => void;
}

/**
 * Rendu des cellules de la FlashList du home : `renderItem`, `keyExtractor`,
 * `getItemType` et pied de liste. Tous STABLES : voir « references stables »
 * dans architecture/restaurants.md.
 */
export const useHomeListRenderers = ({
  banners,
  loading,
  hasMore,
  fastFoodsCount,
  searchQuery,
  onBannerPress,
  onMenuClick,
}: Params) => {
  // Pied de liste : le loader de pagination vit HORS de la liste (overlay
  // fixe au-dessus de la navbar, en fade) pour ne jamais toucher au contenu :
  // ici seulement les etats stables (vide, fin de catalogue).
  const listFooter = useMemo(() => {
    if (fastFoodsCount === 0 && !loading) {
      return (
        <View style={styles.centered}>
          <Ionicons
            name="search-outline"
            size={60}
            color={Theme.colors.gray[200]}
          />
          <Text style={styles.emptyText}>
            {searchQuery
              ? `Aucun restaurant trouvé pour "${searchQuery}"`
              : "Aucun restaurant disponible pour le moment"}
          </Text>
        </View>
      );
    }
    if (!hasMore && !loading && fastFoodsCount > 0) {
      return (
        <View style={styles.footerEnd}>
          <Text style={styles.footerEndText}>
            Vous avez vu toutes les boutiques
          </Text>
        </View>
      );
    }
    return null;
  }, [hasMore, loading, fastFoodsCount, searchQuery]);

  // ⚠️ `renderItem` et `keyExtractor` DOIVENT rester stables.
  //
  // Inlines, ils etaient recrees a chaque rendu : la FlatList voyait des
  // cellules « neuves » et remontait la derniere en boucle
  // (mount → 65 ms de rendu → unmount → mount …), avec ~70 ms de blocage JS a
  // chaque tour, EN CONTINU, meme sans scroller. C'est la micro-saccade
  // ressentie au retour en haut de liste. Ne pas les reinliner.
  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      if (isBannerItem(item)) {
        return (
          <HeroBanner
            banners={banners}
            onBonusPress={onBannerPress}
            loading={loading}
          />
        );
      }
      // ⚠️ `index - 1` : la banniere occupe la position 0, `designIndex` et la
      // regle « pas de provider pour la premiere boutique » (DesignRouter)
      // raisonnent en rang de BOUTIQUE, pas en rang de ligne.
      return (
        <DesignRouter
          fastFood={item}
          onMenuClick={onMenuClick}
          index={index - 1}
        />
      );
    },
    [onMenuClick, banners, onBannerPress, loading],
  );

  // ⚠️ `index` en secours produisait une cle DEPENDANTE DE LA POSITION : a
  // l'insertion d'une boutique en tete (socket), toutes les cles se decalaient
  // et React remontait toute la liste. Prefixe explicite, jamais l'index nu.
  const keyExtractor = useCallback(
    // `listKey` : cle du fantome remplace, reprise par la boutique qui le
    // remplit (`utils/pagePlaceholders`). Sinon l'`id` backend.
    (item: any, index: number) => item.listKey ?? item.id ?? `idx-${index}`,
    [],
  );

  /**
   * Type de cellule, pour le RECYCLAGE (FlashList).
   *
   * C'est la piece maitresse de la migration : FlashList ne detruit plus une
   * rangee qui sort de l'ecran, elle REUTILISE son instance native pour la
   * rangee qui entre. Le commit natif de 63-90 ms — la micro-pause ressentie au
   * doigt, mesuree par la sonde `[ROW]` — n'est alors paye qu'UNE fois par type,
   * quelle que soit la distance parcourue ou le nombre de boutiques.
   *
   * ⚠️ Une vue ne peut etre recyclee que vers une cellule de MEME structure. Les
   * 7 variantes de `DesignRouter` n'ont ni la meme hauteur (190 a 280 px) ni le
   * meme arbre de vues : les melanger ferait recycler une carte vers un gabarit
   * incompatible, ce qui annule le gain et provoque des sauts de layout. On rend
   * donc le type explicite — la banniere d'un cote, chaque variante de l'autre.
   *
   * ⚠️ On type par COMPOSANT, pas par `designIndex` : plusieurs index rendent
   * le meme design, typer sur l'index nu creerait des pools distincts pour des
   * vues identiques. La table vient de `designCycle.ts`, la MEME que celle de
   * `DesignRouter` — ne jamais la redupliquer ici (elles avaient diverge).
   */
  const getItemType = useCallback((item: any) => {
    if (isBannerItem(item)) return "banner";
    return `shop-d${designNumberFor(item?.designIndex)}`;
  }, []);

  return { listFooter, renderItem, keyExtractor, getItemType };
};

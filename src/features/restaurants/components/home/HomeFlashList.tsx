import { FlashList } from "@shopify/flash-list";
import React from "react";
import { RefreshControl } from "react-native";
import { Theme } from "@/src/theme";
import { homeStyles as styles } from "./homeScreenStyles";

/** Boutique « vue » : visible a 50 % au moins (meme seuil que la liste native). */
const SHOP_VIEWABILITY = { itemVisiblePercentThreshold: 50 };

interface Props {
  listRef: React.Ref<any>;
  data: any[];
  renderItem: any;
  keyExtractor: (item: any, index: number) => string;
  getItemType: (item: any, index: number) => string | number;
  onScroll: (e: any) => void;
  onMomentumScrollEnd: () => void;
  onViewableItemsChanged: (info: { viewableItems: { item: any; index: number | null }[] }) => void;
  bottomPadding: number;
  refreshing: boolean;
  onRefresh: () => void;
  onContentSizeChange: (w: number, h: number) => void;
  drawDistance: number;
  scrollEnabled: boolean;
  listFooter: React.ReactElement | null;
}

/**
 * Liste « Tout » du home en FlashList : REPLI quand la build n'embarque pas la
 * liste native (`isHomeListAvailable` faux : Expo Go, web). Extraite telle
 * quelle de `app/(tabs)/index.tsx` (R4), sans changement de comportement.
 *
 * ⚠️ FlashList, pas FlatList : elle RECYCLE les vues natives au lieu de les
 * detruire en sortie d'ecran et d'en recreer en entree. C'est ce qui supprime
 * definitivement la micro-pause au scroll (63-90 ms de commit natif repayes a
 * chaque remontage, cf. sonde `[ROW]` et `architecture/restaurants.md`). Le
 * recyclage est pilote par `getItemType` : sans lui, une rangee serait
 * reutilisee vers une variante de hauteur differente.
 */
export const HomeFlashList: React.FC<Props> = (p) => (
  <FlashList
    ref={p.listRef}
    data={p.data}
    renderItem={p.renderItem}
    keyExtractor={p.keyExtractor}
    getItemType={p.getItemType}
    onScroll={p.onScroll}
    scrollEventThrottle={64}
    onMomentumScrollEnd={p.onMomentumScrollEnd}
    viewabilityConfig={SHOP_VIEWABILITY}
    onViewableItemsChanged={p.onViewableItemsChanged}
    contentContainerStyle={[
      styles.listContent,
      {
        // Marge large : le loader independant flotte au-dessus de la
        // navbar, il ne doit coller ni la masquer la derniere rangee.
        paddingBottom: p.bottomPadding,
        paddingHorizontal: Theme.design.horizontalPadding,
      },
    ]}
    refreshControl={
      <RefreshControl
        refreshing={p.refreshing}
        onRefresh={p.onRefresh}
        tintColor={Theme.colors.primary}
        colors={[Theme.colors.primary]}
      />
    }
    // ⚠️ `initialNumToRender`, `maxToRenderPerBatch` et `windowSize` ont
    // ete RETIRES : ce sont des reglages propres a FlatList, ignores par
    // FlashList, qui dimensionne sa fenetre elle-meme a partir des tailles
    // reellement mesurees.
    //
    // Ils reglaient un probleme que le recyclage supprime a la racine :
    // a `windowSize={5}` les rangees sortant de l'ecran etaient detruites
    // puis recreees au retour (63-90 ms de commit natif repayes a chaque
    // passage, cf. sonde `[ROW]`). Elargir a 15 ne faisait que repousser
    // le seuil au prix de la memoire. FlashList, elle, REUTILISE la vue :
    // le cout n'est plus paye qu'une fois par type de cellule.
    //
    // ⚠️ Ne pas les reintroduire en pensant « regler » un souci de scroll :
    // sur FlashList ils n'ont aucun effet.
    // ⚠️ Pas de `onEndReached` : il partait en avance (seuil 0.1), fetch
    // termine avant l'arrivee, ni loader ni gel visibles. Le fetch est
    // declenche par la transition `atBottom` dans `handleScroll`.
    onEndReached={undefined}
    // Libere le verrou de page quand le contenu GRANDIT vraiment
    // (commit + layout), pas a l'insertion logique.
    onContentSizeChange={p.onContentSizeChange}
    // Pre-rendu modere : les rangees proches se montent en avance, mais
    // une page ajoutee pendant qu'on lit le haut ne se monte pas (pas
    // de pause d'insertion). 3200 montait tout, y compris hors regard.
    drawDistance={p.drawDistance}
    // ⚠️ SCROLL FIGE une fois le bas atteint, tant que la page suivante
    // charge. On ne bride pas le rebond (ni `bounces`, ni
    // `contentInset` negatif, ni reclampage depuis `onScroll`) : ces
    // trois pistes ont ete testees et laissaient toutes le defilement
    // continuer, le reclampage JS produisant en plus un saut visuel au
    // contact du bas (a `scrollEventThrottle={64}`, le doigt a deja
    // tire bien au-dela quand JS reagit).
    //
    // Ici la liste est simplement rendue non defilante le temps du
    // chargement : plus aucun mouvement possible vers le bas, le loader
    // reste ou il est. Le geste en cours s'arrete net, ce qui est
    // exactement l'effet voulu.
    //
    // La condition porte `atBottom` : figer des le depart de la requete
    // bloquerait aussi un chargement declenche AVANT le bas
    // (`onEndReachedThreshold`), alors que l'utilisateur defile encore
    // normalement au milieu de la liste.
    // Verrou d'insertion : scroll fige pendant le montage + layout des
    // nouvelles rangees, libere par `notifyPageLaidOut` (ou securite
    // 2 s). Jamais de scroll sur des cellules en cours de montage.
    scrollEnabled={p.scrollEnabled}
    ListFooterComponent={p.listFooter}
  />
);

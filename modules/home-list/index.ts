import { requireNativeView, requireOptionalNativeModule } from "expo";
import type { ComponentType, Ref } from "react";
import { Platform, type ViewProps } from "react-native";

/**
 * Liste native du home : UICollectionView (iOS), RecyclerView (Android).
 * Meme contrat JS des deux cotes.
 *
 * ⚠️ Le module n'existe que dans un build natif qui l'embarque. Sur une
 * build plus ancienne, `isHomeListAvailable` vaut `false` et le home garde sa
 * FlashList : aucune erreur, aucun ecran vide.
 */

export type HomeListMenu = {
  id: string;
  title: string;
  image: string | null;
  fallbackImage: string | null;
  price: string;
  stock: number;
  rating: string;
  votes: number;
  feeLabel: string;
  metaFeeLabel: string;
  /**
   * Design aere (`homeDesign = "aere"`), deja calcule par `aere/labels.ts` :
   * stock (« 12 » + « plats dispo », « Plus que 3 » + « plats »), urgence,
   * remplissage de jauge (0-1), frais (« gratuite ») et delai. Ignores par
   * une build native anterieure (champs inconnus du Record).
   */
  stockValue: string;
  stockUnit: string;
  stockLow: boolean;
  stockRatio: number;
  feeText: string;
  feeFree: boolean;
  eta: string;
};

export type HomeListRow = {
  id: string;
  design: number;
  name: string;
  avatar: string | null;
  avatarFallback: string | null;
  orders: number;
  votes: number;
  deliveryTime: string;
  /**
   * Distance formatee (« 1,2 km »), affichee apres « Ouvert » ; "" = rien.
   * Ignoree par une build native anterieure (champ inconnu du Record).
   */
  distance: string;
  /** Note de la boutique en design aere (« 4.5/5 »). */
  ratingText: string;
  /**
   * Sous la note (design aere) : « Livraison <valeur> », valeur « 13h »
   * (prochain creneau periodique) ou « express » ; "" = rien. Ignoree par une
   * build native anterieure.
   */
  deliveryLabel: string;
  menus: HomeListMenu[];
};

/** Design des cartes 4 / 5 / 7 et de la note boutique (`HOME_DESIGN`). */
export type HomeListDesign = "actuel" | "aere";

export type HomeListBanner = {
  id: string;
  imageUrl: string;
  title: string | null;
  tappable: boolean;
};

export type HomeListIcons = {
  fontFamily: string | null;
  glyphs: Record<string, string>;
};

/**
 * Polices du texte par graisse (nom PostScript d'une police deja chargee par
 * l'app, ex. via expo-font). `null` = police systeme. Changeable par OTA.
 */
export type HomeListFonts = {
  w600: string | null;
  w700: string | null;
  w800: string | null;
  w900: string | null;
};

type Event<T> = { nativeEvent: T };

/**
 * Mise a jour PARTIELLE de la liste (`updateRows`) : seules les rangees a partir
 * de `start` sont envoyees, la liste est ramenee a `total`. L'etat de fin de
 * liste voyage dans le meme appel que les rangees qu'il encadre.
 */
export type HomeListRowsUpdate = {
  start: number;
  rows: HomeListRow[];
  total: number;
  hasMore: boolean;
  ghostCount: number;
  footerText: string | null;
  footerIsEmpty: boolean;
  /** Chargement en cours : sans boutique, le natif affiche des squelettes. */
  loading: boolean;
};

/**
 * `live` : flou systeme recalcule a chaque image par iOS.
 * `baked` : photo de la carte floutee une fois, affichee comme une image.
 */
export type HomeListBlurMode = "live" | "baked";

export type HomeListViewProps = ViewProps & {
  banners: HomeListBanner[];
  bannerLoading: boolean;
  prefetchDistance: number;
  bottomInset: number;
  sidePadding: number;
  refreshing: boolean;
  icons: HomeListIcons;
  fonts: HomeListFonts;
  /** Barres floutees des cartes 4 et 5 : flou systeme ou photo floutee d'avance. */
  cardBlurMode: HomeListBlurMode;
  /** Defilement auto de la banniere (sinon seul le doigt la fait defiler). */
  bannerAutoplay: boolean;
  /**
   * Design des cartes et de la note boutique, recu au montage avant les
   * cellules (change par OTA au lancement suivant). Ignore par une build
   * anterieure, qui garde le design actuel.
   */
  homeDesign: HomeListDesign;
  /**
   * Rangees sous l'ecran creees au repos avant le premier scroll, en ecrans
   * de hauteur (0 = coupe). Ignore par une build qui ne l'embarque pas.
   */
  preheatScreens: number;
  onMenuPress: (e: Event<{ shopId: string; menuId: string }>) => void;
  onBannerPress: (e: Event<{ id: string }>) => void;
  onEndReached: (e: Event<Record<string, never>>) => void;
  onRefresh: (e: Event<Record<string, never>>) => void;
  onEdgeChange: (e: Event<{ atTop: boolean; nearBottom: boolean }>) => void;
  /** Sonde de fluidite (TestFlight seulement) : `kind: "scroll"` (par geste), `"apply"` (par page) ou `"preheat"`. */
  onDiagnostics: (e: Event<Record<string, any>>) => void;
  /**
   * Statistiques : boutiques visibles a 50 % au moins (rang dans la liste),
   * envoye quand l'ensemble change. Absent d'une build anterieure.
   */
  onVisibleShops?: (e: Event<{ ids: string[]; positions: number[] }>) => void;
};

export type HomeListHandle = {
  scrollToTop: () => Promise<void>;
};

/**
 * Methodes de la vue native. ⚠️ Les boutiques passent par `updateRows`, jamais
 * par une prop : une prop renvoie toute la liste a chaque page et le natif la
 * decode sur le fil de l'ecran (accrocs croissants avec la longueur de liste).
 */
export type HomeListNativeHandle = HomeListHandle & {
  updateRows: (update: HomeListRowsUpdate) => Promise<void>;
};

export const isHomeListAvailable =
  (Platform.OS === "ios" || Platform.OS === "android") &&
  requireOptionalNativeModule("HomeList") != null;

export const HomeListView: ComponentType<
  HomeListViewProps & { ref?: Ref<HomeListNativeHandle> }
> | null = isHomeListAvailable ? requireNativeView("HomeList") : null;

import { ActivityIndicator } from "@/src/components/CustomActivityIndicator";
import { Toast } from "@/src/components/Toast";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import { RestaurantHeader } from "@/src/features/restaurants/components/RestaurantHeader";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { Theme } from "@/src/theme";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CheckoutSheet } from "@/src/features/checkout/components/CheckoutSheet";
import { DesignRouter } from "@/src/features/restaurants/components/DesignRouter";
import { HeroBanner } from "@/src/features/restaurants/components/HeroBanner";
import { ShopRevealProvider } from "@/src/features/restaurants/context/ShopRevealContext";
import {
  PageRevealGateProvider,
  usePageRevealGate,
} from "@/src/features/restaurants/context/PageRevealGate";
import { designNumberFor } from "@/src/features/restaurants/utils/designCycle";
import { AppBanner, Menu } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useAuthGate } from "@/src/features/auth/context/AuthGateContext";
import { useRequireName } from "@/src/features/profile/hooks/useProfileNameSheet";
import { useNotifications } from "@/src/features/notifications/hooks/useNotifications";
import { useHideSplash } from "@/src/hooks/useHideSplash";
import { useNavigation, useRouter } from "expo-router";

/**
 * Item 0 de la liste : la banniere. Objet constant (jamais recree) pour que la
 * memoisation de `listData` et les cles de la FlatList restent stables.
 */
const BANNER_ITEM = { __banner: true as const, id: "__banner__" };

/**
 * Menus affiches du premier ecran : aligne sur `LIMIT_MENUS_ENABLED` /
 * `MAX_VISIBLE_MENUS` des designs. Le groupe du premier ecran n'attend que
 * des images montees : les menus caches ne se resolvant jamais, les attendre
 * bloquerait la revelation (puis le voile anti-scroll) jusqu'au garde-fou.
 */
const FIRST_SCREEN_MENUS = 5;

/**
 * Hauteur du loader de pagination (`styles.footerLoader`). Volontairement
 * genereuse : le loader doit se remarquer meme en scroll rapide.
 */
const FOOTER_LOADER_HEIGHT = 48;

/** Distance d'apparition du loader : visible AVANT le bas strict, donc
 *  toujours en premier par rapport aux elements nouvellement charges. */
const LOADER_VISIBLE_DISTANCE = 120;

/**
 * Calme exige avant de liberer le scroll (doigt leve depuis au moins ce
 * delai). Plus court qu'un intervalle entre deux glissements d'une rafale.
 */
const UNLOCK_QUIET_MS = 350;

/** Vrai pour l'item banniere, faux pour une boutique. */
const isBannerItem = (item: any) => item?.__banner === true;

const CATEGORIES = [
  { name: "All", icon: "grid-outline" },
  { name: "Fast Food", icon: "fast-food-outline" },
  { name: "Pizza", icon: "pizza-outline" },
  { name: "Burger", icon: "nutrition-outline" },
  { name: "Drinks", icon: "beer-outline" },
  { name: "Rice", icon: "restaurant-outline" },
];

export default function HomeScreen() {
  const onLayoutRootView = useHideSplash();
  const { user, userData, ensureProfileRefreshed } = useAuth();
  const { requireAuth } = useAuthGate();
  const requireName = useRequireName();
  const { unreadCount, ensureLoaded: ensureNotificationsLoaded } =
    useNotifications();
  const { addOrder, ensureLoaded: ensureOrdersLoaded } = useOrders();

  // Tout ce qui n'est pas indispensable a l'affichage part d'ICI, une fois
  // l'app a l'ecran : sous le splash, seules `/fastFood/all` et
  // `/settings/app-version` ont le droit de partir. Les badges panier et
  // notifications tiennent sur leur cache en attendant ces reponses.
  useEffect(() => {
    void ensureProfileRefreshed();
    ensureNotificationsLoaded();
    ensureOrdersLoaded();
  }, [ensureProfileRefreshed, ensureNotificationsLoaded, ensureOrdersLoaded]);
  const router = useRouter();
  const {
    fastFoods,
    loading,
    error,
    loadingMore,
    hasMore,
    loadMore,
    refresh,
    resetToFirstPage,
    notifyUserScroll,
    cancelPendingLoadMore,
    setListAtBottom,
    notifyPageLaidOut,
    insertLock,
    banners,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
  } = useFastFoods();
  const tabBarHeight = useTabBarHeight();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 100 + insets.top;

  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [checkoutVisible, setCheckoutVisible] = useState(false);

  // For testing: force loader to persist
  const [forceLoading, setForceLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // Loader bas INDEPENDANT : monte une seule fois, apparait/disparait en
  // fade sans jamais toucher au contenu de la liste (ni `ListFooterComponent`
  // qui re-layoute, ni `scrollEnabled` qui reconstruit). `pointerEvents none` :
  // il ne bloque ni scroll ni taps. Visible seulement pendant un fetch avec
  // une suite (`hasMore`) ET dans la zone basse (`loaderVisible`, marge
  // `LOADER_VISIBLE_DISTANCE`) : en remontant, il se cache ; en approchant du
  // bas, il apparait toujours en premier devant les elements charges.
  // Pilote sans rendu React par `syncLoader`, plus bas.
  const loaderOpacity = useRef(new Animated.Value(0)).current;

  const onManualRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // TEST: mettre `false` pour desactiver le reset au tap onglet Home
  // (mesure scroll sans troncature). Remettre `true` avant merge : UX voulue.
  const TAP_HOME_RESET_ENABLED = true;

  // Retour en haut quand on retape l'onglet Home alors qu'on y est deja.
  //
  // ⚠️ Gere ICI et pas dans `(tabs)/_layout.tsx` : ce layout est partage par
  // tous les onglets, et il n'a pas acces a la liste de cet ecran. L'evenement
  // `tabPress` remonte au screen, qui est le seul a tenir la ref.
  const listRef = useRef<FlashListRef<any>>(null);
  // Ref stable vers `loadMore` pour le declenchement depuis `handleScroll`
  // sans recreer le handler (et sans reconstruire la liste).
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;
  // Ref stable vers `setListAtBottom`, meme raison que `loadMoreRef`.
  const setListAtBottomRef = useRef(setListAtBottom);
  setListAtBottomRef.current = setListAtBottom;
  // Hauteur max deja vue : une croissance prouve que la page inseree est
  // commitee et mesuree, ce qui libere le verrou de page en attente.
  const contentHeightRef = useRef(0);
  const notifyPageLaidOutRef = useRef(notifyPageLaidOut);
  notifyPageLaidOutRef.current = notifyPageLaidOut;
  // Le verrou de page ne tombe plus aux squelettes mais a la REVELATION des
  // boutiques inserees (voir `PageRevealGate`).
  // --- Deblocage au CALME seulement ---
  // Page revelee : le verrou ne tombe que si le doigt est leve ET qu'aucun
  // geste n'a eu lieu depuis `UNLOCK_QUIET_MS`. Des glissements rapproches
  // pendant le blocage sont donc ignores jusqu'au bout : liberer au milieu
  // d'une rafale faisait partir un geste a moitie pris, a moitie bloque
  // (sensation « il ne sait pas s'il doit scroller ou s'arreter »).
  // Suivi par `onTouchStart/End` d'une View englobante : ils partent meme
  // quand le scroll est desactive, sans capter le geste.
  const touchingRef = useRef(false);
  const lastTouchEndRef = useRef(0);
  const quietTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const releaseWhenQuiet = useCallback(() => {
    if (quietTimerRef.current) clearTimeout(quietTimerRef.current);
    quietTimerRef.current = null;
    const quietFor = Date.now() - lastTouchEndRef.current;
    if (!touchingRef.current && quietFor >= UNLOCK_QUIET_MS) {
      notifyPageLaidOutRef.current();
      return;
    }
    console.log(
      `[GATE] UNLOCK differe (${touchingRef.current ? "doigt pose" : `geste il y a ${quietFor} ms`})`,
    );
    quietTimerRef.current = setTimeout(
      releaseWhenQuiet,
      touchingRef.current ? 80 : UNLOCK_QUIET_MS - quietFor,
    );
  }, []);
  useEffect(
    () => () => {
      if (quietTimerRef.current) clearTimeout(quietTimerRef.current);
    },
    [],
  );
  const onListTouchStart = useCallback(() => {
    touchingRef.current = true;
  }, []);
  const onListTouchEnd = useCallback(() => {
    touchingRef.current = false;
    lastTouchEndRef.current = Date.now();
  }, []);
  const revealGate = usePageRevealGate(releaseWhenQuiet);
  const prevLenRef = useRef(fastFoods.length);
  // Layout effect : la page est declaree avant le layout natif (donc avant
  // `onContentSizeChange`).
  useLayoutEffect(() => {
    const prev = prevLenRef.current;
    prevLenRef.current = fastFoods.length;
    if (insertLock && fastFoods.length > prev && prev > 0) {
      revealGate.startPage(
        fastFoods.slice(prev).map((ff: any) => ff.id).filter(Boolean),
      );
    }
  }, [fastFoods, insertLock, revealGate]);
  // Verrou libere ailleurs (securite 8 s, reset) : la page est oubliee.
  useEffect(() => {
    if (!insertLock) revealGate.reset();
  }, [insertLock, revealGate]);
  const handleContentSizeChange = useCallback((_w: number, h: number) => {
    // ⚠️ Suivi dans LES DEUX SENS : apres un pull-to-refresh la liste repart
    // de zero, donc elle ne redepassera JAMAIS l'ancien max — sans le suivi
    // vers le bas, aucune croissance ne serait detectee et le verrou de page
    // resterait bloque (plus de loader ni de fetch sur la page 2).
    if (h === contentHeightRef.current) return;
    const grew = h > contentHeightRef.current;
    contentHeightRef.current = h;
    if (!grew) return;
    if (revealGate.isActive()) revealGate.laidOut();
    else notifyPageLaidOutRef.current();
  }, [revealGate]);
  const navigation = useNavigation();

  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Position courante : garde-fou contre une troncature hors du haut de liste. */
  const atTopRef = useRef(true);

  // Retour en haut AU SCROLL MANUEL : meme troncature que par le bouton.
  //
  // ⚠️ Declenchee a l'arret du scroll (`onMomentumScrollEnd`), jamais pendant
  // (`onScroll`) : retirer des cellules sous un doigt qui defile ferait sauter
  // la liste. Et toujours derriere la garde « on est bien en haut ».
  /**
   * Bas de liste atteint : declenche le fetch de la page suivante (transition
   * dans `handleScroll`).
   *
   * ⚠️ REF SEULE, jamais d'etat. C'etait un `useState` que plus rien ne lisait
   * au rendu : chaque arrivee en bas et chaque deblocage re-rendait le home
   * pour rien. Mesure (sonde `[GATE] FRAMES`) : au deblocage du scroll, DEUX
   * rendus consecutifs de 40-75 ms chacun, au moment exact ou le doigt
   * reprend — la saccade ressentie.
   */
  const atBottomRef = useRef(false);
  // Visibilite du loader : meme mecanisme de transition que `atBottom`, mais
  // avec une marge (`LOADER_VISIBLE_DISTANCE`). Le loader apparait donc avant
  // le bas strict, toujours en premier devant les elements charges.
  // ⚠️ Ref aussi : le loader est une `Animated.Value` pilotee directement
  // (`syncLoader`), sans passer par un rendu React.
  const loaderVisibleRef = useRef(false);
  const loadingMoreRef = useRef(loadingMore);
  loadingMoreRef.current = loadingMore;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;
  const loaderShownRef = useRef(false);
  const syncLoader = useCallback(() => {
    const show =
      loadingMoreRef.current && hasMoreRef.current && loaderVisibleRef.current;
    if (show === loaderShownRef.current) return;
    loaderShownRef.current = show;
    if (show) {
      Animated.timing(loaderOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    } else {
      // Disparition directe, sans fondu de sortie.
      loaderOpacity.stopAnimation();
      loaderOpacity.setValue(0);
    }
  }, [loaderOpacity]);
  // Re-armement : apres un fetch, le rebond au bas redeclenche la transition
  // sans geste (double fetch, double loader). On n'autorise le fetch suivant
  // qu'apres etre remonte de 200 px : le rebond (±40 px) ne re-arme jamais.
  const fetchArmedRef = useRef(true);
  const handleScroll = useCallback(
    (e: any) => {
      const y = e.nativeEvent.contentOffset.y;
      atTopRef.current = y <= 4;

      // Bas de liste reellement atteint : c'est la condition qui autorise le
      // gel du scroll pendant le chargement (voir `scrollEnabled`). On la
      // calcule ici plutot que dans `onEndReached`, qui se declenche AVANT le
      // bas (`onEndReachedThreshold`) et figerait la liste en plein defilement.
      //
      // ⚠️ `setState` UNIQUEMENT au changement de valeur. Le home se re-rend a
      // chaque agitation de contexte et ses cellules sont lourdes (voir
      // « references stables » dans architecture/restaurants.md) : appeler le
      // setter a chaque frame de scroll reconstruirait les cellules visibles en
      // plein geste. Le ref porte la valeur courante, l'etat ne bouge qu'aux
      // deux transitions qui interessent le rendu.
      const { contentSize, layoutMeasurement } = e.nativeEvent;
      const distanceToEnd = contentSize.height - layoutMeasurement.height - y;
      const nextAtBottom = distanceToEnd <= 0;
      const nextLoaderVisible = distanceToEnd <= LOADER_VISIBLE_DISTANCE;
      if (nextLoaderVisible !== loaderVisibleRef.current) {
        loaderVisibleRef.current = nextLoaderVisible;
        syncLoader();
      }
      // Bas STRICT (10 px) pour l'INSERTION : une page arrivee pendant que
      // l'utilisateur est remonte attend son retour, elle ne s'insere jamais
      // sous ses yeux. Ecriture ref uniquement, aucun rendu.
      setListAtBottomRef.current(distanceToEnd <= 10);
      if (distanceToEnd > 200) fetchArmedRef.current = true;
      if (nextAtBottom !== atBottomRef.current) {
        atBottomRef.current = nextAtBottom;
        // ⚠️ Le fetch ne part QU'ICI, au bas reel, jamais en avance, et une
        // seule fois par arrivee (re-arme apres 200 px) : le loader est
        // visible. `loadMore` garde le reste (fini, deja en vol = ignore).
        if (nextAtBottom && fetchArmedRef.current) {
          fetchArmedRef.current = false;
          console.log(
            `[ROW] AT-BOTTOM fetch distance=${distanceToEnd.toFixed(1)}`,
          );
          loadMoreRef.current();
        }
      }

      // Un scroll reel leve le verrou pose par la troncature : sans ce signal,
      // le contexte ne peut pas distinguer le rebond automatique de
      // `onEndReached` (la liste raccourcit, sa fin remonte sous le viewport)
      // d'une descente voulue par l'utilisateur.
      notifyUserScroll();
    },
    [notifyUserScroll, syncLoader],
  );

  const handleMomentumEnd = useCallback(() => {
    // Ne RIEN faire : le reset au momentum detruit les cellules et cause la
    // pause au scroll suivant. Le reset ne se fait plus QUE sur tap explicite
    // sur l'onglet Home (voir listener `tabPress` ligne ~225).
  }, []);

  // ⚠️ Liberation du gel des l'arrivee de la page. Sans cet effet, `atBottom`
  // resterait a `true` : la liste vient de s'allonger, on n'est donc plus en
  // bas, mais AUCUN `onScroll` ne repart pour le signaler — le scroll etait
  // desactive, donc immobile. La liste resterait figee definitivement.
  // Aucun `setState` ici : refs + loader pilote directement (voir plus haut).
  useEffect(() => {
    if (!loadingMore) {
      atBottomRef.current = false;
      loaderVisibleRef.current = false;
    }
    syncLoader();
  }, [loadingMore, hasMore, syncLoader]);
  useEffect(() => {
    // `tabPress` part a CHAQUE appui sur l'onglet, y compris depuis un autre
    // ecran. `isFocused()` limite donc l'action au cas « on est deja sur le
    // home » ; sinon on remonterait la liste pendant la navigation entrante,
    // ce qui annulerait la position d'un retour arriere.
    const unsubscribe = (navigation as any).addListener("tabPress", () => {
      if (!(navigation as any).isFocused()) return;
      // ⚠️ AVANT l'animation : une page suivante encore en vol arriverait
      // pendant la remontee et ferait monter ses cellules (~100 ms de commit
      // natif chacune), bloquant le thread JS au moment ou l'animation doit
      // tourner. La troncature seule est trop tardive : elle n'intervient
      // qu'apres les 450 ms ci-dessous, quand le mal est fait.
      cancelPendingLoadMore();
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      // Troncature une fois la remontee terminee : moins de cellules en
      // memoire, la liste retrouve l'etat qu'elle avait apres le premier GET.
      //
      // ⚠️ `atTopRef` est la garde INDISPENSABLE. Tronquer sans savoir ou on se
      // trouve fait remonter le bas de liste sous le viewport, ce qui declenche
      // `onEndReached` → `loadMore` recharge → on retronque… boucle de
      // pagination infinie a ~120 ms le tour. On ne tronque donc QUE si on est
      // reellement revenu en haut.
      if (TAP_HOME_RESET_ENABLED) {
        resetTimerRef.current = setTimeout(() => {
          if (atTopRef.current) resetToFirstPage();
        }, 450);
      }
    });
    return () => {
      unsubscribe();
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    };
  }, [navigation, resetToFirstPage, cancelPendingLoadMore]);

  const handleBannerPress = useCallback(
    (banner: AppBanner) => {
      // Une bannière `bonus` ouvre la sheet Bonus (Settings → Bonus et parrainage).
      if (banner.type === "bonus") {
        router.push("/(tabs)/settings?section=bonus");
      }
    },
    [router],
  );

  // Images que la banniere et la PREMIERE boutique vont charger. Elles sont
  // declarees au groupe AVANT que la FlatList ne monte quoi que ce soit : sans
  // ca, le groupe se scelle en ne connaissant que la banniere (le header monte
  // avant les cellules) et la laisse partir seule.
  const firstScreenUris = useMemo(() => {
    const first: any = fastFoods[0];
    return [
      banners?.[0]?.imageUrl,
      first?.image,
      ...((first?.menu ?? [])
        .slice(0, FIRST_SCREEN_MENUS)
        .map((m: any) => m?.image) as string[]),
    ].filter(Boolean) as string[];
  }, [banners, fastFoods]);

  // ⚠️ La banniere est un ITEM de la liste, plus un `ListHeaderComponent`.
  //
  // En header, elle vivait HORS de la virtualisation : toujours montee, et
  // ignoree de la fenetre de rendu. Deux regimes qui ne se coordonnaient pas —
  // `initialNumToRender` comptait des boutiques sans jamais compter les ~235 px
  // qu'elle occupe, si bien que la fenetre initiale s'arretait toujours trop
  // haut et qu'il restait une cellule a monter au premier geste.
  //
  // En item 0, la banniere entre dans la meme fenetre que les boutiques : la
  // liste connait enfin la hauteur reelle de son contenu et dimensionne son
  // rendu initial en consequence.
  const listData = useMemo(() => {
    const data = [BANNER_ITEM, ...fastFoods];
    // SONDE : chaque recompute = les donnees ont change de reference. Si les
    // vagues REBIND/DEMONTAGE coincident avec ces lignes SANS scroll, le
    // coupable est le churn de donnees (socket/pagination), pas la liste.
    console.log(
      `[ROW] DATACHG n=${data.length} head=${data
        .slice(0, 4)
        .map((d: any) => String(d?.id ?? "?").slice(0, 4))
        .join(",")}`,
    );
    // SONDE : cles dupliquees = React ne distingue plus les cellules et
    // demonte/remonte au hasard a chaque mise a jour (pagination qui chevauche,
    // troncature + re-append). A retirer avec la sonde [ROW].
    const ids = data.map((d: any) => d?.id);
    if (new Set(ids).size !== ids.length) {
      console.log(
        `[ROW] DOUBLONS listData: ${data.length} items, ${new Set(ids).size} uniques`,
      );
    }
    return data;
  }, [fastFoods]);

  // Pied de liste : le loader de pagination vit HORS de la liste (overlay
  // fixe au-dessus de la navbar, en fade) pour ne jamais toucher au contenu :
  // ici seulement les etats stables (vide, fin de catalogue).
  const listFooter = useMemo(() => {
    if (fastFoods.length === 0 && !loading) {
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
    if (!hasMore && !loading && fastFoods.length > 0) {
      return (
        <View style={styles.footerEnd}>
          <Text style={styles.footerEndText}>
            Vous avez vu toutes les boutiques
          </Text>
        </View>
      );
    }
    return null;
  }, [hasMore, loading, fastFoods.length, searchQuery]);

  const handleMenuClick = (menu: Menu) => {
    // Ouvrir le menu mène à la commande (CheckoutSheet = action liée au compte).
    // Pour un invité, on ouvre la sheet d'auth au lieu du checkout.
    // Nom / prenom manquant : la sheet dediee passe AVANT le checkout.
    requireAuth(() =>
      requireName(() => {
        setSelectedMenu(menu);
        setCheckoutVisible(true);
      }),
    );
  };

  // Le handler change a chaque rendu (il capture `requireAuth` et les setters),
  // mais `renderItem` doit rester stable. La ref donne le meilleur des deux :
  // une identite figee cote FlatList, toujours la derniere version a l'appel.
  const handleMenuClickRef = useRef(handleMenuClick);
  handleMenuClickRef.current = handleMenuClick;

  // ⚠️ `renderItem` et `keyExtractor` DOIVENT rester stables.
  //
  // Inlines, ils etaient recrees a chaque rendu : la FlatList voyait des
  // cellules « neuves » et remontait la derniere en boucle
  // (mount → 65 ms de rendu → unmount → mount …), avec ~70 ms de blocage JS a
  // chaque tour, EN CONTINU, meme sans scroller. C'est la micro-saccade
  // ressentie au retour en haut de liste. Ne pas les reinliner.
  // ⚠️ Identite figee : passer `(menu) => ref.current(menu)` recreait une
  // lambda par cellule et par rendu, ce qui aurait annule le `memo` de
  // `DesignRouter`.
  const onMenuClickStable = useCallback(
    (menu: Menu) => handleMenuClickRef.current(menu),
    [],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      if (isBannerItem(item)) {
        return (
          <HeroBanner
            banners={banners}
            onBonusPress={handleBannerPress}
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
          onMenuClick={onMenuClickStable}
          index={index - 1}
        />
      );
    },
    [onMenuClickStable, banners, handleBannerPress, loading],
  );

  // ⚠️ `index` en secours produisait une cle DEPENDANTE DE LA POSITION : a
  // l'insertion d'une boutique en tete (socket), toutes les cles se decalaient
  // et React remontait toute la liste. Prefixe explicite, jamais l'index nu.
  const keyExtractor = useCallback(
    (item: any, index: number) => item.id ?? `idx-${index}`,
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

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
  };

  const handleConfirmOrder = async (order: any) => {
    try {
      const result = await addOrder(order);
      if (result.success) {
        showToast(
          order.status === "pending"
            ? "Commande envoyée au marchand ! 🚀"
            : "Article ajouté au panier ! ✨",
          "success",
        );
        return true;
      } else {
        showToast(result.message || "Une erreur est survenue.", "error");
        return false;
      }
    } catch (error) {
      showToast("Une erreur est survenue.", "error");
      return false;
    }
  };

  // Écran de chargement plein — RÉSERVÉ au tout premier affichage.
  // ⚠️ `!searchQuery` est indispensable : une recherche vide la liste et
  // repasse `loading` à true. Sans cette garde, l'écran plein remplacerait la
  // home et ferait disparaître la barre de recherche, empêchant l'utilisateur
  // de corriger sa saisie.
  if ((loading && fastFoods.length === 0 && !searchQuery) || forceLoading) {
    return (
      <SafeAreaView style={styles.container} onLayout={onLayoutRootView}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Theme.colors.primary} />
          <Text style={styles.loadingText}>
            Recherche des meilleurs plats...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Échec du chargement initial : la page entière est remplacée par un message
  // centré et un bouton de relance. Rien d'autre n'est affiché — ni header, ni
  // liste : il n'y a aucune donnée à montrer, et un contenu partiel donnerait
  // l'impression d'une page cassée plutôt que d'un réseau indisponible.
  if (error && fastFoods.length === 0 && !loading) {
    return (
      <SafeAreaView style={styles.container} onLayout={onLayoutRootView}>
        <View style={styles.centered}>
          <Ionicons
            name="cloud-offline-outline"
            size={54}
            color={Theme.colors.gray[300]}
          />
          <Text style={styles.errorTitle}>Connexion indisponible</Text>
          <Text style={styles.errorText}>
            Impossible de charger le contenu. Vérifiez votre connexion.
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            activeOpacity={0.8}
            onPress={refresh}
          >
            <Ionicons name="refresh" size={17} color={Theme.colors.white} />
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container} onLayout={onLayoutRootView}>
      <RestaurantHeader
        userName={
          [userData?.infos?.prenom, userData?.infos?.nom]
            .filter(Boolean)
            .join(" ") ||
          user?.displayName ||
          "Utilisateur"
        }
        userPhoto={
          (userData as any)?.photoUrl || (userData as any)?.photo || ""
        }
        location="Banganté, Cameroun"
        unreadCount={unreadCount}
        onNotifPress={() => router.push("/(tabs)/notifications")}
        onProfilePress={() => router.push("/(tabs)/settings")}
        onCartPress={() => router.push("/(tabs)/cart")}
        onOrdersPress={() => router.push("/(tabs)/settings?section=pending")}
        searchVisible={searchOpen}
        onSearchToggle={() => setSearchOpen(!searchOpen)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        categories={CATEGORIES}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />
      {/* ⚠️ Groupe de revelation partage par la BANNIERE et la PREMIERE
          boutique uniquement (cf. DesignRouter) : les deux sortent a la meme
          frame. La boutique 0 n'attend rien de plus qu'avant — seule la
          banniere patiente le temps de sortir avec elle. Les boutiques
          suivantes gardent leur propre groupe : les mettre ici ferait attendre
          la boutique 0 derriere elles, et c'est ce qui avait rajoute de la
          latence a l'arrivee sur le home. */}
      <ShopRevealProvider expect={firstScreenUris}>
       <PageRevealGateProvider value={revealGate.gate}>
        <View
          style={{ flex: 1, paddingTop: HEADER_HEIGHT }}
          onTouchStart={onListTouchStart}
          onTouchEnd={onListTouchEnd}
          onTouchCancel={onListTouchEnd}
        >
          {/* ⚠️ FlashList, pas FlatList : elle RECYCLE les vues natives au lieu
              de les detruire en sortie d'ecran et d'en recreer en entree. C'est
              ce qui supprime definitivement la micro-pause au scroll (63-90 ms
              de commit natif repayes a chaque remontage, cf. sonde `[ROW]` et
              `architecture/restaurants.md`). Le recyclage est pilote par
              `getItemType` : sans lui, une rangee serait reutilisee vers une
              variante de hauteur differente. */}
          <FlashList
            ref={listRef}
            data={listData}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            getItemType={getItemType}
            onScroll={handleScroll}
            scrollEventThrottle={64}
            onMomentumScrollEnd={handleMomentumEnd}
            contentContainerStyle={[
              styles.listContent,
              {
                // Marge large : le loader independant flotte au-dessus de la
                // navbar, il ne doit coller ni la masquer la derniere rangee.
                paddingBottom: tabBarHeight + 60,
                paddingHorizontal: Theme.design.horizontalPadding,
              },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onManualRefresh}
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
            onContentSizeChange={handleContentSizeChange}
            // Pre-rendu modere : les rangees proches se montent en avance, mais
            // une page ajoutee pendant qu'on lit le haut ne se monte pas (pas
            // de pause d'insertion). 3200 montait tout, y compris hors regard.
            drawDistance={800}
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
            scrollEnabled={!insertLock}
            ListFooterComponent={listFooter}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.bottomLoader,
              { bottom: tabBarHeight + 5, opacity: loaderOpacity },
            ]}
          >
            <ActivityIndicator size="large" color={Theme.colors.primary} />
          </Animated.View>
        </View>
       </PageRevealGateProvider>
      </ShopRevealProvider>
      <CheckoutSheet
        key={selectedMenu?.id || "checkout"}
        visible={checkoutVisible}
        onClose={() => setCheckoutVisible(false)}
        menu={selectedMenu}
        onConfirm={handleConfirmOrder}
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: Theme.colors.gray[500],
    fontSize: 14,
  },
  listContent: {
    // paddingBottom géré dynamiquement avec useTabBarHeight
  },
  // ⚠️ Hauteur FIXE et genereuse (et non un simple padding de 24) : le loader
  // doit se remarquer meme en scroll rapide. Trop court, il defilait sans
  // qu'on le voie — on avait l'impression que les boutiques apparaissaient
  // sans chargement.
  footerLoader: {
    // Meme valeur que le `contentInset` negatif qui coupe le rebond du bas.
    height: FOOTER_LOADER_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  // Loader bas INDEPENDANT : fixe au-dessus de la navbar, monte une fois,
  // visible seulement en fade pendant un fetch avec suite. Sans fond ni
  // bordure, juste l'indicateur en grand.
  bottomLoader: {
    position: "absolute",
    alignSelf: "center",
  },
  footerEnd: {
    paddingVertical: 24,
    alignItems: "center",
  },
  footerEndText: {
    fontSize: 13,
    color: Theme.colors.gray[400],
  },
  emptyText: {
    color: Theme.colors.gray[500],
    fontSize: 16,
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Theme.colors.dark,
  },
  errorText: {
    fontSize: 14,
    color: Theme.colors.gray[500],
    textAlign: "center",
    paddingHorizontal: 40,
    marginTop: -4,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 10,
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: Theme.borderRadius.pill,
    backgroundColor: Theme.colors.primary,
  },
  retryText: {
    color: Theme.colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
    gap: 12,
  },
  loadingOverlayText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

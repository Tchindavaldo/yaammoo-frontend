import { ActivityIndicator } from "@/src/components/CustomActivityIndicator";
import { Toast } from "@/src/components/Toast";
import { useOrders } from "@/src/features/orders/hooks/useOrders";
import { RestaurantHeader } from "@/src/features/restaurants/components/RestaurantHeader";
import { useFastFoods } from "@/src/features/restaurants/hooks/useFastFoods";
import { useTabBarHeight } from "@/src/hooks/useTabBarHeight";
import { Theme } from "@/src/theme";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
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
import { AppBanner, Menu } from "@/src/types";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/src/features/auth/context/AuthContext";
import { useAuthGate } from "@/src/features/auth/context/AuthGateContext";
import { useNotifications } from "@/src/features/notifications/hooks/useNotifications";
import { useHideSplash } from "@/src/hooks/useHideSplash";
import { useNavigation, useRouter } from "expo-router";

/**
 * Item 0 de la liste : la banniere. Objet constant (jamais recree) pour que la
 * memoisation de `listData` et les cles de la FlatList restent stables.
 */
const BANNER_ITEM = { __banner: true as const, id: "__banner__" };

/**
 * Hauteur du loader de pagination (`styles.footerLoader`). Volontairement
 * genereuse : le loader doit se remarquer meme en scroll rapide.
 */
const FOOTER_LOADER_HEIGHT = 48;

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
  const { user, userData } = useAuth();
  const { requireAuth } = useAuthGate();
  const { unreadCount } = useNotifications();
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
    banners,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
  } = useFastFoods();
  const { addOrder } = useOrders();
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

  const onManualRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Retour en haut quand on retape l'onglet Home alors qu'on y est deja.
  //
  // ⚠️ Gere ICI et pas dans `(tabs)/_layout.tsx` : ce layout est partage par
  // tous les onglets, et il n'a pas acces a la liste de cet ecran. L'evenement
  // `tabPress` remonte au screen, qui est le seul a tenir la ref.
  const listRef = useRef<FlatList>(null);
  const navigation = useNavigation();

  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Position courante : garde-fou contre une troncature hors du haut de liste. */
  const atTopRef = useRef(true);

  // Retour en haut AU SCROLL MANUEL : meme troncature que par le bouton.
  //
  // ⚠️ Declenchee a l'arret du scroll (`onMomentumScrollEnd`), jamais pendant
  // (`onScroll`) : retirer des cellules sous un doigt qui defile ferait sauter
  // la liste. Et toujours derriere la garde « on est bien en haut ».
  /** Derniere position connue, pour deduire le SENS du scroll. */
  const lastOffsetRef = useRef(0);
  /**
   * Bas de liste atteint. Combine a `loadingMore`, il fige le scroll le temps
   * du chargement de la page suivante (voir `scrollEnabled`).
   *
   * Le ref double l'etat pour ne declencher un rendu qu'aux TRANSITIONS : le
   * comparer dans `handleScroll` evite un `setState` a chaque frame de scroll.
   */
  const atBottomRef = useRef(false);
  const [atBottom, setAtBottom] = useState(false);
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
      const nextAtBottom = distanceToEnd <= 8;
      if (nextAtBottom !== atBottomRef.current) {
        atBottomRef.current = nextAtBottom;
        setAtBottom(nextAtBottom);
      }

      // Remontee franche : meme raison que sur le tap Home, une page suivante
      // encore en vol monterait ses cellules pendant que l'utilisateur defile
      // vers le haut, et bloquerait le thread JS en plein geste. Le seuil evite
      // de declencher sur le tremblement d'un doigt pose.
      if (lastOffsetRef.current - y > 24) cancelPendingLoadMore();
      lastOffsetRef.current = y;
      // Un scroll reel leve le verrou pose par la troncature : sans ce signal,
      // le contexte ne peut pas distinguer le rebond automatique de
      // `onEndReached` (la liste raccourcit, sa fin remonte sous le viewport)
      // d'une descente voulue par l'utilisateur.
      notifyUserScroll();
    },
    [notifyUserScroll, cancelPendingLoadMore],
  );

  const handleMomentumEnd = useCallback(() => {
    if (atTopRef.current) resetToFirstPage();
  }, [resetToFirstPage]);

  // ⚠️ Liberation du gel des l'arrivee de la page. Sans cet effet, `atBottom`
  // resterait a `true` : la liste vient de s'allonger, on n'est donc plus en
  // bas, mais AUCUN `onScroll` ne repart pour le signaler — le scroll etait
  // desactive, donc immobile. La liste resterait figee definitivement.
  useEffect(() => {
    if (!loadingMore) {
      atBottomRef.current = false;
      setAtBottom(false);
    }
  }, [loadingMore]);
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
      resetTimerRef.current = setTimeout(() => {
        if (atTopRef.current) resetToFirstPage();
      }, 450);
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
      ...((first?.menu ?? []).map((m: any) => m?.image) as string[]),
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
  const listData = useMemo(
    () => [BANNER_ITEM, ...fastFoods],
    [fastFoods],
  );

  // Pied de liste, quatre états :
  //  - chargement de la page suivante → indicateur ;
  //  - aucune boutique → message vide ;
  //  - catalogue épuisé → message de fin, pour que le bas de liste ne se
  //    termine pas sur un blanc qui laisse croire que ça charge encore ;
  //  - sinon rien (évite un espace vide pendant le défilement normal).
  //
  // ⚠️ Le message « aucune boutique » est ICI et non dans `ListEmptyComponent` :
  // la banniere occupe l'item 0, la liste n'est donc JAMAIS vide et React Native
  // ne rendrait plus jamais ce composant.
  const listFooter = useMemo(() => {
    if (loadingMore && hasMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={Theme.colors.primary} />
        </View>
      );
    }
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
  }, [loadingMore, hasMore, loading, fastFoods.length, searchQuery]);

  const handleMenuClick = (menu: Menu) => {
    // Ouvrir le menu mène à la commande (CheckoutSheet = action liée au compte).
    // Pour un invité, on ouvre la sheet d'auth au lieu du checkout.
    requireAuth(() => {
      setSelectedMenu(menu);
      setCheckoutVisible(true);
    });
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
        <View style={{ flex: 1, paddingTop: HEADER_HEIGHT }}>
          <FlatList
            ref={listRef}
            data={listData}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            onScroll={handleScroll}
            scrollEventThrottle={64}
            onMomentumScrollEnd={handleMomentumEnd}
            contentContainerStyle={[
              styles.listContent,
              {
                paddingBottom: tabBarHeight + 20,
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
            // Pagination : la page suivante part avant d'atteindre le bas, pour
            // que les boutiques soient là quand l'utilisateur y arrive.
            // ⚠️ Par défaut `initialNumToRender` vaut 10 : la première passe de
            // rendu montait la bannière ET dix boutiques (header + rangée de
            // menus chacune). Le squelette de la bannière n'était peint qu'à la
            // fin de cette passe — d'où son apparition en retard alors que les
            // cartes, elles, étaient déjà là.
            //
            // ⚠️ Ce compte inclut désormais la BANNIÈRE (item 0) : à 3, on rend
            // la bannière plus deux boutiques, soit exactement ce que couvrait
            // l'ancien `2` en header.
            initialNumToRender={3}
            maxToRenderPerBatch={3}
            // ⚠️ NE PAS elargir `windowSize` pour supprimer le cycle
            // UNMOUNT/MOUNT #3..#6 vu en bas de liste : teste a 11 (avec
            // `removeClippedSubviews` et `updateCellsBatchingPeriod`), aucun
            // effet — cycle identique, blocages JS toujours a 145-160 ms. Ce
            // cycle ne vient PAS de la virtualisation mais de
            // `resetToFirstPage()`, qui tronque volontairement la liste a la
            // premiere page au retour en haut ; les pages suivantes sont ensuite
            // rechargees au scroll. C'est le comportement voulu.
            windowSize={5}
            onEndReached={loadMore}
            // ⚠️ 0.5 declenchait la requete une demi-hauteur d'ecran AVANT le bas.
            // En scroll lent la reponse revenait avant qu'on y arrive : les
            // boutiques etaient deja la, le loader n'apparaissait jamais. En
            // scroll rapide on doublait la requete et on le voyait. Comportement
            // inverse de celui voulu — le loader doit se voir a TOUTE vitesse.
            // A 0.1, la page ne part qu'une fois le bas reellement atteint : on
            // voit l'espace vide, le loader, puis les nouvelles boutiques.
            onEndReachedThreshold={0.1}
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
            scrollEnabled={!(loadingMore && hasMore && atBottom)}
            ListFooterComponent={listFooter}
          />
        </View>
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
    ...StyleSheet.absoluteFillObject,
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

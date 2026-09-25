import ExpoModulesCore

/**
 Module Expo de la liste native du home. Cote JS :
 `modules/home-list/index.ts` → `NativeHomeList.tsx` (feature restaurants).
 */
public final class HomeListModule: Module {
  public func definition() -> ModuleDefinition {
    Name("HomeList")

    View(HomeListView.self) {
      Events("onMenuPress", "onBannerPress", "onEndReached", "onRefresh", "onEdgeChange")

      Prop("rows") { (view: HomeListView, rows: [HLShopRecord]) in
        view.shops = rows.map(HLShop.init)
      }

      Prop("banners") { (view: HomeListView, banners: [HLBannerRecord]) in
        view.banners = banners.map(HLBanner.init)
      }

      Prop("bannerLoading") { (view: HomeListView, loading: Bool) in
        view.bannerLoading = loading
      }

      Prop("hasMore") { (view: HomeListView, hasMore: Bool) in
        view.hasMore = hasMore
      }

      Prop("ghostCount") { (view: HomeListView, count: Int) in
        view.ghostCount = max(0, count)
      }

      Prop("footerText") { (view: HomeListView, text: String?) in
        view.footerText = text
      }

      Prop("footerIsEmpty") { (view: HomeListView, empty: Bool) in
        view.footerIsEmpty = empty
      }

      Prop("prefetchDistance") { (view: HomeListView, distance: Double) in
        view.prefetchDistance = CGFloat(distance)
      }

      Prop("bottomInset") { (view: HomeListView, inset: Double) in
        view.bottomInset = CGFloat(inset)
      }

      Prop("sidePadding") { (_: HomeListView, padding: Double) in
        HLLayout.sidePadding = CGFloat(padding)
      }

      Prop("refreshing") { (view: HomeListView, refreshing: Bool) in
        view.refreshing = refreshing
      }

      Prop("icons") { (_: HomeListView, icons: HLIconsRecord) in
        HLIcons.fontFamily = icons.fontFamily
        HLIcons.glyphs = icons.glyphs
      }

      OnViewDidUpdateProps { (view: HomeListView) in
        view.applyProps()
      }

      AsyncFunction("scrollToTop") { (view: HomeListView) in
        view.scrollToTop()
      }
    }
  }
}

import ExpoModulesCore

/**
 Module Expo de la liste native du home. Cote JS :
 `modules/home-list/index.ts` → `NativeHomeList.tsx` (feature restaurants).
 */
public final class HomeListModule: Module {
  public func definition() -> ModuleDefinition {
    Name("HomeList")

    View(HomeListView.self) {
      Events("onMenuPress", "onBannerPress", "onEndReached", "onRefresh", "onEdgeChange", "onDiagnostics")

      // ⚠️ Les boutiques ne sont PAS une prop. Une prop renvoie TOUTE la liste a
      // chaque page, et Expo la decode sur le fil de l'ecran : environ 1 ms par
      // boutique deja chargee, soit un accroc de 165 ms a 147 boutiques. La
      // fonction `updateRows` ne recoit que les rangees nouvelles ou modifiees,
      // et ses arguments sont decodes sur le fil JS.
      Prop("banners") { (view: HomeListView, banners: [HLBannerRecord]) in
        view.banners = banners.map(HLBanner.init)
      }

      Prop("bannerLoading") { (view: HomeListView, loading: Bool) in
        view.bannerLoading = loading
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

      // Polices venues du JS (changeables par OTA). Recues au montage, avant
      // la creation des cellules.
      Prop("fonts") { (_: HomeListView, fonts: HLFontsRecord) in
        HLFont.names = [.semibold: fonts.w600, .bold: fonts.w700,
                        .heavy: fonts.w800, .black: fonts.w900]
      }

      // Rendu des barres floutees des cartes 4 et 5 (`live` | `baked`, cf.
      // `HLBlurBar`). Recu au montage, avant la creation des cellules.
      Prop("cardBlurMode") { (_: HomeListView, mode: String) in
        HLBlurBar.mode = HLBlurBar.Mode(rawValue: mode) ?? .baked
      }

      OnViewDidUpdateProps { (view: HomeListView) in
        view.applyProps()
      }

      AsyncFunction("scrollToTop") { (view: HomeListView) in
        view.scrollToTop()
      }

      AsyncFunction("updateRows") { (view: HomeListView, update: HLRowsUpdateRecord) in
        view.updateRows(update)
      }
    }
  }
}

import ExpoModulesCore

/**
 Module Expo de la liste native des tabs categorie du home, SEPAREE de
 `HomeListModule` (liste « Tout »). Cote JS : `modules/home-list/category.ts`
 -> `NativeCategoryList.tsx` (feature restaurants, dossier `category/`).
 */
public final class CategoryListModule: Module {
  public func definition() -> ModuleDefinition {
    Name("CategoryList")

    View(HLCategoryListView.self) {
      Events("onMenuPress", "onBannerPress", "onEndReached", "onRefresh")

      // ⚠️ Les rangees ne sont PAS une prop (cf. `HomeListModule`) : la fonction
      // `updateRows` ne recoit que les rangees nouvelles ou modifiees.
      Prop("banners") { (view: HLCategoryListView, banners: [HLCBannerRecord]) in
        view.banners = banners.map(HLCBanner.init)
      }

      Prop("prefetchDistance") { (view: HLCategoryListView, distance: Double) in
        view.prefetchDistance = CGFloat(distance)
      }

      Prop("bottomInset") { (view: HLCategoryListView, inset: Double) in
        view.bottomInset = CGFloat(inset)
      }

      Prop("sidePadding") { (_: HLCategoryListView, padding: Double) in
        HLCLayout.sidePadding = CGFloat(padding)
      }

      Prop("refreshing") { (view: HLCategoryListView, refreshing: Bool) in
        view.refreshing = refreshing
      }

      // Icones et polices : memes valeurs que la liste « Tout » (utilitaires
      // partages), recues au montage avant la creation des cellules.
      Prop("icons") { (_: HLCategoryListView, icons: HLIconsRecord) in
        HLIcons.fontFamily = icons.fontFamily
        HLIcons.glyphs = icons.glyphs
      }

      Prop("fonts") { (_: HLCategoryListView, fonts: HLFontsRecord) in
        HLFont.names = [.semibold: fonts.w600, .bold: fonts.w700,
                        .heavy: fonts.w800, .black: fonts.w900]
      }

      OnViewDidUpdateProps { (view: HLCategoryListView) in
        view.apply()
      }

      AsyncFunction("scrollToTop") { (view: HLCategoryListView) in
        view.scrollToTop()
      }

      AsyncFunction("updateRows") { (view: HLCategoryListView, update: HLCUpdateRecord) in
        view.updateRows(update)
      }
    }
  }
}

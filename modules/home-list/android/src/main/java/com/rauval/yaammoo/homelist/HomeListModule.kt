package com.rauval.yaammoo.homelist

import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 Module Expo de la liste native du home (Android). Meme contrat que
 `HomeListModule.swift` : cote JS, `modules/home-list/index.ts` ->
 `NativeHomeList.tsx` (feature restaurants).
 */
class HomeListModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("HomeList")

    View(HomeListView::class) {
      Events("onMenuPress", "onBannerPress", "onEndReached", "onRefresh", "onEdgeChange", "onDiagnostics",
        "onVisibleShops")

      // ⚠️ Les boutiques ne sont PAS une prop : une prop renverrait TOUTE la
      // liste a chaque page. `updateRows` ne recoit que les rangees nouvelles
      // ou modifiees, decodees hors du fil de l'ecran.
      Prop("banners") { view: HomeListView, banners: List<HLBannerRecord> ->
        view.banners = banners.map { HLBanner(it) }
      }

      Prop("bannerLoading") { view: HomeListView, loading: Boolean ->
        view.bannerLoading = loading
      }

      Prop("prefetchDistance") { view: HomeListView, distance: Double ->
        view.prefetchDistance = distance.toFloat()
      }

      // Prechauffage des rangees sous l'ecran (`HLPreheater`), en ecrans. 0 = coupe.
      Prop("preheatScreens") { view: HomeListView, screens: Double ->
        view.preheater.screens = maxOf(0.0, screens).toFloat()
      }

      Prop("bottomInset") { view: HomeListView, inset: Double ->
        view.bottomInset = inset.toFloat()
      }

      Prop("sidePadding") { _: HomeListView, padding: Double ->
        HLLayout.sidePadding = padding.toFloat()
      }

      Prop("refreshing") { view: HomeListView, refreshing: Boolean ->
        view.refreshing = refreshing
      }

      Prop("icons") { _: HomeListView, icons: HLIconsRecord ->
        HLIcons.fontFamily = icons.fontFamily
        HLIcons.glyphs = icons.glyphs
      }

      // Polices venues du JS (OTA), recues au montage avant la creation des vues.
      Prop("fonts") { _: HomeListView, fonts: HLFontsRecord ->
        HLFont.names = mapOf(600 to fonts.w600, 700 to fonts.w700, 800 to fonts.w800, 900 to fonts.w900)
      }

      // Android : toujours la photo floutee d'avance (`baked`), voir `HLBlurBar`.
      Prop("cardBlurMode") { _: HomeListView, _: String -> }

      Prop("bannerAutoplay") { _: HomeListView, on: Boolean ->
        HLBannerView.autoplayEnabled = on
      }

      // Design des cartes 4 / 5 / 7 et de la note boutique (`actuel` | `aere`).
      // Recu au montage, avant la creation des cartes : une carte garde le
      // design sous lequel elle a ete construite.
      Prop("homeDesign") { _: HomeListView, design: String ->
        HLDesign.aere = design == "aere"
      }

      // Note de l'en-tete boutique (`actuel` | `aere`), independante des cartes.
      Prop("headerDesign") { _: HomeListView, design: String ->
        HLDesign.headerAere = design == "aere"
      }

      OnViewDidUpdateProps { view: HomeListView ->
        view.applyProps()
      }

      AsyncFunction("scrollToTop") { view: HomeListView ->
        view.scrollToTop()
      }.runOnQueue(Queues.MAIN)

      // Decodage (records -> modeles) ici, hors du fil de l'ecran ; seule la
      // pose des rangees passe sur le fil principal.
      AsyncFunction("updateRows") { view: HomeListView, update: HLRowsUpdateRecord ->
        val u = HLRowsUpdate(update)
        view.post { view.updateRows(u) }
      }
    }
  }
}

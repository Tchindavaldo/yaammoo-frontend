package com.rauval.yaammoo.homelist.category

import com.rauval.yaammoo.homelist.HLFont
import com.rauval.yaammoo.homelist.HLFontsRecord
import com.rauval.yaammoo.homelist.HLIcons
import com.rauval.yaammoo.homelist.HLIconsRecord
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 Module Expo de la liste native des tabs categorie du home (Android), SEPAREE
 de `HomeListModule` (liste « Tout »). Meme contrat que `CategoryListModule.swift` :
 cote JS, `modules/home-list/category.ts` -> `NativeCategoryList.tsx`.
 */
class CategoryListModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CategoryList")

    View(HLCategoryListView::class) {
      Events("onMenuPress", "onBannerPress", "onEndReached", "onRefresh")

      // ⚠️ Les rangees ne sont PAS une prop : `updateRows` ne recoit que les
      // rangees nouvelles ou modifiees, decodees hors du fil de l'ecran.
      Prop("banners") { view: HLCategoryListView, banners: List<HLCBannerRecord> ->
        view.banners = banners.map { HLCBanner(it) }
      }

      Prop("prefetchDistance") { view: HLCategoryListView, distance: Double ->
        view.prefetchDistance = distance.toFloat()
      }

      Prop("bottomInset") { view: HLCategoryListView, inset: Double ->
        view.bottomInset = inset.toFloat()
      }

      Prop("sidePadding") { _: HLCategoryListView, padding: Double ->
        HLCLayout.sidePadding = padding.toFloat()
      }

      Prop("refreshing") { view: HLCategoryListView, refreshing: Boolean ->
        view.refreshing = refreshing
      }

      // Icones et polices : memes valeurs que la liste « Tout » (utilitaires
      // partages), recues au montage avant la creation des vues.
      Prop("icons") { _: HLCategoryListView, icons: HLIconsRecord ->
        HLIcons.fontFamily = icons.fontFamily
        HLIcons.glyphs = icons.glyphs
      }

      Prop("fonts") { _: HLCategoryListView, fonts: HLFontsRecord ->
        HLFont.names = mapOf(600 to fonts.w600, 700 to fonts.w700, 800 to fonts.w800, 900 to fonts.w900)
      }

      OnViewDidUpdateProps { view: HLCategoryListView ->
        view.apply()
      }

      AsyncFunction("scrollToTop") { view: HLCategoryListView ->
        view.scrollToTop()
      }.runOnQueue(Queues.MAIN)

      // Decodage (records -> modeles) ici, hors du fil de l'ecran ; seule la
      // pose des rangees passe sur le fil principal.
      AsyncFunction("updateRows") { view: HLCategoryListView, update: HLCUpdateRecord ->
        val u = HLCUpdate(update)
        view.post { view.updateRows(u) }
      }
    }
  }
}

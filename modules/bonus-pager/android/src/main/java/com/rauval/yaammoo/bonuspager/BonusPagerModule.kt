package com.rauval.yaammoo.bonuspager

import android.graphics.Color
import android.view.View
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 Module Expo du carrousel natif de la sheet Bonus (Android). Meme contrat que
 `BonusPagerModule.swift` : cote JS, `modules/bonus-pager/index.ts` ->
 `NativeBonusPager.tsx` (feature bonus).
 */
class BonusPagerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("BonusPager")

    View(BonusPagerView::class) {
      Prop("items") { view: BonusPagerView, items: List<BPItemRecord> ->
        view.items = items.map { BPItem(it) }
      }

      Prop("footerHeight") { view: BonusPagerView, height: Double ->
        view.footerHeight = height.toFloat()
      }

      Prop("textColor") { view: BonusPagerView, color: String ->
        view.textColor = BPColor.parse(color) ?: Color.BLACK
      }

      Prop("iconFontFamily") { view: BonusPagerView, family: String? ->
        view.iconFontFamily = family
      }

      OnViewDidUpdateProps { view: BonusPagerView ->
        view.applyProps()
      }

      // Les cartes React (une page par bonus) sont montees dans la piste du
      // scroll natif, pas posees sur la vue elle-meme.
      GroupView<BonusPagerView> {
        AddChildView { parent, child: View, index -> parent.addPage(child, index) }
        GetChildCount { parent -> parent.pageCount }
        GetChildViewAt { parent, index -> parent.pageAt(index) }
        RemoveChildView { parent, child: View -> parent.removePage(child) }
        RemoveChildViewAt { parent, index -> parent.removePageAt(index) }
      }
    }
  }
}

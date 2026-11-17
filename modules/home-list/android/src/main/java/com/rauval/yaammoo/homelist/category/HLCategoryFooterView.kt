package com.rauval.yaammoo.homelist.category

import android.content.Context
import com.rauval.yaammoo.homelist.HLBox
import com.rauval.yaammoo.homelist.HLColor
import com.rauval.yaammoo.homelist.HLLabel
import com.rauval.yaammoo.homelist.frame

/**
 Pied de la liste categorie : fin de la categorie (13 px gris, padding 24) ou
 categorie vide (16 px gris, centre, marges 40). Copie de `HLFooterView`.
 */
class HLCategoryFooterView(context: Context) : HLBox(context) {
  private val label = HLLabel(context).apply {
    centered = true
    multiline = true
  }
  private var empty = false

  init {
    addView(label)
    onPlace = { w, h ->
      if (empty) label.frame(40f, 0f, w - 80f, h) else label.frame(16f, 24f, w - 32f, h - 48f)
    }
  }

  fun configure(text: String, empty: Boolean) {
    this.empty = empty
    label.setFont(400, if (empty) 16f else 13f, HLColor.hex(if (empty) "#AEAEB2" else "#C7C7CC"))
    label.text = text
    relayout()
  }

  companion object {
    fun height(empty: Boolean): Float = if (empty) 240f else 64f
  }
}

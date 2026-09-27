package com.rauval.yaammoo.homelist

import android.content.Context
import android.graphics.Color
import android.os.SystemClock
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView

/**
 Elements de la liste. Identite d'une rangee = POSITION + design : le fantome
 du rang N et la vraie boutique qui le remplit sont le meme element, simplement
 reconfigure (comme le `Item.row(position:design:)` iOS).
 */
sealed class HLItem {
  object Banner : HLItem()
  data class Row(val position: Int, val design: Int) : HLItem()
  object Footer : HLItem()
}

/**
 Pied de liste (`listFooter` du home) : fin de catalogue (13 px gris, padding
 24) ou liste vide (16 px gris, centre, marges 40).
 */
class HLFooterView(context: Context) : HLBox(context) {
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

/**
 Adaptateur de la liste : cree les vues (une rangee par design, jamais
 re-typee) et delegue la configuration a la vue hote (`HomeListView.bind`).
 */
class HLListAdapter(private val host: HomeListView) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {
  var items: List<HLItem> = emptyList()

  class BannerHolder(val banner: HLBannerView) : RecyclerView.ViewHolder(banner)
  class RowHolder(val row: HLShopRowView) : RecyclerView.ViewHolder(row)
  class FooterHolder(val footer: HLFooterView) : RecyclerView.ViewHolder(footer)

  override fun getItemCount(): Int = items.size

  override fun getItemViewType(position: Int): Int = when (val item = items[position]) {
    HLItem.Banner -> TYPE_BANNER
    HLItem.Footer -> TYPE_FOOTER
    is HLItem.Row -> rowType(item.design)
  }

  override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
    val ctx = parent.context
    val match = RecyclerView.LayoutParams.MATCH_PARENT
    return when (viewType) {
      TYPE_BANNER -> BannerHolder(HLBannerView(ctx).apply {
        layoutParams = RecyclerView.LayoutParams(match, HLLayout.bannerHeight.px())
        setBackgroundColor(Color.WHITE)
      })
      TYPE_FOOTER -> FooterHolder(HLFooterView(ctx).apply {
        layoutParams = RecyclerView.LayoutParams(match, HLFooterView.height(false).px())
      })
      else -> {
        val t0 = SystemClock.uptimeMillis()
        val design = viewType - ROW_TYPE_BASE
        val row = HLShopRowView(ctx, design, host.cardPool)
        row.layoutParams = RecyclerView.LayoutParams(match, HLLayout.rowHeight(design).px())
        // Sonde : creation d'une rangee neuve (hors prechauffage), et son cout.
        host.markEvent("new$design/${SystemClock.uptimeMillis() - t0}")
        RowHolder(row)
      }
    }
  }

  override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
    host.bind(holder, items[position])
  }

  override fun onViewRecycled(holder: RecyclerView.ViewHolder) {
    (holder as? RowHolder)?.row?.prepareForReuse()
  }

  companion object {
    const val TYPE_BANNER = 1
    const val TYPE_FOOTER = 2
    private const val ROW_TYPE_BASE = 100
    fun rowType(design: Int): Int = ROW_TYPE_BASE + design
  }
}

package com.rauval.yaammoo.homelist

import android.os.Handler
import android.os.Looper
import android.view.View
import androidx.recyclerview.widget.RecyclerView

/**
 Prechauffage des rangees (equivalent de `HLPreheater.swift`) : cree AU REPOS,
 avant le premier scroll, les rangees situees sous l'ecran.

 Une rangee neuve coute cher a son premier affichage (sa liste de cartes et
 ses cartes sont creees) : c'etait la micro-pause des boutiques 2 a 5 au
 premier scroll sur iPhone. Android n'a pas besoin de l'astuce iOS (liste
 allongee par le bas) : la rangee est creee a part, mise en page avec ses
 cartes (contenu de fantome), puis deposee dans la reserve de la liste
 (`putRecycledView`). Au scroll, la liste la reprend et ne fait que la
 reconfigurer.

 Une rangee par etape (30 ms), une fois par lancement. Le premier geste
 l'interrompt : les rangees restantes se creent alors au scroll, comme avant.
 */
class HLPreheater(private val host: HomeListView) {
  /** Une rangee : rang, haut (px, repere de la liste) et design. */
  class RowSpot(val position: Int, val top: Int, val design: Int)

  class Geometry(val viewportBottom: Int, val viewportHeight: Int, val rows: List<RowSpot>)

  /** Hauteur a prechauffer sous l'ecran, en ecrans (prop `preheatScreens`, 0 = coupe). */
  var screens = 2f

  private enum class State { IDLE, WAITING, RUNNING, FINISHED }

  private var state = State.IDLE
  private val steps = ArrayList<Int>()
  private var rowsBefore = 0
  private var cardsBefore = 0
  private var lastDone = -1
  private val handler = Handler(Looper.getMainLooper())
  private val stepRunnable = Runnable { step() }
  private val startRunnable = Runnable {
    if (state == State.WAITING) {
      state = State.RUNNING
      step()
    }
  }

  /** Apres la revelation de la premiere boutique (fondu termine). Une fois par lancement. */
  fun schedule(delayMs: Long) {
    if (state != State.IDLE || screens <= 0f) return
    state = State.WAITING
    rowsBefore = HLShopRowView.created
    cardsBefore = HLMenuCardView.created
    handler.postDelayed(startRunnable, delayMs)
  }

  /** Geste de l'utilisateur, ou zone couverte. Un geste AVANT le depart annule tout. */
  fun stop(reason: String) {
    if (state != State.WAITING && state != State.RUNNING) return
    state = State.FINISHED
    handler.removeCallbacks(startRunnable)
    handler.removeCallbacks(stepRunnable)
    host.report(
      mutableMapOf(
        "kind" to "preheat",
        "end" to reason,
        "stepsMs" to steps.toList(),
        "restoreMs" to 0,
        "newRowCells" to HLShopRowView.created - rowsBefore,
        "newCardCells" to HLMenuCardView.created - cardsBefore,
      )
    )
  }

  private fun step() {
    if (state != State.RUNNING) return
    val g = geometry() ?: return stop("moving")
    val limit = g.viewportBottom + screens * g.viewportHeight
    // Prochaine rangee sous le bord de l'ecran, pas encore creee.
    val next = g.rows.firstOrNull { it.position > lastDone && it.top >= g.viewportBottom && it.top < limit }
      ?: return stop("done")
    val t0 = System.nanoTime()
    createRow(next.design)
    lastDone = next.position
    steps.add(HLPerfMonitor.ms(t0))
    handler.postDelayed(stepRunnable, STEP_DELAY_MS)
  }

  /** `null` = liste en mouvement ou pas encore posee : on ne prechauffe pas. */
  private fun geometry(): Geometry? {
    val list = host.list
    if (list.scrollState != RecyclerView.SCROLL_STATE_IDLE || host.refreshing || list.width == 0) return null
    val rows = host.rows
    val tops = host.tops
    val offset = host.rowOffset
    val spots = rows.indices.mapNotNull { i -> tops.getOrNull(i + offset)?.let { RowSpot(i, it, rows[i].design) } }
    val h = list.height
    return Geometry(host.scrollY() + h, h, spots)
  }

  /**
   Cree une rangee hors liste, la met en page avec ses cartes (contenu de
   fantome) et la depose dans la reserve de la liste.
   */
  private fun createRow(design: Int) {
    val list = host.list
    val holder = host.adapter.createViewHolder(list, HLListAdapter.rowType(design)) as? HLListAdapter.RowHolder ?: return
    val row = holder.row
    row.delegate = host
    row.configure(HLRowContent.Ghost(design), -1)
    val w = list.width
    val h = HLLayout.rowHeight(design).px()
    row.measure(
      View.MeasureSpec.makeMeasureSpec(w, View.MeasureSpec.EXACTLY),
      View.MeasureSpec.makeMeasureSpec(h, View.MeasureSpec.EXACTLY),
    )
    row.layout(0, 0, w, h)
    // Sonde : une rangee prechauffee entre SANS `n` (`in2d5`), comme sur iOS.
    row.displays = 1
    list.recycledViewPool.putRecycledView(holder)
  }

  companion object {
    /** Pause entre deux etapes : une rangee par image, le reste du temps libre. */
    private const val STEP_DELAY_MS = 30L
  }
}

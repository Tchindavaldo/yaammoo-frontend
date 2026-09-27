package com.rauval.yaammoo.bonuspager

import android.annotation.SuppressLint
import android.content.Context
import android.view.MotionEvent
import android.view.ViewGroup
import android.widget.HorizontalScrollView
import com.facebook.react.uimanager.events.NativeGestureUtil
import kotlin.math.floor
import kotlin.math.roundToInt

/**
 Piste des cartes React : un `ViewGroup` sans mise en page propre. Chaque
 carte est placee par Fabric (page N a `N x largeur`, calcule par Yoga) ; on
 ne fait que donner a la piste sa taille totale.
 */
internal class BPPages(context: Context) : ViewGroup(context) {
  var contentW = 0
  var contentH = 0

  override fun onMeasure(widthSpec: Int, heightSpec: Int) = setMeasuredDimension(contentW, contentH)

  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {}
}

/**
 Scroll horizontal PAGINE (equivalent `isPagingEnabled` d'iOS) : aimantation
 sur la page voisine selon le sens du lancer, sinon sur la plus proche.
 `onScroll` est appele a chaque image (geste ET animation) : c'est lui qui
 recale le pied de page.
 */
@SuppressLint("ClickableViewAccessibility")
internal class BPScroll(context: Context) : HorizontalScrollView(context) {
  var onScroll: (() -> Unit)? = null
  var pageCount = 0
  private var flung = false

  init {
    isHorizontalScrollBarEnabled = false
    overScrollMode = OVER_SCROLL_NEVER
  }

  override fun onScrollChanged(l: Int, t: Int, oldl: Int, oldt: Int) {
    super.onScrollChanged(l, t, oldl, oldt)
    onScroll?.invoke()
  }

  override fun onInterceptTouchEvent(ev: MotionEvent): Boolean {
    val intercept = super.onInterceptTouchEvent(ev)
    // Le glissement commence : React envoie « annule » au bouton de carte
    // sous le doigt (pendant Android de `cancelReactTouches` iOS).
    if (intercept) NativeGestureUtil.notifyNativeGestureStarted(this, ev)
    return intercept
  }

  override fun onTouchEvent(ev: MotionEvent): Boolean {
    if (ev.actionMasked == MotionEvent.ACTION_DOWN) flung = false
    val handled = super.onTouchEvent(ev)
    val end = ev.actionMasked == MotionEvent.ACTION_UP || ev.actionMasked == MotionEvent.ACTION_CANCEL
    if (end && !flung) snap(0)
    return handled
  }

  override fun fling(velocityX: Int) {
    flung = true
    snap(velocityX)
  }

  private fun snap(velocity: Int) {
    val w = width
    if (w <= 0 || pageCount == 0) return
    val pos = scrollX.toFloat() / w
    val page = when {
      velocity > 0 -> floor(pos).toInt() + 1
      velocity < 0 -> floor(pos).toInt()
      else -> pos.roundToInt()
    }.coerceIn(0, pageCount - 1)
    smoothScrollTo(page * w, 0)
  }
}

package com.rauval.yaammoo.homelist

import android.content.Context
import android.graphics.Color
import android.graphics.drawable.Drawable
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.ViewGroup
import android.view.animation.DecelerateInterpolator
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.PagerSnapHelper
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.request.target.Target
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

interface HLBannerDelegate {
  fun bannerTapped(bannerId: String)
  /** Premiere image prete : le delegue la revele avec la premiere boutique. */
  fun bannerIsReady(banner: HLBannerView)
  /** Avance auto faite (sonde des premiers gestes). */
  fun bannerAutoplay(banner: HLBannerView)
}

/**
 Banniere du home (`HeroBanner.tsx` + `useBannerLoop`, `HLBannerCell.swift`) :
 carrousel pagine en boucle infinie (clones en tete et en queue), defilement
 auto toutes les 3,5 s si active (pause de 20 s apres un geste), diapos
 voisines reduites (echelle 0,4, opacite 0,8), puces sous la diapo, squelette
 jusqu'a la premiere image.
 */
class HLBannerView(context: Context) : HLBox(context) {
  var delegate: HLBannerDelegate? = null
  private val content = HLBox(context)
  private val pager = RecyclerView(context)
  private val lm = LinearLayoutManager(context, LinearLayoutManager.HORIZONTAL, false)
  private val slidesAdapter = SlideAdapter()
  private var slides: List<HLBanner> = emptyList()
  private var banners: List<HLBanner> = emptyList()
  private var built = false

  private val dotsRow = HLBox(context)
  private val dotBases = ArrayList<View>()
  private val dotOverlays = ArrayList<View>()

  private val skeleton = HLSkeletonView(context, 24f)
  private val dotSkeleton = HLSkeletonView(context, 4f)
  var revealed = false
    private set
  private var generation = 0
  private var firstTarget: Target<Drawable>? = null
  private val autoplayTick = Runnable { autoplayStep() }
  private val autoplayResume = Runnable { startAutoplay() }

  init {
    pager.layoutManager = lm
    pager.adapter = slidesAdapter
    pager.itemAnimator = null
    pager.overScrollMode = View.OVER_SCROLL_NEVER
    PagerSnapHelper().attachToRecyclerView(pager)
    pager.addOnScrollListener(object : RecyclerView.OnScrollListener() {
      override fun onScrolled(rv: RecyclerView, dx: Int, dy: Int) = applyScrollEffects()

      override fun onScrollStateChanged(rv: RecyclerView, newState: Int) {
        when (newState) {
          RecyclerView.SCROLL_STATE_DRAGGING -> {
            stopAutoplay()
            mainHandler.removeCallbacks(autoplayResume)
            mainHandler.postDelayed(autoplayResume, AUTOPLAY_PAUSE_MS)
          }
          RecyclerView.SCROLL_STATE_IDLE -> teleportIfOnClone()
        }
      }
    })
    content.addAll(pager, dotsRow)
    addAll(content, skeleton, dotSkeleton)

    onPlace = { w, _ ->
      content.frame(0f, 0f, w, height.dp())
      val top = HLLayout.bannerTop
      val h = HLLayout.bannerSlideHeight
      skeleton.frame(4f, top, w - 8f, h)
      dotSkeleton.frame((w - 18f) / 2f, top + h + 25f - 18f + 5.5f, 18f, 7f)
    }
    content.onPlace = { w, _ -> placeContent(w) }
  }

  private val pageWidth: Int get() = max(pager.width, 1)

  private fun placeContent(w: Float) {
    val top = HLLayout.bannerTop
    val h = HLLayout.bannerSlideHeight
    val oldWidth = pager.width
    val page = if (oldWidth > 0) currentPage() else -1
    pager.frame(0f, top, w, h)
    // Largeur changee : on garde la diapo courante.
    if (page >= 0 && oldWidth != pager.width) lm.scrollToPositionWithOffset(page, 0)

    // Puces : emplacements de 12 x 7 (marge 1,5), rangee centree, 25 sous la diapo.
    val n = dotBases.size
    val rowW = n * 15f + 12f
    dotsRow.frame((w - rowW) / 2f, top + h + 25f - 18f, rowW, 18f)
    for (i in 0 until n) {
      val x = 6f + 1.5f + i * 15f
      dotBases[i].frame(x + 6f - 3.5f, 5.5f, 7f, 7f)
      dotOverlays[i].frame(x, 5.5f, 12f, 7f)
    }
    applyScrollEffects()
  }

  // Configuration

  fun configure(new: List<HLBanner>, loading: Boolean) {
    if (new == banners && built) return
    built = true
    generation++
    banners = new
    rebuild()
    firstTarget?.let { HLImage.cancel(it) }
    firstTarget = null
    if (banners.isEmpty()) {
      // Chargement sans banniere encore recue : squelette seul.
      setRevealed(false)
      return
    }
    if (revealed) {
      setRevealed(true)
      delegate?.bannerIsReady(this)
    } else {
      // Premiere image deja en memoire : Glide repond pendant la demande.
      val gen = generation
      var issuing = true
      var readyNow = false
      val (sw, sh) = slideSize()
      firstTarget = HLImage.fetch(banners[0].imageUrl, sw, sh) {
        if (generation != gen) return@fetch
        if (issuing) readyNow = true else delegate?.bannerIsReady(this)
      }
      issuing = false
      setRevealed(readyNow)
      if (readyNow) delegate?.bannerIsReady(this)
    }
    startAutoplay()
  }

  /** Taille d'une diapo (dp) : largeur de l'ecran - 8, comme la liste. */
  private fun slideSize(): Pair<Float, Float> {
    val w = max(width, resources.displayMetrics.widthPixels).dp()
    return (w - 8f) to HLLayout.bannerSlideHeight
  }

  private fun rebuild() {
    dotBases.forEach { dotsRow.removeView(it) }
    dotOverlays.forEach { dotsRow.removeView(it) }
    dotBases.clear()
    dotOverlays.clear()
    val n = banners.size
    slides = if (n > 1) listOf(banners[n - 1]) + banners + listOf(banners[0]) else banners
    if (n > 1) {
      for (i in 0 until n) {
        val base = View(context).apply { background = roundedBackground(HLColor.dot, 3.5f) }
        val overlay = View(context).apply {
          background = roundedBackground(HLColor.primary, 3.5f)
          alpha = 0f
        }
        dotsRow.addAll(base, overlay)
        dotBases.add(base)
        dotOverlays.add(overlay)
      }
    }
    dotSkeleton.visibility = if (n == 1) View.INVISIBLE else View.VISIBLE
    slidesAdapter.notifyDataSetChanged()
    lm.scrollToPositionWithOffset(if (n > 1) 1 else 0, 0)
    content.relayout()
  }

  // Revelation

  fun reveal(animated: Boolean) {
    if (revealed || banners.isEmpty()) return
    if (!animated) {
      setRevealed(true)
      return
    }
    revealed = true
    val ease = DecelerateInterpolator()
    content.animate().alpha(1f).setDuration(HLLayout.revealMs).setInterpolator(ease)
    skeleton.animate().alpha(0f).setDuration(HLLayout.revealMs).setInterpolator(ease)
    dotSkeleton.animate().alpha(0f).setDuration(HLLayout.revealMs).setInterpolator(ease)
      .withEndAction {
        if (revealed) {
          skeleton.setBreathing(false)
          dotSkeleton.setBreathing(false)
        }
      }
  }

  private fun setRevealed(r: Boolean) {
    revealed = r
    listOf<View>(content, skeleton, dotSkeleton).forEach { it.animate().cancel() }
    content.alpha = if (r) 1f else 0f
    skeleton.alpha = if (r) 0f else 1f
    dotSkeleton.alpha = if (r) 0f else 1f
    skeleton.setBreathing(!r)
    dotSkeleton.setBreathing(!r)
  }

  // Defilement

  /** Position fractionnaire (0 = premiere diapo de la piste, clone compris). */
  private fun pagePosition(): Float {
    val first = lm.findFirstVisibleItemPosition()
    if (first == RecyclerView.NO_POSITION) return 0f
    val v = lm.findViewByPosition(first) ?: return first.toFloat()
    return first - v.left.toFloat() / pageWidth
  }

  private fun currentPage(): Int = pagePosition().roundToInt().coerceIn(0, max(0, slides.size - 1))

  private fun applyScrollEffects() {
    val w = pageWidth.toFloat()
    for (i in 0 until pager.childCount) {
      val child = pager.getChildAt(i) as? SlideView ?: continue
      val d = min(abs(child.left) / w, 1f)
      val s = 1f - 0.6f * d
      child.wrapper.scaleX = s
      child.wrapper.scaleY = s
      child.wrapper.alpha = 1f - 0.2f * d
    }
    val n = banners.size
    if (n <= 1 || dotOverlays.size != n) return
    val p = pagePosition()
    for (i in 0 until n) {
      // Banniere i : diapo reelle i + 1, et son clone (0 pour la derniere,
      // n + 1 pour la premiere).
      var a = max(0f, 1f - abs(p - (i + 1)))
      if (i == 0) a = max(a, 1f - abs(p - (n + 1)))
      if (i == n - 1) a = max(a, 1f - abs(p))
      dotOverlays[i].alpha = a
    }
  }

  /** Boucle infinie : un clone atteint, on saute sans animation sur la vraie diapo. */
  private fun teleportIfOnClone() {
    val n = banners.size
    if (n <= 1) return
    when (currentPage()) {
      0 -> lm.scrollToPositionWithOffset(n, 0)
      n + 1 -> lm.scrollToPositionWithOffset(1, 0)
    }
  }

  private fun startAutoplay() {
    stopAutoplay()
    if (!autoplayEnabled || banners.size <= 1 || !isAttachedToWindow) return
    mainHandler.postDelayed(autoplayTick, AUTOPLAY_MS)
  }

  private fun stopAutoplay() {
    mainHandler.removeCallbacks(autoplayTick)
  }

  private fun autoplayStep() {
    if (autoplayEnabled && pager.scrollState == RecyclerView.SCROLL_STATE_IDLE) {
      delegate?.bannerAutoplay(this)
      // Part toujours d'une vraie diapo.
      teleportIfOnClone()
      pager.smoothScrollToPosition(currentPage() + 1)
    }
    mainHandler.postDelayed(autoplayTick, AUTOPLAY_MS)
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    startAutoplay()
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    stopAutoplay()
    mainHandler.removeCallbacks(autoplayResume)
  }

  private fun onSlideTap(position: Int) {
    val b = slides.getOrNull(position) ?: return
    if (b.tappable) delegate?.bannerTapped(b.id)
  }

  // Diapos

  class SlideView(context: Context) : HLBox(context) {
    val wrapper = HLBox(context)
    val image = HLImageView(context)
    val title = HLLabel(context)

    init {
      wrapper.background = roundedBackground(HLColor.bannerBackground, 24f)
      wrapper.roundCorners(24f)
      title.setFont(700, 16f, Color.WHITE)
      title.paint.setShadowLayer(4f * HLDim.density, 0f, 1f * HLDim.density, HLColor.black(0.35f))
      wrapper.addAll(image, title)
      addView(wrapper)
      onPlace = { w, h -> wrapper.frame(4f, 0f, w - 8f, h) }
      wrapper.onPlace = { w, h ->
        image.frame(0f, 0f, w, h)
        title.frame(16f, h - 16f - 20f, w - 32f, 20f)
      }
    }
  }

  class SlideHolder(val slide: SlideView) : RecyclerView.ViewHolder(slide)

  inner class SlideAdapter : RecyclerView.Adapter<SlideHolder>() {
    override fun getItemCount(): Int = slides.size

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): SlideHolder {
      val v = SlideView(parent.context)
      v.layoutParams = RecyclerView.LayoutParams(
        RecyclerView.LayoutParams.MATCH_PARENT, RecyclerView.LayoutParams.MATCH_PARENT,
      )
      val holder = SlideHolder(v)
      v.setOnClickListener { onSlideTap(holder.bindingAdapterPosition) }
      return holder
    }

    override fun onBindViewHolder(holder: SlideHolder, position: Int) {
      val b = slides[position]
      val (sw, sh) = slideSize()
      HLImage.set(holder.slide.image, b.imageUrl, sw, sh)
      holder.slide.title.text = b.title?.takeIf { it.isNotEmpty() }
      holder.slide.wrapper.relayout()
    }
  }

  companion object {
    private const val AUTOPLAY_MS = 3500L
    private const val AUTOPLAY_PAUSE_MS = 20_000L
    /** Defilement auto (prop `bannerAutoplay`, OTA). Coupe par defaut. */
    var autoplayEnabled = false
    private val mainHandler = Handler(Looper.getMainLooper())
  }
}

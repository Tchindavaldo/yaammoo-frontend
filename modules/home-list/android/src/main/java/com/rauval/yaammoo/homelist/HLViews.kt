package com.rauval.yaammoo.homelist

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Outline
import android.graphics.Paint
import android.graphics.Shader
import android.graphics.drawable.GradientDrawable
import android.text.Layout
import android.text.StaticLayout
import android.text.TextPaint
import android.text.TextUtils
import android.view.View
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import android.view.animation.AccelerateDecelerateInterpolator
import android.widget.ImageView
import java.util.WeakHashMap
import kotlin.math.ceil

/**
 Conteneur a mise en page MANUELLE, equivalent du `layoutSubviews` iOS :
 `onPlace(largeur, hauteur)` (en dp) pose chaque enfant a un cadre fixe via
 `frame`. Aucun passage de mesure Android generique : chaque vue connait ses
 cotes, comme dans le module iOS.

 ⚠️ Un changement de contenu (texte, image) ne remonte JAMAIS de
 `requestLayout` a la liste : la boite qui l'a change appelle `relayout()`,
 qui ne repose qu'elle-meme. Sans ca, chaque image chargee relancerait la
 mise en page de toute la liste.
 */
open class HLBox(context: Context) : ViewGroup(context) {
  /** Pose des enfants ; `w`, `h` en dp. */
  var onPlace: ((w: Float, h: Float) -> Unit)? = null

  override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
    setMeasuredDimension(MeasureSpec.getSize(widthMeasureSpec), MeasureSpec.getSize(heightMeasureSpec))
  }

  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
    place((r - l).dp(), (b - t).dp())
  }

  protected open fun place(w: Float, h: Float) {
    onPlace?.invoke(w, h)
  }

  /** Repose les enfants a la taille actuelle (apres un changement de contenu). */
  fun relayout() {
    if (width > 0 && height > 0) place(width.dp(), height.dp())
  }

  private var selfLayoutPosted = false

  override fun requestLayout() {
    // Deja pose et a l'ecran : on se repose seul avant la prochaine image,
    // sans remonter a la liste (une liste de cartes rechargee y passe). Pas
    // encore pose (creation, sortie de la reserve) : chemin normal.
    if (width > 0 && height > 0 && isAttachedToWindow) {
      forceLayout()
      if (!selfLayoutPosted) {
        selfLayoutPosted = true
        postOnAnimation {
          selfLayoutPosted = false
          measure(
            MeasureSpec.makeMeasureSpec(width, MeasureSpec.EXACTLY),
            MeasureSpec.makeMeasureSpec(height, MeasureSpec.EXACTLY),
          )
          layout(left, top, right, bottom)
        }
      }
      return
    }
    super.requestLayout()
  }

  override fun shouldDelayChildPressedState(): Boolean = false
}

/** Pose `this` a un cadre en dp (repere du parent). */
fun View.frame(x: Float, y: Float, w: Float, h: Float) {
  val l = x.px()
  val t = y.px()
  val r = (x + w).px()
  val b = (y + h).px()
  val ws = View.MeasureSpec.makeMeasureSpec(maxOf(0, r - l), View.MeasureSpec.EXACTLY)
  val hs = View.MeasureSpec.makeMeasureSpec(maxOf(0, b - t), View.MeasureSpec.EXACTLY)
  measure(ws, hs)
  layout(l, t, r, b)
}

/** Coins arrondis par le contour (decoupe materielle, sans calque hors ecran). */
fun View.roundCorners(radiusDp: Float) {
  outlineProvider = object : ViewOutlineProvider() {
    override fun getOutline(view: View, outline: Outline) {
      outline.setRoundRect(0, 0, view.width, view.height, radiusDp * HLDim.density)
    }
  }
  clipToOutline = true
}

fun roundedBackground(color: Int, radiusDp: Float, strokeColor: Int? = null): GradientDrawable =
  GradientDrawable().apply {
    setColor(color)
    cornerRadius = radiusDp * HLDim.density
    if (strokeColor != null) setStroke(maxOf(1, 1.px()), strokeColor)
  }

/**
 Texte d'une ligne (ou plusieurs, `multiline`), dessine directement : plus
 leger a creer et a reconfigurer qu'un `TextView`, et ne demande jamais de
 mise en page. Centre verticalement dans son cadre, comme un `UILabel`.
 Le texte peut porter des fragments (polices, couleurs, icones : `HLRuns`).
 */
class HLLabel(context: Context) : View(context) {
  val paint = TextPaint(Paint.ANTI_ALIAS_FLAG)
  /** Marges internes en dp (gauche, haut, droite, bas) : pastilles. */
  var insets = floatArrayOf(0f, 0f, 0f, 0f)
  var centered = false
  var multiline = false
  private var textLayout: Layout? = null
  private var layoutWidth = -1

  var text: CharSequence? = null
    set(value) {
      field = value
      textLayout = null
      invalidate()
    }

  init {
    importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
  }

  fun setFont(weight: Int, sizeDp: Float, color: Int) {
    paint.typeface = HLFont.of(weight)
    paint.textSize = sizeDp * HLDim.density
    paint.color = color
    textLayout = null
    invalidate()
  }

  /** Largeur du texte seul (dp), jamais tronque. */
  fun textWidth(): Float {
    val t = text ?: return 0f
    if (t.isEmpty()) return 0f
    return ceil(Layout.getDesiredWidth(t, paint)) / HLDim.density
  }

  /** Hauteur d'une ligne de la police de base (dp). */
  fun lineHeight(): Float {
    val fm = paint.fontMetrics
    return ceil(fm.descent - fm.ascent) / HLDim.density
  }

  /** Taille ajustee au texte, marges comprises (dp) : pastilles. */
  fun fitWidth(): Float = textWidth() + insets[0] + insets[2]
  fun fitHeight(): Float = lineHeight() + insets[1] + insets[3]

  override fun onDraw(canvas: Canvas) {
    val t = text ?: return
    if (t.isEmpty()) return
    val left = insets[0] * HLDim.density
    val right = insets[2] * HLDim.density
    val avail = (width - left - right).toInt()
    if (avail <= 0) return
    if (textLayout == null || layoutWidth != avail) {
      textLayout = StaticLayout.Builder.obtain(t, 0, t.length, paint, avail)
        .setAlignment(if (centered) Layout.Alignment.ALIGN_CENTER else Layout.Alignment.ALIGN_NORMAL)
        .setIncludePad(false)
        .setMaxLines(if (multiline) Int.MAX_VALUE else 1)
        .setEllipsize(if (multiline) null else TextUtils.TruncateAt.END)
        .build()
      layoutWidth = avail
    }
    val l = textLayout ?: return
    val y = (height - l.height) / 2f
    canvas.save()
    canvas.translate(left, y)
    l.draw(canvas)
    canvas.restore()
  }
}

/**
 Image a cadre fixe : poser une image (Glide) ne relance aucune mise en page
 (`ImageView` le ferait a chaque changement de taille d'image).
 */
class HLImageView(context: Context) : ImageView(context) {
  init {
    scaleType = ScaleType.CENTER_CROP
    importantForAccessibility = IMPORTANT_FOR_ACCESSIBILITY_NO
  }

  override fun requestLayout() {
    if (width > 0 && height > 0) return
    super.requestLayout()
  }
}

/**
 Respiration commune des squelettes : UNE seule animation (800 ms aller,
 800 ms retour) pour tous les squelettes a l'ecran, qui ne fait que changer
 l'opacite de leur calque clair (propriete de rendu, aucun redessin).
 */
object HLBreath {
  private val views = WeakHashMap<View, Boolean>()
  private var alpha = 0f
  private var animator: ValueAnimator? = null

  fun add(v: View) {
    views[v] = true
    v.alpha = alpha
    if (animator == null) start()
  }

  fun remove(v: View) {
    views.remove(v)
    if (views.isEmpty()) {
      animator?.cancel()
      animator = null
    }
  }

  private fun start() {
    animator = ValueAnimator.ofFloat(0f, 1f).apply {
      duration = 800
      repeatMode = ValueAnimator.REVERSE
      repeatCount = ValueAnimator.INFINITE
      interpolator = AccelerateDecelerateInterpolator()
      addUpdateListener { a ->
        alpha = a.animatedValue as Float
        for (v in views.keys) v.alpha = alpha
      }
      start()
    }
  }
}

/** Squelette « qui respire » : fond `#e6eaef`, calque clair `#f4f7fa` anime. */
class HLSkeletonView(context: Context, radiusDp: Float) : HLBox(context) {
  private val highlight = View(context)
  private var wantsBreathing = false

  init {
    background = roundedBackground(HLColor.skeletonBase, radiusDp)
    highlight.background = roundedBackground(HLColor.skeletonHighlight, radiusDp)
    highlight.alpha = 0f
    addView(highlight)
    onPlace = { w, h -> highlight.frame(0f, 0f, w, h) }
  }

  fun setBreathing(on: Boolean) {
    wantsBreathing = on
    if (on && isAttachedToWindow) HLBreath.add(highlight) else HLBreath.remove(highlight)
    if (!on) highlight.alpha = 0f
  }

  override fun onAttachedToWindow() {
    super.onAttachedToWindow()
    if (wantsBreathing) HLBreath.add(highlight)
  }

  override fun onDetachedFromWindow() {
    super.onDetachedFromWindow()
    HLBreath.remove(highlight)
  }
}

/** Degrade lineaire, points de depart/arrivee en fraction du cadre. */
class HLGradientView(
  context: Context,
  private val colors: IntArray,
  private val positions: FloatArray? = null,
  private val start: Pair<Float, Float> = 0.5f to 0f,
  private val end: Pair<Float, Float> = 0.5f to 1f,
) : View(context) {
  private val paint = Paint()

  override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
    paint.shader = LinearGradient(
      start.first * w, start.second * h, end.first * w, end.second * h,
      colors, positions, Shader.TileMode.CLAMP,
    )
  }

  override fun onDraw(canvas: Canvas) {
    canvas.drawRect(0f, 0f, width.toFloat(), height.toFloat(), paint)
  }
}

/** Ajoute des enfants dans l'ordre (le dernier au-dessus). */
fun ViewGroup.addAll(vararg children: View) {
  children.forEach { addView(it) }
}

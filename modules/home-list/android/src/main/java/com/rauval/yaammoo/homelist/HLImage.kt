package com.rauval.yaammoo.homelist

import android.content.Context
import android.graphics.Bitmap
import android.graphics.drawable.Drawable
import android.os.SystemClock
import android.widget.ImageView
import com.bumptech.glide.Glide
import com.bumptech.glide.RequestBuilder
import com.bumptech.glide.RequestManager
import com.bumptech.glide.load.DataSource
import com.bumptech.glide.load.engine.GlideException
import com.bumptech.glide.load.engine.bitmap_recycle.BitmapPool
import com.bumptech.glide.load.resource.bitmap.BitmapTransformation
import com.bumptech.glide.load.resource.bitmap.CenterCrop
import com.bumptech.glide.request.RequestListener
import com.bumptech.glide.request.target.CustomTarget
import com.bumptech.glide.request.target.Target
import com.bumptech.glide.request.transition.Transition
import java.security.MessageDigest
import java.util.concurrent.atomic.AtomicInteger
import kotlin.math.max
import kotlin.math.roundToInt

/**
 Chargement via Glide, le moteur d'expo-image. Les images sont reduites a la
 taille affichee (`override`) : decodage plus court et memoire bornee.

 ⚠️ Toutes les requetes d'une meme image passent par `request` (memes
 options) : Glide fusionne alors la requete de l'image affichee et celle du
 temoin de revelation, et un deuxieme affichage sort de la memoire
 SYNCHRONEMENT (rappel pendant `into`), sans squelette.
 */
object HLImage {
  lateinit var app: Context

  private fun glide(): RequestManager = Glide.with(app)

  /**
   Modele Glide : URL (`http`, `file`...) ou chemin, sinon ressource embarquee
   (en release, un asset RN resolu est un NOM de ressource, pas une URL).
   */
  fun model(s: String?): Any? {
    if (s.isNullOrEmpty()) return null
    if (s.contains("://") || s.startsWith("/")) return s
    val res = app.resources
    val drawable = res.getIdentifier(s, "drawable", app.packageName)
    if (drawable != 0) return drawable
    val raw = res.getIdentifier(s, "raw", app.packageName)
    return if (raw != 0) raw else s
  }

  /**
   ⚠️ Une ressource passe par `load(Int)` : Glide y ajoute la version de l'app
   a la cle de cache (un identifiant de ressource change d'une build a l'autre).
   */
  private fun load(m: Any): RequestBuilder<Drawable> = if (m is Int) glide().load(m) else glide().load(m)

  private fun request(s: String?, w: Float, h: Float): RequestBuilder<Drawable>? {
    val m = model(s) ?: return null
    return load(m).override(w.px(), h.px()).centerCrop()
  }

  /** Affiche l'image ; `done` a la fin (succes ou echec), parfois tout de suite. */
  fun set(view: ImageView, s: String?, w: Float, h: Float, done: (() -> Unit)? = null) {
    val req = request(s, w, h)
    if (req == null) {
      glide().clear(view)
      view.setImageDrawable(null)
      done?.invoke()
      return
    }
    req.listener(object : RequestListener<Drawable> {
      override fun onLoadFailed(e: GlideException?, model: Any?, target: Target<Drawable>, isFirstResource: Boolean): Boolean {
        done?.invoke()
        return false
      }

      override fun onResourceReady(
        resource: Drawable, model: Any, target: Target<Drawable>, dataSource: DataSource, isFirstResource: Boolean,
      ): Boolean {
        done?.invoke()
        return false
      }
    }).into(view)
  }

  fun clear(view: ImageView) {
    glide().clear(view)
    view.setImageDrawable(null)
  }

  /**
   Charge sans afficher (temoin de revelation) : meme cle que `set`, donc la
   requete est partagee avec l'image affichee. A liberer avec `cancel`.
   */
  fun fetch(s: String?, w: Float, h: Float, done: () -> Unit): Target<Drawable>? {
    val req = request(s, w, h)
    if (req == null) {
      done()
      return null
    }
    return req.into(object : CustomTarget<Drawable>(w.px(), h.px()) {
      override fun onResourceReady(resource: Drawable, transition: Transition<in Drawable>?) = done()
      override fun onLoadFailed(errorDrawable: Drawable?) = done()
      override fun onLoadCleared(placeholder: Drawable?) = Unit
    })
  }

  fun cancel(target: Target<*>) {
    glide().clear(target)
  }

  /** Prechargement des rangees a venir (memoire), meme cle que `set`. */
  fun prefetch(items: List<Triple<String?, Float, Float>>) {
    for ((s, w, h) in items) request(s, w, h)?.preload()
  }

  /**
   Photo floutee d'avance des barres v4/v5 (rendu `baked` iOS) : la photo est
   reduite a 64 px de large au cadrage de la carte, puis floutee UNE fois par
   Glide, hors du fil de l'ecran ; le resultat est en cache (memoire et
   disque) comme n'importe quelle image. Plus aucun flou a l'affichage.
   */
  fun setBlurred(view: ImageView, s: String?, cardW: Float, cardH: Float) {
    val m = model(s)
    if (m == null) {
      clear(view)
      return
    }
    val bh = max(1, (BAKE_WIDTH * cardH / cardW).roundToInt())
    load(m)
      .override(BAKE_WIDTH, bh)
      .disallowHardwareConfig()
      .transform(CenterCrop(), HLBlurTransformation())
      .dontAnimate()
      .into(view)
  }

  /** Largeur (px) de la photo reduite avant le flou. */
  private const val BAKE_WIDTH = 64
}

/** Flou de la photo reduite (3 passes de moyenne glissante ≈ gaussien, sigma ~3 px). */
class HLBlurTransformation : BitmapTransformation() {
  override fun transform(pool: BitmapPool, toTransform: Bitmap, outWidth: Int, outHeight: Int): Bitmap {
    val t0 = SystemClock.elapsedRealtimeNanos()
    val w = toTransform.width
    val h = toTransform.height
    val px = IntArray(w * h)
    toTransform.getPixels(px, 0, w, 0, 0, w, h)
    HLBoxBlur.blur(px, w, h, RADIUS)
    val out = pool.get(w, h, Bitmap.Config.ARGB_8888)
    out.setPixels(px, 0, w, 0, 0, w, h)
    val ms = (SystemClock.elapsedRealtimeNanos() - t0) / 100_000 / 10.0
    bakes.incrementAndGet()
    if (ms > bakeMaxMs) bakeMaxMs = ms
    return out
  }

  override fun equals(other: Any?): Boolean = other is HLBlurTransformation
  override fun hashCode(): Int = ID.hashCode()

  override fun updateDiskCacheKey(messageDigest: MessageDigest) {
    messageDigest.update(ID_BYTES)
  }

  companion object {
    private const val RADIUS = 3
    private const val ID = "com.rauval.yaammoo.homelist.HLBlurTransformation.1"
    private val ID_BYTES = ID.toByteArray(Charsets.UTF_8)

    /** Sonde : photos floutees depuis le lancement, et la plus longue (ms). */
    val bakes = AtomicInteger(0)
    @Volatile var bakeMaxMs = 0.0
  }
}

/** Moyenne glissante horizontale puis verticale, bords etires. */
object HLBoxBlur {
  fun blur(px: IntArray, w: Int, h: Int, radius: Int, passes: Int = 3) {
    val tmp = IntArray(px.size)
    repeat(passes) {
      pass(px, tmp, w, h, radius, horizontal = true)
      pass(tmp, px, w, h, radius, horizontal = false)
    }
  }

  private fun pass(src: IntArray, dst: IntArray, w: Int, h: Int, r: Int, horizontal: Boolean) {
    val div = 2 * r + 1
    val lines = if (horizontal) h else w
    val len = if (horizontal) w else h
    val step = if (horizontal) 1 else w
    for (line in 0 until lines) {
      val base = if (horizontal) line * w else line
      fun at(i: Int) = src[base + i.coerceIn(0, len - 1) * step]
      var a = 0
      var rr = 0
      var g = 0
      var b = 0
      for (i in -r..r) {
        val p = at(i)
        a += p ushr 24
        rr += (p shr 16) and 0xff
        g += (p shr 8) and 0xff
        b += p and 0xff
      }
      for (i in 0 until len) {
        dst[base + i * step] = ((a / div) shl 24) or ((rr / div) shl 16) or ((g / div) shl 8) or (b / div)
        val out = at(i - r)
        val inn = at(i + r + 1)
        a += (inn ushr 24) - (out ushr 24)
        rr += ((inn shr 16) and 0xff) - ((out shr 16) and 0xff)
        g += ((inn shr 8) and 0xff) - ((out shr 8) and 0xff)
        b += (inn and 0xff) - (out and 0xff)
      }
    }
  }
}

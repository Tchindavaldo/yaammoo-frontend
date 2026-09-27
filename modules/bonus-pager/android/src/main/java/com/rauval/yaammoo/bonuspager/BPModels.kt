package com.rauval.yaammoo.bonuspager

import android.content.res.AssetManager
import android.graphics.Color
import android.graphics.Typeface
import android.os.Build
import com.facebook.react.common.assets.ReactFontManager
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

/**
 Record recu de JS (prop `items`). Tout est PRE-CALCULE cote JS
 (`toPagerItem`) : le natif ne fait qu'afficher, aucune regle metier.
 */
class BPItemRecord : Record {
  @Field val id: String = ""
  @Field val color: String = ""
  @Field val icon: String = ""
  @Field val label: String = ""
  @Field val issuer: String = ""
  @Field val remaining: String? = null
  @Field val name: String = ""
  @Field val statusLabel: String = ""
  @Field val statusColor: String = ""
}

data class BPItem(
  val id: String,
  val color: Int,
  val icon: String,
  val label: String,
  val issuer: String,
  val remaining: String?,
  val name: String,
  val statusLabel: String,
  val statusColor: Int,
) {
  constructor(r: BPItemRecord) : this(
    r.id,
    BPColor.parse(r.color) ?: BPColor.FALLBACK,
    r.icon,
    r.label,
    r.issuer,
    r.remaining,
    r.name,
    r.statusLabel,
    BPColor.parse(r.statusColor) ?: BPColor.FALLBACK,
  )
}

object BPColor {
  /** `Theme.colors.primary` : couleur du bonus par defaut. */
  val FALLBACK = Color.rgb(0xec, 0x49, 0x13)

  /** `#RGB`, `#RRGGBB` ou `#RRGGBBAA` (ordre RN, alpha en dernier). */
  fun parse(s: String): Int? {
    var hex = s.trim()
    if (!hex.startsWith("#")) return null
    hex = hex.substring(1)
    if (hex.length == 3) hex = hex.map { "$it$it" }.joinToString("")
    if (hex.length != 6 && hex.length != 8) return null
    val v = hex.toLongOrNull(16) ?: return null
    return if (hex.length == 8) {
      Color.argb((v and 0xff).toInt(), ((v shr 24) and 0xff).toInt(),
        ((v shr 16) and 0xff).toInt(), ((v shr 8) and 0xff).toInt())
    } else {
      Color.rgb(((v shr 16) and 0xff).toInt(), ((v shr 8) and 0xff).toInt(), (v and 0xff).toInt())
    }
  }

  /** Remplace l'opacite (`${color}1f` cote RN). */
  fun withAlpha(c: Int, alpha: Float): Int =
    Color.argb((alpha.coerceIn(0f, 1f) * 255).toInt(), Color.red(c), Color.green(c), Color.blue(c))

  /** Multiplie l'opacite existante (fondu d'un element). */
  fun fade(c: Int, alpha: Float): Int = withAlpha(c, Color.alpha(c) / 255f * alpha)

  fun black(alpha: Float): Int = withAlpha(Color.BLACK, alpha)

  /** `t = 0` -> a, `t = 1` -> b : melange canal par canal, comme `Animated`. */
  fun mix(a: Int, b: Int, t: Float): Int {
    fun ch(x: Int, y: Int) = (x + (y - x) * t).toInt().coerceIn(0, 255)
    return Color.argb(ch(Color.alpha(a), Color.alpha(b)), ch(Color.red(a), Color.red(b)),
      ch(Color.green(a), Color.green(b)), ch(Color.blue(a), Color.blue(b)))
  }
}

object BPFont {
  private val cache = HashMap<Int, Typeface>()

  /** Graisse systeme (700 = bold, 800/900 = heavy). */
  fun weight(w: Int): Typeface = cache.getOrPut(w) {
    when {
      Build.VERSION.SDK_INT >= 28 -> Typeface.create(Typeface.DEFAULT, w, false)
      w >= 700 -> Typeface.DEFAULT_BOLD
      else -> Typeface.DEFAULT
    }
  }

  /** Police Ionicons chargee par expo-font, `null` si introuvable. */
  fun icons(family: String?, assets: AssetManager): Typeface? {
    for (name in listOfNotNull(family, "ionicons", "Ionicons")) {
      val t = runCatching { ReactFontManager.getInstance().getTypeface(name, Typeface.NORMAL, assets) }.getOrNull()
      if (t != null && t != Typeface.DEFAULT) return t
    }
    return null
  }
}

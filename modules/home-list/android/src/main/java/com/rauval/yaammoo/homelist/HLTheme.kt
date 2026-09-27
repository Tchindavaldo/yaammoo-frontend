package com.rauval.yaammoo.homelist

import android.content.res.AssetManager
import android.graphics.Color
import android.graphics.Typeface
import android.os.Build
import com.facebook.react.common.assets.ReactFontManager
import kotlin.math.roundToInt

/**
 Constantes visuelles de la liste native du home, reprises TELLES QUELLES du
 module iOS (`HLTheme.swift`), lui-meme calque sur les styles React Native.
 Toutes les cotes sont en dp (= points iOS = unites RN). Modifier ici =
 modifier le design ; un changement se fait des deux cotes.
 */
object HLColor {
  /** `#RRGGBB` ou `#RRGGBBAA` (convention CSS/iOS, alpha en dernier). */
  fun hex(value: String): Int {
    val s = value.trim().removePrefix("#")
    val n = s.toLong(16)
    return if (s.length == 8) {
      Color.argb(
        (n and 0xff).toInt(),
        ((n shr 24) and 0xff).toInt(),
        ((n shr 16) and 0xff).toInt(),
        ((n shr 8) and 0xff).toInt()
      )
    } else {
      Color.rgb(((n shr 16) and 0xff).toInt(), ((n shr 8) and 0xff).toInt(), (n and 0xff).toInt())
    }
  }

  fun white(alpha: Float): Int = Color.argb((alpha * 255).roundToInt(), 255, 255, 255)
  fun black(alpha: Float): Int = Color.argb((alpha * 255).roundToInt(), 0, 0, 0)

  val accent = hex("#e8440a")
  /** `Theme.colors.primary` (puces actives, rafraichissement). */
  val primary = hex("#ec4913")
  val dark = hex("#1C1C1E")
  val gray100 = hex("#F2F2F7")
  val green = hex("#00b894")
  val starYellow = hex("#f5a623")
  val skeletonBase = hex("#e6eaef")
  val skeletonHighlight = hex("#f4f7fa")
  val bannerBackground = hex("#eef1f5")
  val dot = hex("#d8d2ce")
  val chip = hex("#f2f2f2")
  val chipText = hex("#555555")
  val metaText = hex("#444444")
  val metaMuted = hex("#999999")
  val metaTitle = hex("#111111")
  val v4Background = hex("#fdeded")
  val v4TimeText = hex("#8a8a8a")
  val deliveryLabel = hex("#000000e1")
}

/** Conversion dp -> px (densite de l'ecran, relevee par la vue hote). */
object HLDim {
  var density = 1f
}

fun Float.px(): Int = (this * HLDim.density).roundToInt()
fun Int.px(): Int = (this * HLDim.density).roundToInt()
fun Int.dp(): Float = this / HLDim.density

/**
 Polices par graisse, recues de JS (prop `fonts`, OTA) : nom d'une police deja
 chargee par expo-font (enregistree dans `ReactFontManager`), `null` = systeme.
 */
object HLFont {
  var names: Map<Int, String?> = emptyMap()
    set(value) {
      field = value
      cache.clear()
    }
  var assets: AssetManager? = null
  private val cache = HashMap<Int, Typeface>()

  fun of(weight: Int): Typeface = cache.getOrPut(weight) {
    val name = names[weight]
    if (name != null) {
      ReactFontManager.getInstance().getTypeface(name, Typeface.NORMAL, assets)
    } else {
      system(weight)
    }
  }

  private fun system(weight: Int): Typeface = when {
    Build.VERSION.SDK_INT >= 28 -> Typeface.create(Typeface.DEFAULT, weight, false)
    weight >= 700 -> Typeface.DEFAULT_BOLD
    weight >= 500 -> Typeface.create("sans-serif-medium", Typeface.NORMAL)
    else -> Typeface.DEFAULT
  }
}

/** Gabarit d'une carte menu, par variante de design (cf. `SKELETON_SIZES`). */
data class HLCardSize(val width: Float, val height: Float, val radius: Float)

object HLLayout {
  /** Cycle des designs de rangee (`utils/designCycle.ts`). */
  val designCycle = listOf(7, 4, 5)

  fun design(position: Int): Int = designCycle[((position % 6) + 6) % 6 % designCycle.size]

  fun card(design: Int): HLCardSize = when (design) {
    4 -> HLCardSize(240f, 240f, 16f)
    5 -> HLCardSize(200f, 250f, 16f)
    else -> HLCardSize(150f, 190f, 12f)
  }

  /** Ecart entre deux cartes (`marginRight: 8`). */
  const val cardGap = 8f
  /** `Theme.design.horizontalPadding` : marge laterale de la liste (prop). */
  var sidePadding = 4f

  /** `marginVertical: Theme.spacing.xs` en haut de rangee. */
  const val rowTop = 4f
  /** `marginBottom: Theme.design.marginBottom` sous la rangee. */
  const val rowBottom = 20f
  /** MerchantHeader : paddingVertical 4 + contenu 38 + paddingVertical 4. */
  const val headerHeight = 46f
  /** `marginBottom: 2` sous le header. */
  const val headerGap = 2f
  /** ItemMeta : paddingTop 8 + titre 16 + gap 3 + ligne 16 (+ 1 de marge). */
  const val metaHeight = 44f

  fun rowHeight(design: Int): Float =
    rowTop + headerHeight + headerGap + card(design).height + metaHeight + rowBottom

  /** Banniere : marginTop 4 + diapo 210 + marginBottom 30 (puces dedans). */
  const val bannerTop = 4f
  const val bannerSlideHeight = 210f
  const val bannerBottom = 30f
  const val bannerHeight = bannerTop + bannerSlideHeight + bannerBottom

  /** Fondu squelette -> contenu (`REVEAL_MS`). */
  const val revealMs = 220L
  /** Revelation forcee si une image ne repond jamais (`MAX_WAIT_MS`). */
  const val revealMaxWaitMs = 8000L
}

/** Nombre de cartes squelettes d'un fantome (`PLACEHOLDER_MENUS`). */
const val HL_GHOST_MENU_COUNT = 3

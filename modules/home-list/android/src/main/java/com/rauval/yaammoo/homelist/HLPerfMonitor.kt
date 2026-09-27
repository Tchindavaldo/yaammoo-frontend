package com.rauval.yaammoo.homelist

import android.content.Context
import android.content.pm.ApplicationInfo
import android.os.Build
import android.os.Looper
import android.util.Printer
import android.view.Choreographer
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.roundToInt

/**
 Sonde de fluidite de la liste native (equivalent de `HLPerfMonitor.swift`),
 lue dans le journal Android (`adb logcat | grep "\[HL\]"`, via le JS).
 Builds de test seulement (`enabled`) : jamais une installation Play Store.

 Par geste de scroll (doigt pose -> arret de l'elan) : images perdues
 (intervalle > 1,5 x la cadence de l'ecran), accrocs (> 50 ms), pire
 intervalle, cout de configuration des rangees, occupation du fil principal
 (`mainBusy`, messages > 8 ms) et, pour les 3 premiers gestes, le mouvement
 image par image (`motion`) et la chronologie (`events`).
 */
class HLPerfMonitor : Choreographer.FrameCallback {
  var onReport: ((MutableMap<String, Any>) -> Unit)? = null
  /** Position du scroll (dp), relevee a chaque image. */
  var offsetProvider: (() -> Float)? = null
  /** Cadence de l'ecran (Hz), relevee au debut du geste. */
  var refreshRateProvider: (() -> Float)? = null

  private var running = false
  private var start = 0L
  private var last = 0L
  private var expectedNs = 16_666_667L
  private var frames = 0
  private var dropped = 0
  private var hitches = 0
  private var worstNs = 0L
  private var configures = 0
  private var configureTotalNs = 0L
  private var configureMaxNs = 0L
  private val deltas = ArrayList<Float>()
  private var lastOffset: Float? = null
  private var fingerUpFrame = -1
  private val events = ArrayList<List<Any>>()
  /** Rang du geste depuis le lancement : 1 = le premier scroll. */
  private var gesture = 0

  // Occupation du fil principal : duree de chaque message traite par la boucle.
  private var busySince = 0L
  private val busy = ArrayList<List<Double>>()
  private var busyLong = 0
  private var busyMaxNs = 0L
  private val printer = Printer { line ->
    val now = System.nanoTime()
    if (line.startsWith(">")) {
      busySince = now
    } else if (line.startsWith("<") && busySince > 0) {
      val d = now - busySince
      busySince = 0
      busyMaxNs = max(busyMaxNs, d)
      if (d > BUSY_THRESHOLD_NS) {
        busyLong++
        if (busy.size < MAX_BUSY) busy.add(listOf(round1(msFromStart(now - d)), round1(d / 1e6), currentOffset().toDouble()))
      }
    }
  }

  val isRunning: Boolean get() = running

  fun begin() {
    if (!enabled || running) return
    frames = 0
    dropped = 0
    hitches = 0
    worstNs = 0
    configures = 0
    configureTotalNs = 0
    configureMaxNs = 0
    last = 0
    deltas.clear()
    lastOffset = null
    fingerUpFrame = -1
    events.clear()
    busy.clear()
    busyLong = 0
    busyMaxNs = 0
    busySince = 0
    gesture++
    refreshRateProvider?.invoke()?.takeIf { it > 1f }?.let { expectedNs = (1e9 / it).toLong() }
    start = System.nanoTime()
    running = true
    Choreographer.getInstance().postFrameCallback(this)
    Looper.getMainLooper().setMessageLogging(printer)
  }

  override fun doFrame(frameTimeNanos: Long) {
    if (!running) return
    if (last > 0) {
      val dt = frameTimeNanos - last
      frames++
      if (dt > expectedNs * 3 / 2) dropped += max(1, (dt.toDouble() / expectedNs).roundToInt() - 1)
      if (dt > 50_000_000L) hitches++
      worstNs = max(worstNs, dt)
    }
    last = frameTimeNanos
    val offset = currentOffset()
    lastOffset?.let { deltas.add(offset - it) }
    lastOffset = offset
    Choreographer.getInstance().postFrameCallback(this)
  }

  /** Doigt leve avec elan : separe le glissement de la deceleration dans `motion`. */
  fun fingerUp() {
    if (!running) return
    fingerUpFrame = deltas.size
    mark { "up" }
  }

  /** Evenement visible pendant l'un des premiers gestes (libelle construit seulement alors). */
  fun mark(what: () -> String) {
    if (!running || gesture > DETAILED_GESTURES || events.size >= MAX_EVENTS) return
    events.add(listOf(((System.nanoTime() - start) / 1_000_000.0).roundToInt(), what(), currentOffset().roundToInt()))
  }

  fun recordConfigure(ns: Long) {
    if (!running) return
    configures++
    configureTotalNs += ns
    configureMaxNs = max(configureMaxNs, ns)
  }

  fun end(rows: Int) {
    if (!running) return
    running = false
    Choreographer.getInstance().removeFrameCallback(this)
    Looper.getMainLooper().setMessageLogging(null)
    val motion = motionStats()
    val report = mutableMapOf<String, Any>(
      "kind" to "scroll",
      "gesture" to gesture,
      "durationMs" to round1((System.nanoTime() - start) / 1e6),
      "fps" to (1e9 / expectedNs).roundToInt(),
      "frames" to frames,
      "dropped" to dropped,
      "hitches" to hitches,
      "worstMs" to round1(worstNs / 1e6),
      "configures" to configures,
      "configureAvgMs" to if (configures > 0) round1(configureTotalNs / 1e6 / configures) else 0.0,
      "configureMaxMs" to round1(configureMaxNs / 1e6),
      "rows" to rows,
      "offsetY" to currentOffset().roundToInt(),
      "stalls" to motion.first,
      "jumps" to motion.second,
      "mainBusy" to busy.toList(),
      "mainBusyLong" to busyLong,
      "mainBusyMaxMs" to round1(busyMaxNs / 1e6),
    )
    if (motion.third.isNotEmpty()) report["motionAt"] = motion.third
    if (gesture <= DETAILED_GESTURES) {
      report["motion"] = deltas.take(MAX_MOTION).map { it.roundToInt() }
      report["fingerUpFrame"] = fingerUpFrame
      report["events"] = events.toList()
    }
    onReport?.invoke(report)
  }

  private fun currentOffset(): Float = offsetProvider?.invoke() ?: 0f

  private fun msFromStart(t: Long): Double = (t - start) / 1e6

  /**
   Image immobile (< 0,5 dp) alors que le contenu bougeait avant ET apres
   (>= 2 dp) ; saut : plus du double de ses voisines et au moins 12 dp de plus.
   */
  private fun motionStats(): Triple<Int, Int, List<List<Int>>> {
    val m = deltas.map { abs(it) }
    if (m.size < 3) return Triple(0, 0, emptyList())
    val firstMoving = m.indexOfFirst { it >= 2f }.let { if (it < 0) m.size else it }
    val lastMoving = m.indexOfLast { it >= 2f }
    var stalls = 0
    var jumps = 0
    val at = ArrayList<List<Int>>()
    for (i in 1 until m.size - 1) {
      val around = max(m[i - 1], m[i + 1])
      if (m[i] < 0.5f && i > firstMoving && i < lastMoving && around >= 2f) {
        stalls++
        if (at.size < 6) at.add(listOf(i, 0))
      } else if (m[i] > 2 * around && m[i] - around >= 12f) {
        jumps++
        if (at.size < 6) at.add(listOf(i, m[i].roundToInt()))
      }
    }
    return Triple(stalls, jumps, at)
  }

  companion object {
    private const val DETAILED_GESTURES = 3
    private const val MAX_MOTION = 240
    private const val MAX_EVENTS = 40
    private const val MAX_BUSY = 8
    private const val BUSY_THRESHOLD_NS = 8_000_000L

    /** Build de test (debug, APK EAS...) ; jamais une installation Play Store. */
    var enabled = false

    fun detect(context: Context) {
      val debuggable = (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
      val installer = try {
        if (Build.VERSION.SDK_INT >= 30) {
          context.packageManager.getInstallSourceInfo(context.packageName).installingPackageName
        } else {
          @Suppress("DEPRECATION")
          context.packageManager.getInstallerPackageName(context.packageName)
        }
      } catch (e: Exception) {
        null
      }
      enabled = debuggable || installer != "com.android.vending"
    }

    /** Millisecondes entieres depuis `t0` (`System.nanoTime`). */
    fun ms(sinceNs: Long): Int = ((System.nanoTime() - sinceNs) / 1_000_000.0).roundToInt()

    private fun round1(v: Double): Double = (v * 10).roundToInt() / 10.0
  }
}

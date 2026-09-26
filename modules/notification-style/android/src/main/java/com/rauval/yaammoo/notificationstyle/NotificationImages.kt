package com.rauval.yaammoo.notificationstyle

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.BitmapShader
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Shader
import android.net.Uri
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.io.File
import java.io.FileOutputStream
import java.net.HttpURLConnection
import java.net.URL

/** FileProvider dedie aux photos de notification (voir le manifeste du module). */
class NotificationImageProvider : FileProvider()

/**
 * Images d'une notification : telechargement borne (la notification attend),
 * decoupe ronde de l'avatar, partage de la photo avec l'interface systeme.
 */
internal object NotificationImages {
  const val AVATAR_SIDE = 256
  const val PICTURE_SIDE = 1024

  private const val TIMEOUT_MS = 8_000L
  private const val MAX_BYTES = 5 * 1024 * 1024
  private const val FOLDER = "notification_images"
  private const val KEPT_FILES = 10

  /** Image HTTPS reduite a `maxSide` px, ou `null` (erreur, delai, format). */
  suspend fun download(url: String, maxSide: Int): Bitmap? {
    if (!url.startsWith("https://")) return null
    return withTimeoutOrNull(TIMEOUT_MS) {
      withContext(Dispatchers.IO) { runCatching { fetch(url, maxSide) }.getOrNull() }
    }
  }

  private fun fetch(url: String, maxSide: Int): Bitmap? {
    val connection = URL(url).openConnection() as HttpURLConnection
    connection.connectTimeout = 5_000
    connection.readTimeout = 5_000
    try {
      if (connection.responseCode !in 200..299) return null
      if (connection.contentLengthLong > MAX_BYTES) return null
      val bytes = connection.inputStream.use { it.readBytes() }
      return decode(bytes, maxSide)
    } finally {
      connection.disconnect()
    }
  }

  /** Decode sous-echantillonne (une photo de 4000 px ne passe pas en memoire). */
  private fun decode(bytes: ByteArray, maxSide: Int): Bitmap? {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
    val largest = maxOf(bounds.outWidth, bounds.outHeight)
    if (largest <= 0) return null
    var sample = 1
    while (largest / (sample * 2) >= maxSide) sample *= 2
    val bitmap = BitmapFactory.decodeByteArray(
      bytes, 0, bytes.size, BitmapFactory.Options().apply { inSampleSize = sample }
    ) ?: return null
    val side = maxOf(bitmap.width, bitmap.height)
    if (side <= maxSide) return bitmap
    val scale = maxSide.toFloat() / side
    return Bitmap.createScaledBitmap(
      bitmap, (bitmap.width * scale).toInt(), (bitmap.height * scale).toInt(), true
    )
  }

  /** Recadre au centre en carre puis en rond (avatar). */
  fun circle(source: Bitmap): Bitmap {
    val side = minOf(source.width, source.height)
    val left = (source.width - side) / 2f
    val top = (source.height - side) / 2f
    val output = Bitmap.createBitmap(side, side, Bitmap.Config.ARGB_8888)
    val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
      shader = BitmapShader(source, Shader.TileMode.CLAMP, Shader.TileMode.CLAMP).apply {
        setLocalMatrix(android.graphics.Matrix().apply { setTranslate(-left, -top) })
      }
    }
    Canvas(output).drawCircle(side / 2f, side / 2f, side / 2f, paint)
    return output
  }

  /**
   * Photo -> fichier du cache -> URI du FileProvider, lisible par l'interface
   * systeme. Seuls les derniers fichiers sont gardes.
   */
  fun share(context: Context, picture: Bitmap): Uri? = runCatching {
    val folder = File(context.cacheDir, FOLDER).apply { mkdirs() }
    folder.listFiles()
      ?.sortedByDescending { it.lastModified() }
      ?.drop(KEPT_FILES - 1)
      ?.forEach { it.delete() }
    val file = File(folder, "${System.currentTimeMillis()}.jpg")
    FileOutputStream(file).use { picture.compress(Bitmap.CompressFormat.JPEG, 85, it) }
    FileProvider.getUriForFile(context, "${context.packageName}.notificationstyle", file)
  }.getOrNull()
}

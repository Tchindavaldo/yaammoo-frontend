package com.rauval.yaammoo.notificationstyle

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Typeface
import android.net.Uri
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.style.StyleSpan
import androidx.core.app.NotificationCompat
import androidx.core.app.Person
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import expo.modules.notifications.notifications.model.Notification
import expo.modules.notifications.notifications.model.triggers.FirebaseNotificationTrigger
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope

/**
 * Notification « conversation » d'une boutique, comme WhatsApp : logo de la
 * boutique en avatar a gauche, icone de l'app en pastille, nom de la boutique
 * en titre, photo du message (s'il y en a) dans la notification depliee.
 *
 * Declenche par les donnees `senderId` / `senderName` / `senderImageUrl` d'un
 * push FCM en donnees seules (backend : `helpers/shopSender.js`). Android 11+
 * n'affiche une conversation que si la notification pointe un raccourci
 * « long-lived » portant la meme personne : il est publie juste avant.
 */
internal object ConversationStyle {
  private const val SHORTCUT_PREFIX = "shop_"

  /** Notification transformee, ou `null` pour garder celle d'Expo. */
  suspend fun apply(
    context: Context,
    notification: Notification,
    base: android.app.Notification
  ): android.app.Notification? {
    val trigger = notification.notificationRequest.trigger as? FirebaseNotificationTrigger
      ?: return null
    val data = trigger.remoteMessage.data
    val sender = Sender.from(data) ?: return null
    val pictureUrl = data["imageUrl"]?.takeIf { it.isNotBlank() }

    val (avatar, picture) = coroutineScope {
      val avatarJob = async { NotificationImages.download(sender.imageUrl, NotificationImages.AVATAR_SIDE) }
      val pictureJob = async { pictureUrl?.let { NotificationImages.download(it, NotificationImages.PICTURE_SIDE) } }
      avatarJob.await() to pictureJob.await()
    }

    // Logo introuvable : icone de l'app, comme une notification ordinaire.
    if (avatar == null) return picture?.let { bigPicture(context, base, it) }

    val content = notification.notificationRequest.content
    val text = messageText(content.title, content.text, sender.name)
    val icon = IconCompat.createWithBitmap(NotificationImages.circle(avatar))
    val shop = Person.Builder()
      .setName(sender.name)
      .setIcon(icon)
      .setKey("shop:${sender.id}")
      .setImportant(true)
      .build()

    val time = notification.originDate.time
    val style = NotificationCompat.MessagingStyle(Person.Builder().setName("Vous").build())
      .setGroupConversation(false)
    // Photo d'abord, texte en dernier : repliee, la notification montre le
    // dernier message.
    picture?.let { NotificationImages.share(context, it) }?.let { uri: Uri ->
      style.addMessage(
        NotificationCompat.MessagingStyle.Message("Photo", time, shop).setData("image/jpeg", uri)
      )
    }
    style.addMessage(NotificationCompat.MessagingStyle.Message(text, time, shop))

    val builder = NotificationCompat.Builder(context, base)
      .setStyle(style)
      .setContentTitle(sender.name)
      .setContentText(text)
      .setLargeIcon(null as Bitmap?)
      .setCategory(NotificationCompat.CATEGORY_MESSAGE)
    publishShortcut(context, sender, shop, icon)?.let { builder.setShortcutId(it) }
    return builder.build()
  }

  /**
   * Raccourci de conversation de la boutique. Exclu du lanceur (Android 13+) :
   * il ne sert qu'a la notification. Echec : conversation sans raccourci,
   * affichee en message classique avec l'avatar.
   */
  private fun publishShortcut(
    context: Context,
    sender: Sender,
    shop: Person,
    icon: IconCompat
  ): String? = runCatching {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
      ?: return null
    val id = SHORTCUT_PREFIX + sender.id
    val shortcut = ShortcutInfoCompat.Builder(context, id)
      .setShortLabel(sender.name)
      .setLongLived(true)
      .setPerson(shop)
      .setIcon(icon)
      .setIntent(launch.setAction(Intent.ACTION_VIEW))
      .setExcludedFromSurfaces(ShortcutInfoCompat.SURFACE_LAUNCHER)
      .build()
    ShortcutManagerCompat.pushDynamicShortcut(context, shortcut)
    id
  }.getOrNull()

  /** Sans logo mais avec photo : vignette a droite, grande photo depliee. */
  private fun bigPicture(
    context: Context,
    base: android.app.Notification,
    picture: Bitmap
  ): android.app.Notification =
    NotificationCompat.Builder(context, base)
      .setLargeIcon(picture)
      .setStyle(NotificationCompat.BigPictureStyle().bigPicture(picture).bigLargeIcon(null as Bitmap?))
      .build()

  /**
   * Titre en gras sur la premiere ligne, puis le message : le nom de la
   * boutique occupe deja le titre de la notification. Titre vide ou egal au
   * nom de la boutique : le message seul.
   */
  private fun messageText(title: String?, body: String?, senderName: String): CharSequence {
    val head = title?.trim().orEmpty()
    val tail = body?.trim().orEmpty()
    if (head.isEmpty() || head.equals(senderName, ignoreCase = true)) return tail.ifEmpty { head }
    if (tail.isEmpty()) return head
    return SpannableStringBuilder()
      .append(head, StyleSpan(Typeface.BOLD), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
      .append('\n')
      .append(tail)
  }

  /** Boutique expeditrice lue dans les donnees du push. */
  private class Sender(val id: String, val name: String, val imageUrl: String) {
    companion object {
      fun from(data: Map<String, String>): Sender? {
        val name = data["senderName"]?.trim().orEmpty()
        val imageUrl = data["senderImageUrl"]?.trim().orEmpty()
        if (name.isEmpty() || !imageUrl.startsWith("https://")) return null
        val id = data["senderId"]?.trim().orEmpty().ifEmpty { name }
        return Sender(id, name, imageUrl)
      }
    }
  }
}

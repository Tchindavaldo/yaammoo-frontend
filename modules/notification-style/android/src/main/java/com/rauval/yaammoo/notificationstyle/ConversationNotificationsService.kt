package com.rauval.yaammoo.notificationstyle

import android.content.Context
import android.util.Log
import expo.modules.notifications.notifications.model.Notification
import expo.modules.notifications.notifications.model.NotificationBehaviorRecord
import expo.modules.notifications.service.NotificationsService
import expo.modules.notifications.service.delegates.ExpoPresentationDelegate
import expo.modules.notifications.service.interfaces.PresentationDelegate

/**
 * Recepteur des evenements d'expo-notifications (declare dans le manifeste du
 * module, prioritaire sur celui d'Expo). Tout le reste (reception, tap,
 * routage JS) reste celui d'Expo : seule la presentation change.
 */
class ConversationNotificationsService : NotificationsService() {
  override fun getPresentationDelegate(context: Context): PresentationDelegate =
    ConversationPresentationDelegate(context)
}

/**
 * Construit la notification d'Expo, puis la transforme en conversation quand
 * le push vient d'une boutique (voir [ConversationStyle]). Le moindre echec
 * rend la notification d'Expo intacte : une notification n'est jamais perdue.
 */
class ConversationPresentationDelegate(context: Context) : ExpoPresentationDelegate(context) {
  override suspend fun createNotification(
    notification: Notification,
    notificationBehavior: NotificationBehaviorRecord?
  ): android.app.Notification {
    val base = super.createNotification(notification, notificationBehavior)
    return try {
      ConversationStyle.apply(context, notification, base) ?: base
    } catch (error: Throwable) {
      Log.w(TAG, "Style conversation impossible, notification classique", error)
      base
    }
  }

  private companion object {
    const val TAG = "NotificationStyle"
  }
}

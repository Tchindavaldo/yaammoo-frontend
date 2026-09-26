import UIKit
import UserNotifications

/// Notification Service Extension : attache l'image d'une notification push
/// avant son affichage (iOS n'affiche pas d'image sans extension).
///
/// Le backend pose l'URL dans la cle `imageUrl` (APNs) et `mutable-content: 1`,
/// sans quoi iOS n'appelle pas l'extension. Sans image, ou si le telechargement
/// echoue ou depasse le delai, la notification s'affiche telle quelle : une
/// notification de commande ou existante n'est jamais bloquee.
///
/// SOURCE : copie dans ios/NotificationService/ par
/// plugins/withNotificationServiceExtension.js a chaque `expo prebuild`.
/// Modifier CE fichier, jamais la copie dans ios/.
class NotificationService: UNNotificationServiceExtension {
  private let lock = NSLock()
  private var contentHandler: ((UNNotificationContent) -> Void)?
  private var bestAttempt: UNMutableNotificationContent?

  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    self.contentHandler = contentHandler
    guard
      let content = request.content.mutableCopy() as? UNMutableNotificationContent,
      let url = Self.imageURL(in: request.content.userInfo)
    else {
      deliver(request.content)
      return
    }
    bestAttempt = content

    URLSession.shared.downloadTask(with: url) { location, response, _ in
      if let location = location,
        let attachment = Self.attachment(from: location, response: response, url: url)
      {
        content.attachments = [attachment]
      }
      self.deliver(content)
    }.resume()
  }

  /// Delai iOS (~30 s) presque ecoule : on livre le texte, sans l'image.
  override func serviceExtensionTimeWillExpire() {
    if let content = bestAttempt { deliver(content) }
  }

  /// Un seul appel au handler, que le telechargement ou le delai finisse en premier.
  private func deliver(_ content: UNNotificationContent) {
    lock.lock()
    let handler = contentHandler
    contentHandler = nil
    lock.unlock()
    handler?(content)
  }

  /// `imageUrl` (APNs direct), `fcm_options.image` (FCM), ou dans `data` / `body`.
  private static func imageURL(in userInfo: [AnyHashable: Any]) -> URL? {
    let candidates: [Any?] = [
      userInfo["imageUrl"],
      (userInfo["fcm_options"] as? [String: Any])?["image"],
      (userInfo["data"] as? [String: Any])?["imageUrl"],
      (userInfo["body"] as? [String: Any])?["imageUrl"],
    ]
    for candidate in candidates {
      guard let text = candidate as? String, let url = URL(string: text) else { continue }
      if let scheme = url.scheme?.lowercased(), scheme == "https" || scheme == "http" {
        return url
      }
    }
    return nil
  }

  /// Fichier telecharge -> piece jointe. iOS n'accepte que JPEG, PNG et GIF :
  /// un autre format (WebP, HEIC...) est re-encode en JPEG.
  private static func attachment(
    from location: URL, response: URLResponse?, url: URL
  ) -> UNNotificationAttachment? {
    let manager = FileManager.default
    let folder = manager.temporaryDirectory.appendingPathComponent(
      UUID().uuidString, isDirectory: true)
    do {
      try manager.createDirectory(at: folder, withIntermediateDirectories: true)
      if let ext = supportedExtension(mime: response?.mimeType, url: url) {
        let file = folder.appendingPathComponent("image.\(ext)")
        try manager.moveItem(at: location, to: file)
        return try UNNotificationAttachment(identifier: "image", url: file, options: nil)
      }
      guard
        let data = try? Data(contentsOf: location),
        let jpeg = UIImage(data: data)?.jpegData(compressionQuality: 0.9)
      else { return nil }
      let file = folder.appendingPathComponent("image.jpg")
      try jpeg.write(to: file)
      return try UNNotificationAttachment(identifier: "image", url: file, options: nil)
    } catch {
      return nil
    }
  }

  private static func supportedExtension(mime: String?, url: URL) -> String? {
    if let mime = mime?.lowercased() {
      switch mime {
      case "image/jpeg", "image/jpg": return "jpg"
      case "image/png": return "png"
      case "image/gif": return "gif"
      default: if mime.hasPrefix("image/") { return nil }
      }
    }
    let ext = url.pathExtension.lowercased()
    return ["jpg", "jpeg", "png", "gif"].contains(ext) ? ext : nil
  }
}

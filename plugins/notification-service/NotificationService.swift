import Intents
import UIKit
import UserNotifications

/// Notification Service Extension : enrichit une notification push avant son
/// affichage.
///
/// 1. Image (`imageUrl`) : attachee a la notification (iOS n'affiche pas
///    d'image sans extension).
/// 2. Boutique expeditrice (`senderId`, `senderName`, `senderImageUrl`) :
///    notification de COMMUNICATION, comme WhatsApp. Le logo de la boutique
///    devient l'avatar, l'icone de l'app passe en pastille, le nom de la
///    boutique en titre. Exige la capacite « Communication Notifications » et
///    `NSUserActivityTypes = [INSendMessageIntent]` sur l'app (app.json).
///
/// Le backend pose `mutable-content: 1` quand l'un des deux est present, sans
/// quoi iOS n'appelle pas l'extension. Sans logo, telechargement rate, delai
/// depasse ou refus d'iOS : la notification s'affiche telle quelle, avec
/// l'icone de l'app. Une notification n'est jamais bloquee.
///
/// SOURCE : copie dans ios/NotificationService/ par
/// plugins/withNotificationServiceExtension.js a chaque `expo prebuild`.
/// Modifier CE fichier, jamais la copie dans ios/.
class NotificationService: UNNotificationServiceExtension {
  private let lock = NSLock()
  private var contentHandler: ((UNNotificationContent) -> Void)?
  private var bestAttempt: UNMutableNotificationContent?

  /// iOS coupe l'extension vers 30 s : chaque telechargement doit finir avant.
  private static let session: URLSession = {
    let config = URLSessionConfiguration.default
    config.timeoutIntervalForRequest = 12
    config.timeoutIntervalForResource = 20
    return URLSession(configuration: config)
  }()

  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    self.contentHandler = contentHandler
    let userInfo = request.content.userInfo
    let imageURL = Self.imageURL(in: userInfo)
    let sender = ShopSender(userInfo: userInfo)
    guard
      imageURL != nil || sender != nil,
      let content = request.content.mutableCopy() as? UNMutableNotificationContent
    else {
      deliver(request.content)
      return
    }
    bestAttempt = content

    // Image et logo telecharges en parallele.
    let group = DispatchGroup()
    let downloads = Downloads()
    if let url = imageURL {
      group.enter()
      Self.session.downloadTask(with: url) { location, response, _ in
        if let location = location {
          downloads.attachment = Self.attachment(from: location, response: response, url: url)
        }
        group.leave()
      }.resume()
    }
    if let sender = sender {
      group.enter()
      Self.session.dataTask(with: sender.imageURL) { data, _, _ in
        downloads.avatar = data.flatMap(Self.avatarImage)
        group.leave()
      }.resume()
    }

    group.notify(queue: .global(qos: .userInitiated)) {
      if let attachment = downloads.attachment { content.attachments = [attachment] }
      guard let sender = sender, let avatar = downloads.avatar else {
        self.deliver(content)
        return
      }
      self.deliverAsMessage(content, from: sender, avatar: avatar)
    }
  }

  /// Delai iOS presque ecoule : on livre ce qu'on a (texte, et l'image si deja la).
  override func serviceExtensionTimeWillExpire() {
    if let content = bestAttempt { deliver(content) }
  }

  /// Un seul appel au handler, quel que soit le chemin qui finit en premier.
  private func deliver(_ content: UNNotificationContent) {
    lock.lock()
    let handler = contentHandler
    contentHandler = nil
    lock.unlock()
    handler?(content)
  }

  // MARK: - Notification de communication (boutique expeditrice)

  /// Presente la notification comme un message recu de la boutique. iOS affiche
  /// le nom de l'expediteur en titre : le titre d'origine (« Commande prete »)
  /// passe donc en tete du corps pour ne pas etre perdu.
  private func deliverAsMessage(
    _ content: UNMutableNotificationContent, from sender: ShopSender, avatar: INImage
  ) {
    guard let message = content.mutableCopy() as? UNMutableNotificationContent else {
      deliver(content)
      return
    }
    message.body = Self.messageText(title: content.title, body: content.body, senderName: sender.name)
    message.title = sender.name

    let person = INPerson(
      personHandle: INPersonHandle(value: sender.id, type: .unknown),
      nameComponents: nil,
      displayName: sender.name,
      image: avatar,
      contactIdentifier: nil,
      customIdentifier: sender.id
    )
    let intent = INSendMessageIntent(
      recipients: nil,
      outgoingMessageType: .outgoingMessageText,
      content: message.body,
      speakableGroupName: nil,
      conversationIdentifier: "shop-\(sender.id)",
      serviceName: nil,
      sender: person,
      attachments: nil
    )
    intent.setImage(avatar, forParameterNamed: \.sender)

    let interaction = INInteraction(intent: intent, response: nil)
    interaction.direction = .incoming
    interaction.donate { _ in
      // Capacite absente, iOS trop ancien... : notification classique d'origine.
      guard
        let updated = try? message.updating(from: intent),
        let result = updated.mutableCopy() as? UNMutableNotificationContent
      else {
        self.deliver(content)
        return
      }
      if result.attachments.isEmpty { result.attachments = message.attachments }
      self.deliver(result)
    }
  }

  /// Titre en premiere ligne, puis le message. Titre vide ou egal au nom de la
  /// boutique (deja affiche en titre) : le message seul.
  private static func messageText(title: String, body: String, senderName: String) -> String {
    let head = title.trimmingCharacters(in: .whitespacesAndNewlines)
    let tail = body.trimmingCharacters(in: .whitespacesAndNewlines)
    if head.isEmpty || head.caseInsensitiveCompare(senderName) == .orderedSame { return tail }
    if tail.isEmpty { return head }
    return "\(head)\n\(tail)"
  }

  /// Logo -> avatar : reduit a 256 px et re-encode en PNG (le backend peut
  /// servir du WebP, que l'avatar n'accepte pas partout).
  private static func avatarImage(from data: Data) -> INImage? {
    guard let image = UIImage(data: data) else { return nil }
    let side: CGFloat = 256
    let scale = min(1, side / max(image.size.width, image.size.height))
    let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
    let format = UIGraphicsImageRendererFormat.default()
    format.scale = 1
    let resized = UIGraphicsImageRenderer(size: size, format: format).image { _ in
      image.draw(in: CGRect(origin: .zero, size: size))
    }
    return resized.pngData().map { INImage(imageData: $0) }
  }

  // MARK: - Image

  /// `imageUrl` (APNs direct), `fcm_options.image` (FCM), ou dans `data` / `body`.
  private static func imageURL(in userInfo: [AnyHashable: Any]) -> URL? {
    let candidates: [Any?] = [
      userInfo["imageUrl"],
      (userInfo["fcm_options"] as? [String: Any])?["image"],
      (userInfo["data"] as? [String: Any])?["imageUrl"],
      (userInfo["body"] as? [String: Any])?["imageUrl"],
    ]
    for candidate in candidates {
      if let url = webURL(candidate) { return url }
    }
    return nil
  }

  fileprivate static func webURL(_ value: Any?) -> URL? {
    guard let text = value as? String, let url = URL(string: text) else { return nil }
    guard let scheme = url.scheme?.lowercased(), scheme == "https" || scheme == "http" else {
      return nil
    }
    return url
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

/// Boutique expeditrice lue dans le payload (`helpers/shopSender.js` du backend).
private struct ShopSender {
  let id: String
  let name: String
  let imageURL: URL

  init?(userInfo: [AnyHashable: Any]) {
    let name = (userInfo["senderName"] as? String)?
      .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
    guard !name.isEmpty, let url = NotificationService.webURL(userInfo["senderImageUrl"]) else {
      return nil
    }
    let id = (userInfo["senderId"] as? String) ?? ""
    self.id = id.isEmpty ? name : id
    self.name = name
    self.imageURL = url
  }
}

/// Resultats des telechargements, ecrits par leurs callbacks et lus apres le
/// `DispatchGroup` (qui garantit l'ordre).
private final class Downloads {
  var attachment: UNNotificationAttachment?
  var avatar: INImage?
}

# Checklist de tests — yaammoo

Cocher chaque ligne une fois le test validé sur l'app.

## 1. Compte

- [ ] Création de compte (inscription complète)
- [ ] Vérification du numéro de téléphone (OTP)
- [ ] Connexion / déconnexion
- [ ] Reconnexion automatique (token refresh)

## 2. Boutique marchand

- [ ] Création d'une boutique
- [ ] Édition des infos boutique (nom, localisation, délai)
- [ ] Ajout d'un menu / article
- [ ] Édition d'un menu existant
- [ ] Suppression d'un menu
- [ ] Contrôle des stocks (décrément après commande)
- [ ] Stock à zéro : article indisponible côté client

## 3. Commande — Home

- [ ] Passage de commande depuis Home
- [ ] Validation livraison (`validateDelivery`)
- [ ] Validation stock (`validateStock`)
- [ ] Paiement : overlay + numéro de paiement affiché
- [ ] Numéro de paiement différent du numéro de livraison
- [ ] Verdict paiement reçu (succès)
- [ ] Verdict paiement reçu (échec)

## 4. Commande — Panier

- [ ] Ajout au panier
- [ ] Modification quantité / suppression
- [ ] Buy individuel depuis le panier
- [ ] Commandes groupées (même boutique)
- [ ] Paiement panier : overlay + verdict

## 5. Socket.IO

- [ ] Connexion socket au boot
- [ ] Rooms rejointes au login (`app:<appId>`, `user:<userId>`)
- [ ] Réception `payment.settled`
- [ ] Réception `order.status_changed`
- [ ] Reconnexion après coupure WiFi
- [ ] Pas de doublon d'événement après reconnexion

## 6. État des commandes

- [ ] Commande visible en `pendingToBuy`
- [ ] Passage en `pending` après paiement
- [ ] Historique des commandes à jour
- [ ] Rafraîchissement temps réel du statut

## 7. Marchand — gestion des commandes

- [ ] Réception de la commande côté marchand
- [ ] Validation du statut de commande
- [ ] Changement de statut (préparation → prête)
- [ ] Refus / annulation d'une commande
- [ ] Délégation de la commande à un livreur

## 8. Livreur

- [ ] Création d'un compte livreur
- [ ] Réception d'une commande déléguée
- [ ] Acceptation / refus de la course
- [ ] Mise à jour du statut de livraison
- [ ] Commande marquée livrée

## 9. Flyers & bonus

- [ ] Affichage des flyers
- [ ] Récupération d'un flyer / bonus
- [ ] Upload d'une preuve
- [ ] Obtention du bonus après validation
- [ ] Réclamation du bonus
- [ ] Vérification du code bonus (`verifyBonusCode`)
- [ ] Bonus déjà utilisé : rejeté

## 10. Notifications

- [ ] Notification en foreground
- [ ] Notification en background / app fermée
- [ ] Deep-link vers la bonne page depuis la notification
- [ ] Token Expo (Expo Go) et token FCM (dev build)

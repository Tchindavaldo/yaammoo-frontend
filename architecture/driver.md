# Feature — Driver (délégation de commandes)

## Rôle

Un **driver** (livreur) est un utilisateur à qui un fastFood délègue des commandes,
**une par une** (`Commande.driverId`). Il a un onglet dédié (`Livraisons`) où il
retrouve ses commandes assignées, groupées comme la vue "Terminées" du marchand
(Express / créneaux + sous-tabs _En attente_ / _En cours_), avec ses propres composants.

**Actions** : `Lancer` (`delivering`), `Terminer` (`delivered`), voir les détails.
Rôle dérivé de `userData.isDriver` (← `driverId`). Onglet masqué (`href: null`) sinon.

## Délégation (côté marchand)

Le marchand délègue une commande via le `DelegateDriverSheet` (bouton **Lancer** d'une carte
ou **« Lancer tout »** d'un groupe, cf. `orders-merchant.md`) : il choisit **Moi-même**
(→ `delivering`, il livre) ou **un livreur** (→ pose `Commande.driverId`, statut inchangé,
badge « Délégué »). `MerchantContext.delegateOrder(orderId, driverId)` appelle
`merchantService.delegateOrder` (`PUT /order { id, driverId }`) puis patche `driverId` en local.

Côté marchand, le suivi reste complet dans l'onglet « Terminées » (3 sous-tabs) :
**En attente** (`finished`) / **En cours** (`delivering`, vélo) / **Terminé** (`delivered`).

## Arborescence

```
src/features/driver/
├── context/DriverContext.tsx   # orders assignées, updateStatus, upsert socket
├── hooks/useDriver.ts
├── services/driverService.ts   # GET /order/driver/:driverId · PUT /order (+driverId)
└── components/
    ├── DriverOrderPanel.tsx     # clone "Terminées" (groupes + sous-tabs)
    └── DriverOrderCard.tsx      # carte (Lancer / Terminer / détails)
app/(tabs)/driver.tsx           # onglet (TabHeader + DatePill + panel)
```

Provider monté dans `app/_layout.tsx` sous `MerchantProvider`.

## Socket

`useSocketEvents` écoute :

- **Commandes** : `driverOrderAssigned`, `driverOrdersAssigned`, `driverOrderUpdated`.
- **Demandes de livraison** : `driverApplicationCreated` (→ marchand, nouvelle demande),
  `driverApplicationDecided` (→ candidat, accepté/refusé). Payload `{ data: application }`.
  Ces events passent par un **bus** dans `DriverContext`
  (`notifyApplicationEvent` / `register|unregisterApplicationHandler`) ; les modals
  `DriverManageModal` et `DriverMyApplicationsModal` s'y abonnent pendant qu'ils sont
  ouverts et mettent à jour leur liste **sans refetch**.

Refresh au (re)connect. La **relance** d'une demande met à jour le state local (pas de
GET → pas de pull-refresh visible).

## Notifications

Gérées **côté backend** (push existant) : à l'émission des events, le backend envoie aussi
la notification push au destinataire. Le **clic sur le push** ouvre la page Notifications
(défaut) ; dans le détail, **« Voir plus »** route via `getNotificationRoute` puis Settings
ouvre le bon modal (`?section=drivers` ou `?section=my-applications`).

Types de notif (routing dans `notificationRouting.ts`) :

- `driver_application` (→ marchand) → modal Livreurs.
- `driver_application_decided` (→ candidat) → modal Mes demandes.
- `driver_removed` (→ livreur retiré) → modal Mes demandes (`route: settings?section=my-applications`).

> Pas de notif pour les nouvelles commandes déléguées au livreur (non géré pour l'instant).

---

## Multi-boutiques

Un livreur peut servir **plusieurs boutiques**. `driverId` (sur le user) est global ;
c'est `Commande.driverId` qui rattache chaque commande. `GET /order/driver/:driverId`
agrège les commandes de **toutes** ses boutiques.

- **Devenir livreur** : **multi-sélection** de boutiques + un seul envoi (le front
  envoie `fastFoodIds[]`, le backend crée une demande par boutique).
- **Mes livraisons** : **filtre par boutique** (chips en haut) ; le panel filtre sur
  `fastFoodId` via la prop `storeFilter`.

## Devenir livreur (dans Settings)

- **Section user « Livraison »** : si pas livreur → item **« Devenir livreur »**
  (`DriverApplyModal` : liste LOCALE par défaut + recherche SERVEUR debouncée dès la
  saisie, multi-sélection → `POST /driver/apply`). Si `isDriver` → item
  **« Mes livraisons »** (`DriverOrdersModal` : filtre boutique + `DriverOrderPanel`).
- **Section user « Livraison »** : item **« Mes demandes »** (`DriverMyApplicationsModal`)
  — le user voit le statut de ses demandes (en attente / acceptée / refusée) et peut
  **relancer** une demande refusée.
- **Section boutique** : item **« Livreurs »** (`DriverManageModal`) — le marchand
  voit les demandes reçues (accepter/refuser) + ses livreurs assignés. Loader centré
  au 1er chargement ; nom = nom complet, sinon email, sinon « Utilisateur ».

Un user devient livreur quand un marchand **accepte** une de ses demandes (le backend
pose alors `driverId` sur le user).

## Backend à créer

- **`Commande.driverId`** : id du driver assigné (assignation par commande).
- **`POST /driver/apply { userId, fastFoodIds[] }`** : crée une demande `pending` par boutique.
  **Idempotent par `(userId, fastFoodId)`** : s'il existe déjà une demande pour ce couple
  (quel que soit son statut, y compris `refused`), la **repasser à `pending`** (upsert) au
  lieu d'en insérer une seconde. Sinon « Relancer » crée un doublon (une ligne `refused`
  - une `pending` pour le même fastfood).
- **`GET /driver/applications/:fastFoodId`** → `{ data: DriverApplication[] }` (demandes reçues).
- **`GET /driver/list/:fastFoodId`** → `{ data: DriverInfo[] }` (livreurs assignés). Forme **à plat** : `{ uid, driverId, isDriver, infos:{nom,prenom,email,numero} }`.
- **`DELETE /driver/:driverId?fastFoodId=`** : retire le livreur de CETTE boutique (le marchand le supprime de son équipe). Ne garder `driverId` sur le user que s'il sert encore ≥1 boutique.
- **`PUT /driver/applications/:applicationId { decision }`** : `accepted` → pose `driverId` sur le user ; `refused` → clôt la demande.
- **`GET /fastfood/search?q=`** → `{ data: StoreOption[] }` (`{id, nom}`) : recherche boutique par nom (pour « Devenir livreur »).
- **`GET /driver/stores/:driverId`** → `{ data: StoreOption[] }` : boutiques servies par le livreur (filtre « Mes livraisons »).
- **`GET /driver/my-applications/:userId`** → `{ data: DriverApplication[] }` (avec `fastFoodName` + `status`) : demandes envoyées par le user (« Mes demandes »). Relance = re-POST `/driver/apply`.
- **`user.driverId`** : identifie le driver ; `GET /user/:uid` le renvoie (front dérive `isDriver`).
- **Assigner** : le fastFood pose `driverId` sur une commande (endpoint au choix, ex `PUT /order { id, driverId }`).
- **`GET /order/driver/:driverId`** → `{ data: Commande[] }` : commandes assignées à ce driver.
- **`PUT /order { id, status, driverId }`** : vérifier l'assignation ; statuts autorisés `delivering`, `finished` ; émettre `userOrderUpdated`, `fastFoodOrderUpdated`, `driverOrderUpdated`.
- **Events commandes** : `driverOrderAssigned` / `driverOrdersAssigned` (à l'assignation), `driverOrderUpdated` (au changement de statut), émis vers la room du livreur.
- **Events demandes** : `driverApplicationCreated` (→ room du marchand) à la création ; `driverApplicationDecided` (→ room du candidat) à accepté/refusé. Payload `{ data: application }`. **Émettre aussi la notification push** au destinataire dans chaque cas.
- **Event retrait** : `driverRemoved` (→ room `uid` du livreur), payload `{ data: { fastFoodId }, role:{isDriver,driverId} }` + push `type: "driver_removed"` (+ notif BD, `route: "settings?section=my-applications"`). Le front purge les commandes de ce fastFood + patch rôle local.
- **Échos MARCHAND (sync multi-device)** — émis vers la room `uid` du **marchand** (en plus de l'event candidat/livreur), pour que ses autres appareils se synchronisent :
  - `merchantDriverApplicationDecided` payload `{ data: application }` — à chaque accept/refuse.
  - `merchantDriverRemoved` payload `{ data: { driverId } }` — à chaque retrait de livreur.

### Temps réel du rôle (isDriver) — 100 % local, PAS de GET
À réception de `driverApplicationDecided` (accepté) ou `driverRemoved`, le front patche
`userData` **localement** depuis le payload (comme tous les autres sockets de l'app, aucun
refetch) → l'onglet **Livraisons** apparaît/disparaît en direct. **Prérequis backend** : ces
deux events doivent joindre `role: { isDriver, driverId }` = l'état résultant du user
(accepté → `{ isDriver:true, driverId }` ; retiré de la dernière boutique →
`{ isDriver:false, driverId:null }`).

> **Rooms = `userId` brut** (marchand / candidat / livreur), via `join_user` — **pas** de
> préfixe `user:` / `driver:`. C'est la convention existante du projet (le front émet
> `socket.emit("join_user", userData.uid)`). Router les events vers `uid` directement.

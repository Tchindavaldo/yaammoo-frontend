# Architecture — Yaammoo / Y0

Index des fichiers de documentation d'architecture. Chaque fichier décrit la structure d'une feature, ses composants, leurs chemins et leurs responsabilités.

> **Convention** : mettre à jour le fichier concerné dès qu'un composant est modifié. Créer un nouveau fichier si une feature non listée est travaillée.

---

## Index

| Fichier | Feature |
|---|---|
| [checkout.md](./checkout.md) | Bottom sheets de commande (home + panier) |
| [orders-client.md](./orders-client.md) | Commandes côté client (contexte, cartes, tri par rank) |
| [orders-merchant.md](./orders-merchant.md) | Gestion commandes côté marchand (panel, cartes, statuts) |
| [backend-orders.md](./backend-orders.md) | Backend — services commande, rank queue, stock |
| [socket-events.md](./socket-events.md) | Événements socket (liste complète émetteurs → récepteurs) |
| [notifications.md](./notifications.md) | Module notifications (FCM push + Socket, multi-devices, deep-linking) |

---

## Structure racine du projet

```
Y0/
├── yaammoo/          # App React Native (Expo) — client + marchand
│   └── src/
│       ├── features/ # Features isolées (auth, checkout, orders, merchant, restaurants…)
│       ├── types/    # Types TypeScript globaux (Commande, Menu, Livraison…)
│       ├── api/      # Config axios (Config.apiUrl)
│       ├── theme/    # Thème global (Theme.colors…)
│       └── components/ # Composants partagés (Toast…)
├── BACKEND/          # Node.js / Express / Firestore
│   └── src/
│       ├── app.js        # Express app + routes
│       ├── server.js     # HTTP server + Socket.io init
│       ├── socket.js     # getIO() singleton
│       ├── config/       # Firebase, Swagger, Multer
│       ├── routes/       # Déclaration des routes
│       ├── controllers/  # Entrées HTTP (validation basique → service)
│       ├── services/     # Logique métier
│       ├── utils/        # Validators, helpers
│       └── interface/    # Définitions champs Firestore
├── rudafood/         # Ancienne app Angular/Ionic (legacy — ne pas modifier)
└── architecture/     # Ce dossier — documentation d'architecture
```

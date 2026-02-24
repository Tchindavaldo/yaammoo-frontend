# 🔐 Flow Google Authentication - Yaammoo

## 📊 Vue d'ensemble du flux

```
┌─────────────┐
│   User      │
│  clicks     │
│  Google     │
│   icon      │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│  1. GOOGLE SIGN-IN (@react-native-google-signin)            │
│     - Ouvre le sélecteur de compte Google natif             │
│     - Utilisateur choisit son compte                         │
│     - Google renvoie un idToken                              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  2. FIREBASE AUTHENTICATION                                  │
│     - Crée credential avec GoogleAuthProvider                │
│     - signInWithCredential(auth, credential)                 │
│     - Firebase crée/connecte l'utilisateur                   │
│     - Retourne firebaseUser avec uid                         │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  3. VÉRIFICATION BACKEND (GET /user/:uid)                    │
│     - Appel API : getUser(firebaseUser.uid)                  │
│     - Si user existe → Connexion directe ✅                  │
│     - Si user n'existe pas → Passer à l'étape 4              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  4. CRÉATION UTILISATEUR (POST /user)                        │
│     - Extraction nom/prénom depuis displayName               │
│     - Création objet Users avec données Google               │
│     - Appel API : createUser(newUser, uid)                   │
│     - Backend crée le document Firestore                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  5. STOCKAGE LOCAL & NAVIGATION                              │
│     - setUserData(userData) → AuthContext                    │
│     - Sauvegarde dans AsyncStorage                           │
│     - Navigation vers /(tabs)                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Architecture des fichiers

### Frontend (React Native)

```
src/features/auth/
├── services/
│   ├── googleAuthService.ts       ← Logique Google Sign-In
│   ├── userFirestore.ts           ← API calls backend
│   └── authService.ts             ← Auth email/password
├── context/
│   └── AuthContext.tsx            ← État utilisateur global
└── hooks/
    └── useAuth.ts                 ← Hook pour accéder au contexte
```

### Backend (Node.js + Express)

```
src/
├── routes/
│   └── userRoutes.js              ← POST /user, PUT /user/:id, GET /user/:id
├── controllers/user/
│   └── userController.js          ← createUser, updateUser, getOneUserByIdController
└── services/user/
    └── userService.js             ← Logique Firestore (createUser, getUserById)
```

---

## 🔄 Détails du flow

### Étape 1 : Google Sign-In (Frontend)

**Fichier :** `src/features/auth/services/googleAuthService.ts`

```typescript
export async function handleGoogleSignIn(): Promise<GoogleSignInResult> {
  // 1. Vérifie Google Play Services
  await GoogleSignin.hasPlayServices();
  
  // 2. Lance le sélecteur de compte Google
  await GoogleSignin.signIn();
  
  // 3. Récupère l'idToken
  const tokens = await GoogleSignin.getTokens();
  const idToken = tokens.idToken;
  
  // 4. Continue vers Firebase...
}
```

**Ce qui se passe :**
- L'utilisateur voit l'écran natif de sélection de compte Google
- Il sélectionne un compte (ou se connecte)
- Google renvoie un `idToken` qui prouve l'identité de l'utilisateur

---

### Étape 2 : Firebase Authentication (Frontend)

```typescript
// Crée une credential Firebase avec l'idToken Google
const credential = GoogleAuthProvider.credential(idToken);

// Connecte l'utilisateur à Firebase
const userCredential = await signInWithCredential(auth, credential);
const firebaseUser = userCredential.user;
// firebaseUser contient : uid, email, displayName, photoURL, etc.
```

**Ce qui se passe :**
- Firebase vérifie le token Google
- Si valide, Firebase crée/connecte l'utilisateur dans Firebase Auth
- On obtient un `firebaseUser` avec un **UID unique**

---

### Étape 3 : Vérification dans le Backend (Frontend → Backend)

**Fichier :** `src/features/auth/services/userFirestore.ts`

```typescript
// Vérifie si l'utilisateur existe dans notre base de données
const existingUser = await userFirestore.getUser(firebaseUser.uid);

if (existingUser) {
  // ✅ L'utilisateur existe déjà → Connexion directe
  return {
    success: true,
    isNewUser: false,
    userData: existingUser,
  };
}
// ❌ L'utilisateur n'existe pas → Créer le profil
```

**Appel API :**
```
GET http://localhost:5000/user/{uid}
Headers: { 'ngrok-skip-browser-warning': 'true' }
```

**Backend - Route :**
```javascript
// src/routes/userRoutes.js
router.get('/:id', getOneUserByIdController);
```

**Backend - Controller :**
```javascript
// src/controllers/user/userController.js
exports.getOneUserByIdController = async (req, res) => {
  const { id } = req.params;
  const user = await userService.getUserById(id);
  res.status(200).json({ data: user });
};
```

**Backend - Service :**
```javascript
// src/services/user/userService.js
exports.getUserById = async id => {
  const doc = await db.collection('users').doc(id).get();
  if (!doc.exists) throw new Error(`Aucun utilisateur trouvé avec l'ID : ${id}`);
  return { id: doc.id, ...doc.data() };
};
```

---

### Étape 4 : Création de l'utilisateur (Frontend → Backend)

**Si l'utilisateur n'existe pas :**

```typescript
// Extraction des données Google
const displayName = firebaseUser.displayName ?? "";
const nameParts = displayName.trim().split(" ");
const prenom = nameParts[0] ?? "User";
const nom = nameParts.slice(1).join(" ") || prenom;

// Création de l'objet utilisateur
const newUser: Users = new Users(
  new UsersInfos(
    nom,                          // "Doe" extrait de "John Doe"
    prenom,                       // "John"
    0,                            // âge (par défaut)
    0,                            // numéro téléphone (vide pour Google)
    firebaseUser.uid,             // UID Firebase
    firebaseUser.email ?? "",     // email Google
    "",                           // pas de mot de passe (Google Auth)
  ),
  false,                          // isMarchand
  100,                            // statistique (points de départ)
  [],                             // commandes (vide)
  "",                             // fastFoodId (vide)
);

// Création dans le backend
await userFirestore.createUser(newUser, firebaseUser.uid);
```

**Appel API :**
```
POST http://localhost:5000/user
Headers: { 
  'ngrok-skip-browser-warning': 'true',
  'Content-Type': 'application/json'
}
Body: {
  "uid": "firebase_uid_here",
  "infos": {
    "nom": "Doe",
    "prenom": "John",
    "age": 0,
    "numero": 0,
    "uid": "firebase_uid_here",
    "email": "john.doe@gmail.com",
    "password": ""
  },
  "isMarchand": false,
  "statistique": 100,
  "fastFoodId": ""
}
```

**Backend - Route :**
```javascript
// src/routes/userRoutes.js
router.post('', firebaseAuth, createUser);
```

**Backend - Controller :**
```javascript
// src/controllers/user/userController.js
exports.createUser = async (req, res) => {
  const id = await userService.createUser(req.body);
  res.status(201).json({
    id,
    message: 'Utilisateur créé avec succès.',
  });
};
```

**Backend - Service :**
```javascript
// src/services/user/userService.js
exports.createUser = async data => {
  const userId = data.uid || data.id;
  if (userId) {
    // Utilise l'UID Firebase comme ID du document Firestore
    await db.collection('users').doc(userId).set({
      ...data,
      createdAt: new Date().toISOString()
    });
    return userId;
  }
  // Fallback : génère un nouvel ID
  const newUserRef = await db.collection('users').add({
    ...data,
    createdAt: new Date().toISOString()
  });
  return newUserRef.id;
};
```

**Ce qui est sauvegardé dans Firestore :**
```
Collection: users
Document ID: firebase_uid_here
Data: {
  uid: "firebase_uid_here",
  infos: {
    nom: "Doe",
    prenom: "John",
    age: 0,
    numero: 0,
    email: "john.doe@gmail.com",
    password: ""
  },
  isMarchand: false,
  statistique: 100,
  fastFoodId: "",
  createdAt: "2024-02-24T14:30:00.000Z"
}
```

---

### Étape 5 : Stockage local & Navigation

```typescript
// Sauvegarde dans le contexte global
setUserData(userData);

// AuthContext le sauvegarde automatiquement dans AsyncStorage
await storage.set('user_data', userData);

// Navigation vers l'écran principal
router.replace("/(tabs)");
```

---

## 🔄 Comparaison : Google Auth vs Email Auth

| Critère | **Google Auth** | **Email/Password** |
|---------|----------------|-------------------|
| Méthode d'authentification | OAuth 2.0 (Google) | Firebase Email/Password |
| Vérification email | ✅ Automatique (Google vérifié) | ❌ Nécessite `sendEmailVerification()` |
| Mot de passe stocké | ❌ Non (géré par Google) | ✅ Oui (hash Firebase) |
| Téléphone | ❌ Non fourni par défaut | ✅ Demandé à l'inscription |
| Nom/Prénom | ✅ `displayName` de Google | ✅ Demandé à l'inscription |
| Photo profil | ✅ `photoURL` de Google | ❌ Non (à uploader) |
| Création backend | **POST /user** | **POST /user** |
| Structure données | Identique | Identique |

---

## 🔐 Sécurité

### Côté Frontend
- ✅ L'`idToken` Google est vérifié par Firebase
- ✅ Firebase génère un token d'authentification unique
- ✅ Le token Firebase est stocké automatiquement (Firebase SDK)

### Côté Backend
- ✅ Les routes utilisent le middleware `firebaseAuth` (pour POST)
- ✅ Vérifie que le token Firebase est valide
- ✅ Empêche la création d'utilisateurs non authentifiés

**Middleware Firebase Auth :**
```javascript
// src/middlewares/firebaseAuth.js
const admin = require('firebase-admin');

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
```

---

## 🐛 Gestion des erreurs

### Erreurs Google Sign-In

| Code | Signification | Action |
|------|--------------|--------|
| `SIGN_IN_CANCELLED` | Utilisateur a annulé | Message silencieux |
| `IN_PROGRESS` | Déjà en cours | Ignorer |
| `PLAY_SERVICES_NOT_AVAILABLE` | Google Play manquant | Demander mise à jour |

### Erreurs Firebase

| Code | Signification | Action |
|------|--------------|--------|
| `auth/account-exists-with-different-credential` | Email déjà utilisé avec email/password | Proposer connexion email |
| `auth/network-request-failed` | Pas d'internet | Retry |

### Erreurs Backend

| Statut | Signification | Action Frontend |
|--------|--------------|----------------|
| `404` | Utilisateur pas trouvé (GET) | Créer l'utilisateur |
| `201` | Utilisateur créé (POST) | Succès ✅ |
| `500` | Erreur serveur | Afficher erreur générique |

---

## 📝 Logs de débogage

**Frontend :**
```typescript
console.log("🔗 Google idToken:", idToken);
console.log("👤 Firebase User:", firebaseUser.uid, firebaseUser.email);
console.log("📊 Backend Response:", existingUser);
console.log("✅ User created:", newUser);
```

**Backend :**
```javascript
console.log("📥 POST /user - Body:", req.body);
console.log("🔍 GET /user/:id - ID:", req.params.id);
console.log("💾 Firestore saved user:", userId);
```

---

## 🚀 Tests

### Test manuel Google Auth
1. Lance l'app : `npx expo run:android`
2. Clique sur l'icône Google
3. Sélectionne un compte Google
4. Vérifie que tu arrives sur `/(tabs)`
5. Vérifie dans Firestore que le document user est créé

### Test avec un nouvel utilisateur
1. Utilise un compte Google jamais utilisé
2. Vérifie que le profil est créé automatiquement
3. Vérifie que `isNewUser: true` dans les logs

### Test avec un utilisateur existant
1. Utilise un compte Google déjà enregistré
2. Vérifie que `isNewUser: false`
3. Vérifie que les données sont chargées depuis le backend

---

## 📚 Ressources

- [Google Sign-In React Native](https://react-native-google-signin.github.io/docs/)
- [Firebase Auth avec Google](https://firebase.google.com/docs/auth/android/google-signin)
- [API Backend Yaammoo](../BACKEND/README.md)
# 🔐 Configuration Google Authentication - Yaammoo

## 📋 Prérequis

- Projet Firebase : `fir-d75bc`
- Package name Android : `com.yaammoo.app`
- Bundle ID iOS : `com.yaammoo.app`
- URI Scheme : `yaammoo://`

---

## 🔑 SHA-1 Fingerprints

### Debug Keystore (pour développement)
```
SHA-1: FA:BA:B1:46:5C:51:D8:AD:0C:C8:D8:6B:3E:39:D7:D8:30:07:37:4C
SHA-256: 26:27:DE:8C:34:49:C4:D7:55:ED:6A:9E:81:EC:B5:F8:C3:92:9A:B6:38:3A:53:0A:F0:2F:0B:21:C2:92:CF:11
```

---

## 🛠️ Étape 1 : Configuration Firebase Console

### 1.1 Activer Google Sign-In
1. Aller sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionner le projet **fir-d75bc**
3. **Authentication** → **Sign-in method**
4. Cliquer sur **Google** → **Activer**
5. Sauvegarder

### 1.2 Ajouter l'application Android
1. **Project Settings** (⚙️) → **Général**
2. Scroller vers **"Vos applications"**
3. Cliquer sur **"Ajouter une application"** → **Android**
4. Remplir :
   - **Package name** : `com.yaammoo.app`
   - **SHA-1** : `FA:BA:B1:46:5C:51:D8:AD:0C:C8:D8:6B:3E:39:D7:D8:30:07:37:4C`
5. Télécharger **`google-services.json`**
6. Placer à la racine : `Y0/yaammoo/google-services.json`

### 1.3 Ajouter l'application iOS
1. Même écran → **"Ajouter une application"** → **iOS**
2. Remplir :
   - **Bundle ID** : `com.yaammoo.app`
3. Télécharger **`GoogleService-Info.plist`**
4. Placer à la racine : `Y0/yaammoo/GoogleService-Info.plist`

---

## ☁️ Étape 2 : Configuration Google Cloud Console

### 2.1 Accéder aux Credentials
1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionner le projet **fir-d75bc**
3. Menu **APIs & Services** → **Credentials**

### 2.2 Configurer le Web Client ID

**Trouver :** Le client OAuth 2.0 qui finit par `...stii1.apps.googleusercontent.com`

**Client ID actuel :**
```
66450079753-g4cg4o1lhrd31aa7logdjadf030stii1.apps.googleusercontent.com
```

**Actions :**
1. Cliquer sur le nom du client
2. Ajouter dans **"Authorized redirect URIs"** :
   ```
   http://localhost:8081
   ```
   ```
   https://auth.expo.io/@tchindavaldo/yaammoo
   ```

3. Cliquer sur **"Save"**

**Important :** Ces 2 URIs permettent :
- `http://localhost:8081` → Tests dans le navigateur web
- `https://auth.expo.io/@tchindavaldo/yaammoo` → Expo Go avec tunnel (évite les problèmes d'IP)

### 2.3 Vérifier Android Client ID

**Client ID actuel :**
```
66450079753-58mmaomhujv0bfj4pf222qc2dc8n74ds.apps.googleusercontent.com
```

**Vérifier que :**
- **Package name** : `com.yaammoo.app`
- **SHA-1** : `FA:BA:B1:46:5C:51:D8:AD:0C:C8:D8:6B:3E:39:D7:D8:30:07:37:4C`

Si pas bon, **créer un nouveau Android OAuth client ID** :
1. Cliquer sur **"+ CREATE CREDENTIALS"** → **OAuth client ID**
2. Application type : **Android**
3. Name : `Yaammoo Android`
4. Package name : `com.yaammoo.app`
5. SHA-1 : `FA:BA:B1:46:5C:51:D8:AD:0C:C8:D8:6B:3E:39:D7:D8:30:07:37:4C`
6. Copier le nouveau Client ID généré
7. Remplacer dans `src/api/config.ts` → `googleAuth.androidClientId`

### 2.4 Vérifier iOS Client ID

**Client ID actuel :**
```
66450079753-kjsomtcdc5eld27ib06rvq0q3ic3to2q.apps.googleusercontent.com
```

**Vérifier que :**
- **Bundle ID** : `com.yaammoo.app`

Si pas bon, **créer un nouveau iOS OAuth client ID** :
1. Cliquer sur **"+ CREATE CREDENTIALS"** → **OAuth client ID**
2. Application type : **iOS**
3. Name : `Yaammoo iOS`
4. Bundle ID : `com.yaammoo.app`
5. Copier le nouveau Client ID généré
6. Remplacer dans `src/api/config.ts` → `googleAuth.iosClientId`

---

## 📱 Étape 3 : Vérifier la configuration locale

### 3.1 Vérifier `src/api/config.ts`
```typescript
googleAuth: {
  webClientId: "66450079753-g4cg4o1lhrd31aa7logdjadf030stii1.apps.googleusercontent.com",
  androidClientId: "66450079753-58mmaomhujv0bfj4pf222qc2dc8n74ds.apps.googleusercontent.com",
  iosClientId: "66450079753-kjsomtcdc5eld27ib06rvq0q3ic3to2q.apps.googleusercontent.com",
}
```

### 3.2 Vérifier `app.json`
```json
{
  "expo": {
    "scheme": "yaammoo",
    "android": {
      "package": "com.yaammoo.app",
      "googleServicesFile": "./google-services.json"
    },
    "ios": {
      "bundleIdentifier": "com.yaammoo.app",
      "googleServicesFile": "./GoogleService-Info.plist"
    }
  }
}
```

### 3.3 Vérifier les fichiers à la racine
```
Y0/yaammoo/
├── google-services.json          ✅
├── GoogleService-Info.plist      ✅
└── app.json
```

---

## 🧪 Étape 4 : Tester

### 4.1 Installer ngrok globalement (requis pour le tunnel)
```bash
sudo npm install --global @expo/ngrok@^4.1.0
```

### 4.2 Redémarrer le serveur Expo en mode tunnel
```bash
npx expo start --tunnel
```

**Attends 10-30 secondes** que le tunnel se connecte. Tu verras :
```
› Opening tunnel...
› Tunnel ready.
```

### 4.3 Tester l'authentification Google
1. Scanner le QR code avec Expo Go
2. Aller sur la page de login
3. Cliquer sur l'icône Google
4. Le browser devrait s'ouvrir avec l'écran Google
5. Sélectionner un compte Google
6. Revenir dans l'app automatiquement

**Note :** Le mode tunnel est nécessaire car Google refuse les URIs avec adresses IP locales.

---

## 🐛 Troubleshooting

### Erreur : "400: redirect_uri_mismatch"
**Causes possibles :**
1. Les URIs ne sont pas ajoutés dans Google Cloud Console
2. Tu as lancé Expo sans le flag `--tunnel`
3. L'URI avec ton IP locale change (WiFi)

**Solutions :**
1. Vérifie que `http://localhost:8081` ET `https://auth.expo.io/@tchindavaldo/yaammoo` sont dans les Authorized redirect URIs
2. Lance toujours avec : `npx expo start --tunnel`
3. Attends 5-10 minutes après avoir modifié les URIs (cache Google)

### Erreur : "Redirection non valide : l'URI doit contenir un domaine"
**Cause :** Google refuse les URIs avec adresse IP (comme `http://192.168.x.x:8081`)

**Solution :** Utilise le mode tunnel :
```bash
sudo npm install --global @expo/ngrok@^4.1.0
npx expo start --tunnel
```

### Erreur : "400: invalid_request"
**Solutions possibles :**
1. Vérifier que Google Sign-In est activé dans Firebase Console
2. Vérifier que les Client IDs dans `config.ts` sont corrects
3. Attendre 5-10 minutes après avoir modifié les Redirect URIs (cache Google)
4. Vérifier que le scheme `yaammoo` est bien configuré dans `app.json`

### Erreur : "Developer Error"
**Solution :** Le SHA-1 n'est pas correct dans Firebase → Ajouter le SHA-1 debug dans l'app Android (voir Étape 1.2)

### Erreur : "Account exists with different credential"
**Solution :** L'email est déjà utilisé avec une autre méthode (email/password). L'utilisateur doit se connecter avec sa méthode d'origine.

### Le browser ne se ferme pas automatiquement
**Solution :** Vérifier que `WebBrowser.maybeCompleteAuthSession()` est appelé au début de `index.tsx` (déjà fait)

---

## ✅ Checklist finale

- [ ] Google Sign-In activé dans Firebase Console
- [ ] App Android ajoutée dans Firebase avec SHA-1
- [ ] App iOS ajoutée dans Firebase
- [ ] `google-services.json` téléchargé et placé à la racine
- [ ] `GoogleService-Info.plist` téléchargé et placé à la racine
- [ ] URIs `http://localhost:8081` ET `https://auth.expo.io/@tchindavaldo/yaammoo` ajoutés dans Google Cloud Console (Web Client)
- [ ] Package name `com.yaammoo.app` et SHA-1 vérifiés dans Google Cloud Console (Android Client)
- [ ] Bundle ID `com.yaammoo.app` vérifié dans Google Cloud Console (iOS Client)
- [ ] Client IDs corrects dans `src/api/config.ts`
- [ ] `app.json` configuré avec les paths des fichiers Google
- [ ] `@expo/ngrok` installé globalement : `sudo npm install --global @expo/ngrok@^4.1.0`
- [ ] Serveur Expo démarré en mode tunnel : `npx expo start --tunnel`

---

## 📞 Support

Si le problème persiste, vérifie les logs :
```bash
npx expo start
# Puis dans l'app, regarde la console pour les erreurs
```

Les erreurs Google Auth apparaissent généralement avec :
- `Google sign-in error:` dans les logs
- Un Alert avec le message d'erreur dans l'app
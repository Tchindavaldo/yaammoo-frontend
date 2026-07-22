// ─── URL du backend ──────────────────────────────────────────────────────────
// En build release (TestFlight / App Store / prod), __DEV__ vaut false → on force
// TOUJOURS l'URL de prod. Impossible d'envoyer une build prod avec une IP locale.
// En dev (Expo Go / dev build), on utilise PROD_API_URL ou ton IP locale ci-dessous.
const PROD_API_URL = "https://yaammoo-backend.fly.dev";

// URL utilisée UNIQUEMENT en développement. Change-la avec ton IP locale au besoin.
const DEV_API_URL = "http://192.168.1.160:5000";
// Autres IP locales pratiques (décommente celle qui te sert en dev) :
// const DEV_API_URL = "http://192.168.8.101:5000";111
// const DEV_API_URL = "https://yaammoo-backend.fly.dev";
// const DEV_API_URL = "http://172.20.10.4:5000";
// const DEV_API_URL = "http://localhost:5000";

export const Config = {
  // Sélection automatique : prod en release, locale en dev.
  apiUrl: __DEV__ ? DEV_API_URL : PROD_API_URL,

  // ─── Sentry (crash reporting) ──────────────────────────────────────────────
  // Colle ici le DSN de ton projet Sentry (sentry.io → Settings → Client Keys).
  // Tant que c'est vide, Sentry est désactivé et l'app fonctionne normalement.
  // Format attendu : "https://xxxxx@oyyyy.ingest.sentry.io/zzzz"
  sentryDsn:
    "https://88b02bd30a2e3b1e7b6a27c3c1ce8bbc@o4511648708755456.ingest.us.sentry.io/4511648729661440",

  firebaseConfig: {
    apiKey: "AIzaSyCGjhUfAHQncfeUcI0wXpghctQG_O9WCgo",
    authDomain: "yaammoo-d9de1.firebaseapp.com",
    projectId: "yaammoo-d9de1",
    storageBucket: "yaammoo-d9de1.firebasestorage.app",
    messagingSenderId: "136139892705",
    appId: "1:136139892705:web:a871d66dfc423e27a694a0",
    measurementId: "G-XZ9LTZJBQX",
  },

  // ─── Google OAuth Client IDs ───────────────────────────────────────────────
  // À récupérer dans : Google Cloud Console → APIs & Services → Credentials
  // Et dans           : Firebase Console → Authentication → Sign-in method → Google
  //
  // 1. Web Client ID    → Type "Web application"   (utilisé par Expo Go & web)
  // 2. Android Client ID → Type "Android"           (standalone Android)
  // 3. iOS Client ID    → Type "iOS"                (standalone iOS)
  //
  // Après avoir créé les credentials, remplacez les valeurs ci-dessous.
  googleAuth: {
    webClientId:
      "136139892705-3ahf4grc1prt7jtuk5toifjgi7mgt40c.apps.googleusercontent.com",
    androidClientId:
      "136139892705-3s9mp9mbvc39ud3v7hhmu6947v7aepde.apps.googleusercontent.com",
    iosClientId:
      "136139892705-9b71at19ehfjhbte6ou3orj6tq0mbeha.apps.googleusercontent.com",
  },
};

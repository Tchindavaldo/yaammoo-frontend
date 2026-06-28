export const Config = {
  // apiUrl: 'http://54.146.156.89:3001',
  // apiUrl: 'http://192.168.8.103:5000',
  // apiUrl: "http://192.168.8.101:5000",
  // apiUrl: "http://192.168.137.206:5000",
  // apiUrl: "http://192.168.11.37:5000",
  // apiUrl: "http://192.168.1.122:5000",
  // apiUrl: "http://172.20.10.4:5000",
  // apiUrl: "http://localhost:5000",

  apiUrl: "https://yaammoo-backend.fly.dev",

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

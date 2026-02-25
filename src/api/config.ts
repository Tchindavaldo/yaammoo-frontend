export const Config = {
  // apiUrl: 'http://54.146.156.89:3001',
  apiUrl: 'http://192.168.8.100:5000',
  // apiUrl: 'http://192.168.8.101:5000',
  // apiUrl: "http://192.168.137.206:5000",
  // apiUrl: "http://192.168.137.206:5000",
  // apiUrl: "http://192.168.11.37:5000",
  apiUrl: "http://192.168.1.122:5000",
  // apiUrl: "http://localhost:5000",


  firebaseConfig: {
    apiKey: "AIzaSyArtLZYKy-0J7W-60s6QK3SsM7UM1GY2S8",
    authDomain: "fir-d75bc.firebaseapp.com",
    projectId: "fir-d75bc",
    storageBucket: "fir-d75bc.firebasestorage.app",
    messagingSenderId: "66450079753",
    appId: "1:66450079753:web:d206f2d5189fdaa87278d8",
    measurementId: "G-KY914452XL",
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
      "66450079753-g4cg4o1lhrd31aa7logdjadf030stii1.apps.googleusercontent.com",
    androidClientId:
      "66450079753-58mmaomhujv0bfj4pf222qc2dc8n74ds.apps.googleusercontent.com",
    iosClientId:
      "66450079753-kjsomtcdc5eld27ib06rvq0q3ic3to2q.apps.googleusercontent.com",
  },
};

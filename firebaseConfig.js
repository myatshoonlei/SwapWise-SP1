import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { getStorage } from "firebase/storage";


// ✅ Google Sign-In Configuration with Calendar API Access
GoogleSignin.configure({
  webClientId: "63070857564-g8qffvo2cvooi931q8kb7h573gmgm1f4.apps.googleusercontent.com",
  offlineAccess: true,
  scopes: [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events"
  ],
});

// ✅ Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBx6h4kulKGd4zkVLLBF7U_XPyU1i0cBNc",
  authDomain: "swapwise2-4e2b6.firebaseapp.com",
  projectId: "swapwise2-4e2b6",
  storageBucket: "swapwise2-4e2b6.appspot.com",
  messagingSenderId: "63070857564",
  appId: "1:63070857564:web:0a51a48ad845efd976f999",
  measurementId: "G-SY39RE3TEP",
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
const storage = getStorage(app, "gs://swapwise2-4e2b6.firebasestorage.app");



export { app,auth, db, googleProvider, GoogleSignin,storage };
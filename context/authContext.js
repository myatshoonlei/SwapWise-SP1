import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";



export const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsAuthenticated(true);
        setUser(user);

        // Fetch user data from Firestore if exists
        const userDocRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUser({ ...user, ...userData }); // Merge Firestore data with auth user data
        }
      } else {
        setIsAuthenticated(false);
        setUser(null);
      }
    });

    return unsub;
  }, []);

  const loginUser = async (email, password) => {
    try {
      // Sign in user using email and password
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
  
      // Now check if the user exists in the Firestore database
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);
  
      if (!userSnap.exists()) {
        // If no user data exists, you can handle this by creating a default user or returning an error
        return { success: false, msg: "User data not found in the database" };
      }
  
      // If user exists, return success and user data
      return { success: true, user: userSnap.data() };
    } catch (e) {
      let msg = e.message;
      if (msg.includes("auth/invalid-email")) msg = "Invalid Email";
      if (msg.includes("auth/user-not-found")) msg = "No user found with this email";
      if (msg.includes("auth/wrong-password")) msg = "Incorrect password";
      return { success: false, msg };
    }
  };

  const registerUser = async (email, password, name) => {
    try {
      // Create user with email and password
      const response = await createUserWithEmailAndPassword(auth, email, password);
      const user = response.user;

      // Create a user document in Firestore after registration
      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        email: email,
        name: name,
        photoURL: user.photoURL || "", // Include photoURL if available
        createdAt: new Date().toISOString(),
        userId: user.uid,
      });

      console.log("Firestore document created for user:", user.uid); // Debug log
      return { success: true, data: user };
    } catch (e) {
      console.error("Registration error:", e.message); // Debug log
      let msg = e.message;
      if (msg.includes("auth/invalid-email")) msg = "Invalid Email";
      if (msg.includes("auth/email-already-in-use")) msg = "Email already in use";
      return { success: false, msg };
    }
  };

  const registerUserWithGoogle = async (googleCredential) => {
    try {
      // Sign in with Google credentials
      const userCredential = await auth().signInWithCredential(googleCredential);
      const user = userCredential.user;

      // Check if user exists in Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        // If not found, create a new user document in Firestore
        await setDoc(userDocRef, {
          email: user.email,
          name: user.displayName,
          photoURL: user.photoURL || "", // Include photoURL from Google
          createdAt: new Date().toISOString(),
          userId: user.uid,
        });
      }

      return { success: true, data: user };
    } catch (e) {
      console.error("Google Sign-In error:", e.message);
      return { success: false, msg: e.message };
    }
  };

  const logoutUser = async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (e) {
      return { success: false, msg: e.message, error: e };
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loginUser, registerUser, registerUserWithGoogle, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be wrapped inside AuthContext");
  }
  return value;
};
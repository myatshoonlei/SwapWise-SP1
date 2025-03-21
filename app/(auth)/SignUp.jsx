import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { registerForPushNotifications } from "../../utils/NotificationService";
import "expo-dev-client";
import { GoogleSignin, GoogleSigninButton } from "@react-native-google-signin/google-signin";
import { getAuth, signInWithCredential,createUserWithEmailAndPassword, GoogleAuthProvider } from "firebase/auth"; // Use Firebase's modular SDK
import { useAuth } from "../../context/authContext"; // Import Auth Context
import CustomKeyboardView from "../../components/CustomKeyboardView"; // Handles keyboard inputs better
import { setDoc, getDoc, doc } from "firebase/firestore"; // Use Firestore methods from the modular SDK
import { db } from "../../firebaseConfig"; // Import Firebase services
import { usePushNotification } from "../../utils/usePushNotification";

export default function SignUp() {
  const router = useRouter();
  const { registerUser } = useAuth(); // Get register function from Auth Context
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(""); // User's full name
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const { expoPushToken, notification } = usePushNotification();

    // ✅ Ensure token is logged when updated
    useEffect(() => {
      if (expoPushToken) {
        console.log(`✅ Token Updated: ${expoPushToken}`);
      }
    }, [expoPushToken]);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: "63070857564-g8qffvo2cvooi931q8kb7h573gmgm1f4.apps.googleusercontent.com",
    });
  }, []);

  const onAuthStateChanged = (user) => {
    setUser(user);
    if (initializing) setInitializing(false);
    if (user) {

      router.push("/(tabs)/Home");
    }
  };

  useEffect(() => {
    const subscriber = getAuth().onAuthStateChanged(onAuthStateChanged);
    return subscriber; // Unsubscribe on unmount
  }, []);

  const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    return passwordRegex.test(password);
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignUp = async () => {
    if (!email || !password || !name) {
      Alert.alert("Register Failed", "Please fill all the fields.");
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    if (!validatePassword(password)) {
      Alert.alert("Weak Password", "Password must be at least 6 characters long and include a mix of letters, numbers, and special characters.");
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(getAuth(), email, password);
      const user = userCredential.user;

      const pushToken = expoPushToken;

      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        email: user.email,
        name: name,
        createdAt: new Date().toISOString(),
        userId: user.uid,
        expoPushToken: pushToken || "",
      });

      console.log("Registration successful, navigating to ProfileSetup");
      router.push("/(onboarding)/ProfileSetup");
    } catch (error) {
      setLoading(false);
      Alert.alert("Registration Failed", error.message);
    }
  };



  const onGoogleButtonPress = async () => {
    try {
      // Reset Google Sign-In state
      await GoogleSignin.signOut();

      // Check for Play Services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Sign in with Google
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken || signInResult.idToken;

      if (!idToken) throw new Error("No ID token found");

      // Create Firebase credential with the Google ID token
      const googleCredential = GoogleAuthProvider.credential(idToken);

      // Sign in to Firebase with the Google credential
      const userCredential = await signInWithCredential(getAuth(), googleCredential);
      const user = userCredential.user;

      const pushToken = expoPushToken;  // Now it's correctly using the hook's token


      // Store the user's data in Firestore if not already done
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        await setDoc(userDocRef, {
          email: user.email,
          name: user.displayName,
          createdAt: new Date().toISOString(),
          userId: user.uid,
          profilePicture: user.photoURL || "https://via.placeholder.com/150",
          expoPushToken: pushToken || "",
        });
      }
      console.log(`✅ Token after sign-in: ${expoPushToken ?? "Waiting for token..."}`);

      router.push("/(onboarding)/ProfileSetup");
    } catch (error) {
      console.error("Google Sign-In error:", error);
      Alert.alert("Google Sign-In Failed", error.message);
    }
  };

  const signOut = async () => {
    try {
      await GoogleSignin.signOut(); // Sign out from Google
      await getAuth().signOut(); // Sign out from Firebase
      setUser(null); // Clear the user state
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  if (initializing) return null;

  return (
    <CustomKeyboardView className="flex-1">
      <View style={styles.container}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image source={require("../../assets/logo.png")} style={styles.logo} />
          <Text style={styles.title}>SwapWise</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#8A8A8A"
            value={name}
            onChangeText={(text) => setName(text)}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#8A8A8A"
            value={email}
            onChangeText={(text) => setEmail(text)}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor="#8A8A8A"
              value={password}
              onChangeText={(text) => setPassword(text)}
              secureTextEntry={!showPassword} // ✅ Toggle visibility
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? "eye" : "eye-off"} size={24} color="#8A8A8A" />
            </TouchableOpacity>
          </View>

          {/* Register Button */}
          <TouchableOpacity
            style={styles.button}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Register</Text>
            )}
          </TouchableOpacity>

          {/* Google Sign-In */}
          <GoogleSigninButton
            style={{ width: 192, height: 48, marginTop: 15 }}
            size={GoogleSigninButton.Size.Wide}
            color={GoogleSigninButton.Color.Light}
            onPress={onGoogleButtonPress}
          />

          {/* Already have an account? */}
          <Text style={styles.footerText}>
            Already have an account?{" "}
            <Text style={styles.footerLink} onPress={() => router.push("/(auth)/LogIn")}>
              Log In
            </Text>
          </Text>
        </View>

        <StatusBar style="auto" />
      </View>
    </CustomKeyboardView>
  );
}

// Styling
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E1E84",
  },
  form: {
    width: "100%",
    alignItems: "center",
  },
  input: {
    width: "100%",
    height: 50,
    backgroundColor: "#F5F5F5",
    borderRadius: 25,
    paddingHorizontal: 15,
    color: "#000000",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  button: {
    width: "100%",
    height: 50,
    backgroundColor: "#1E1E84",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  footerText: {
    color: "#8A8A8A",
    marginTop: 20,
    fontSize: 14,
  },
  footerLink: {
    color: "#1E1E84",
    fontWeight: "bold",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    height: 50, // ✅ Ensure it matches input height
    backgroundColor: "#F5F5F5",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 15,
    paddingHorizontal: 15,
  },
  passwordInput: {
    flex: 1, // ✅ Allows input to take full width inside the container
    height: "100%", // ✅ Matches the container height
    color: "#000000",
  },
  eyeButton: {
    position: "absolute",
    right: 15, // ✅ Aligns the button inside the input
    padding: 10,
  },
passwordContainer: {
  flexDirection: "row",
  alignItems: "center",
  width: "100%",
  height: 50, // ✅ Ensure it matches input height
  backgroundColor: "#F5F5F5",
  borderRadius: 25,
  borderWidth: 1,
  borderColor: "#E0E0E0",
  marginBottom: 15,
  paddingHorizontal: 15,
},
passwordInput: {
  flex: 1, // ✅ Allows input to take full width inside the container
  height: "100%", // ✅ Matches the container height
  color: "#000000",
},
eyeButton: {
  position: "absolute",
  right: 15, // ✅ Aligns the button inside the input
  padding: 10,
},

});
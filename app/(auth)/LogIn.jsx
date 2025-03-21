import React, { useState, useEffect } from "react";
import {
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/authContext";
import CustomKeyboardView from "../../components/CustomKeyboardView";
import { GoogleSignin, GoogleSigninButton } from "@react-native-google-signin/google-signin";
import { getAuth, signInWithCredential, GoogleAuthProvider } from "firebase/auth";
import { getApp } from "firebase/app";

// ✅ Import usePushNotification Hook
import { usePushNotification } from "../../utils/usePushNotification";

export default function LogInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { loginUser } = useAuth();
  const auth = getAuth(getApp());

  // ✅ Call usePushNotification Hook
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

  const onAuthStateChanged = async (user) => {
    setUser(user);
    if (initializing) setInitializing(false);

    if (user) {
      console.log(`✅ Token on login: ${expoPushToken ?? "Waiting for token..."}`);
      router.push("/(tabs)/Home");
    }
  };

  useEffect(() => {
    const subscriber = auth.onAuthStateChanged(onAuthStateChanged);
    return subscriber;
  }, []);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert("Login Failed", "Please fill all the fields.");
      return;
    }

    setLoading(true);
    const response = await loginUser(email, password);
    setLoading(false);

    if (!response.success) {
      Alert.alert("Login Failed", response.msg);
    } else {
      console.log(`✅ Token after sign-in: ${expoPushToken ?? "Waiting for token..."}`);
      router.push("/(tabs)/Home");
    }
  };

  const onGoogleButtonPress = async () => {
    try {
      await GoogleSignin.signOut();
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken || signInResult.idToken;
      if (!idToken) throw new Error("No ID token found");

      const googleCredential = GoogleAuthProvider.credential(idToken);
      const userCredential = await signInWithCredential(getAuth(), googleCredential);
      const user = userCredential.user;

      console.log(`✅ Token after Google Sign-In: ${expoPushToken ?? "Waiting for token..."}`);
      router.push("/(tabs)/Home");

    } catch (error) {
      console.error("Google Sign-In error:", error);
      Alert.alert("Google Sign-In Failed", error.message);
    }
  };

  if (initializing) return null;

  return (
    <CustomKeyboardView className="flex-1">
      <View style={styles.container}>
        <View style={styles.logoContainer}>
          <Image source={require("../../assets/logo.png")} style={styles.logo} />
          <Text style={styles.title}>SwapWise</Text>
        </View>

        <View style={styles.form}>
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
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
              <Ionicons name={showPassword ? "eye" : "eye-off"} size={24} color="#8A8A8A" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.button}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log In</Text>}
          </TouchableOpacity>

          {/* Google Sign-In Button */}
          <GoogleSigninButton
            style={{ width: 192, height: 48, marginTop: 15 }}
            size={GoogleSigninButton.Size.Wide}
            color={GoogleSigninButton.Color.Light}
            onPress={onGoogleButtonPress}
          />

          <Text style={styles.footerText}>
            Don't have an account?{" "}
            <Text style={styles.footerLink} onPress={() => router.push("/(auth)/SignUp")}>
              Sign Up
            </Text>
          </Text>
        </View>
      </View>
    </CustomKeyboardView>
  );
}

// Styles
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
    backgroundColor: "#F5F5F5",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 15,
    paddingRight: 15,
  },
  passwordInput: {
    flex: 1, // ✅ This ensures the input field takes the full width
    height: 50,
    paddingHorizontal: 15,
    color: "#000000",
  },
  eyeButton: {
    padding: 10, // ✅ This prevents the button from overlapping the input
  },

});

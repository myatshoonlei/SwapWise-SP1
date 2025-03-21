import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { FontAwesome } from "@expo/vector-icons";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/logo.png")} // Adjusted relative path for assets
          style={styles.logo}
        />
        <Text style={styles.title}>SwapWise</Text>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <Text style={styles.subtitle}>
        Swap Your Skills, Expand Your Knowledge
        </Text>
        <Text style={styles.description}>
          Empowering Connections Through Knowledge Exchange.
        </Text>
      </View>

      {/* Buttons */}
      <TouchableOpacity
        style={styles.emailButton}
        onPress={() => router.push("/(auth)/SignUp")}
      >
        <Text style={styles.emailButtonText}>Get Started</Text>
      </TouchableOpacity>

      {/* Social Icons */}
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF", // Light background
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E1E84",
  },
  contentContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  subtitle: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#1E1E84",
    textAlign: "center",
  },
  description: {
    fontSize: 12,
    color: "#8A8A8A",
    textAlign: "center",
    marginTop: 10,
  },
  emailButton: {
    width: "100%",
    height: 50,
    backgroundColor: "#1E1E84",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  socialIcons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "50%",
  },
  iconButton: {
    width: 50,
    height: 50,
    backgroundColor: "#fff",
    borderColor: "#1e1e84",
    borderWidth: 1,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
});

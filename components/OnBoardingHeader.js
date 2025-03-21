import { View, Text, Platform } from "react-native";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ios = Platform.OS === "ios";

export default function OnboardingHeader() {
  const { top } = useSafeAreaInsets();

  return (
    <View
      style={{
        paddingTop: top + (ios ? 0 : 0), // Increase padding slightly only on Android
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 1,
        borderBottomColor: "#E0E0E0",
        paddingBottom: 10,
      }}
    >
      {/* Left - App Name */}
      <Text style={{ fontSize: 26, fontWeight: "bold", color: "#1E1E84" }}>
        SwapWise
      </Text>
    </View>
  );
}
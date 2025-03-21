import { View, Text, Platform, TouchableOpacity, Image } from "react-native";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/authContext";
import { useRouter } from "expo-router";

const ios = Platform.OS === "ios";

export default function HomeHeader() {
  const { top } = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();

  const openNoti = () => {
    router.push("/Notifications");
  };


  return (
    <View
      style={{
        paddingTop: ios ? top + 10 : 15, // Adjusted for iOS safe area
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

      {/* Right - Notification + Profile */}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {/* Notification Bell */}
        <TouchableOpacity onPress={openNoti} style={{ marginRight: 15 }}>
          <MaterialCommunityIcons name="bell-ring-outline" size={26} color="black" />
        </TouchableOpacity>


      </View>
    </View>
  );
}

const styles = {
  profileButton: {
    backgroundColor: "#F5F5F5",
    padding: 5,
    borderRadius: 50,
    overflow: "hidden",
  },
  profileImage: {
    width: 35,
    height: 35,
    borderRadius: 50,
  },
};

export const Divider = () => {
  return <View className="p-px w-full bg-neutral-400" />;
};
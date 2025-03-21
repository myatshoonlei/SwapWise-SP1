import { View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { Stack, useRouter } from "expo-router";
import { Entypo } from "@expo/vector-icons";

export default function NotiHeader() {
  const router = useRouter(); // ✅ Use router instead of navigation

  return (
    <Stack.Screen
      options={{
        title: "",
        headerShadowVisible: true,
        headerLeft: () => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <TouchableOpacity onPress={() => router.push("/(tabs)/Home")} style={{ marginRight: 4 }}>
              <Entypo name="chevron-left" size={26} color="#000" />
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: "#1E1E84" }}>
              Notifications
            </Text>
          </View>
        ),
      }}
    />
  );
}

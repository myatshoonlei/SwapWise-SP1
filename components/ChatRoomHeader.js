import { View, Text, TouchableOpacity } from "react-native";
import React from "react";
import { Stack } from "expo-router";
import { Entypo } from "@expo/vector-icons";

export default function ChatRoomHeader({ userName, navigation }) {
  return (
    <Stack.Screen
      options={{
        title: "",
        headerShadowVisible: true,
        headerLeft: () => (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 4 }}>
              <Entypo name="chevron-left" size={26} color="#000" />
            </TouchableOpacity>
            <Text style={{ fontSize: 20, fontWeight: "500", color: "#000" }}>Chat with</Text>
            <Text style={{ fontSize: 20, fontWeight: "bold", color: "#1E40AF" }}>
              {userName || "Loading..."}
            </Text>
          </View>
        ),
      }}
    />
  );
}

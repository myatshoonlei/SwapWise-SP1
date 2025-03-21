import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import React, { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export default function NotiCard({ type, data }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const defaultProfile = require("../assets/default-profile.png");

  useEffect(() => {
    if (type === "match" && data?.userId) {
      const fetchUser = async () => {
        try {
          const userRef = doc(db, "users", data.userId);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            setUser(userDoc.data());
          }
        } catch (error) {
          console.error("Error fetching match user:", error);
        }
      };
      fetchUser();
    }
  }, [type, data?.userId]);

  const handlePress = () => {
    if (type === "match") {
      router.push({
        pathname: "/ChatRoom",
        params: { userId: data?.userId, userName: user?.name },
      });
    } else if (type === "meeting") {
      router.push({
        pathname: "/MeetingDetails",
        params: { meetingId: data?.meetingId },
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {type === "match" ? "Congratulations!" : "📅 Meeting Invitation"}
        </Text>
        <Text style={styles.description}>
          {type === "match"
            ? `You & ${user?.username || "Someone"} matched. Start chatting!`
            : `You've been invited to "${data?.subject || "a meeting"}".`}
        </Text>
        <TouchableOpacity style={styles.button} onPress={handlePress}>
          <Text style={styles.buttonText}>
            {type === "match" ? "Message" : "Click to Respond"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Profile Picture only for Matches */}
      {type === "match" && (
        <Image
          source={user?.profilePicture ? { uri: user.profilePicture } : defaultProfile}
          style={styles.image}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 15,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1E1E84",
    marginBottom: 5,
  },
  description: {
    fontSize: 14,
    color: "#6b7280",
  },
  button: {
    backgroundColor: "#1E1E84",
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "bold",
  },
  image: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
});

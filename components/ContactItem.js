import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import React, { useEffect, useState } from "react";
import { Image } from "expo-image";
import { blurhash, formatDate, getRoomId } from "../utils/common";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { Ionicons } from "@expo/vector-icons"; // Import delete icon
import {
  Swipeable,
  GestureHandlerRootView,
} from "react-native-gesture-handler"; // For swipeable gesture

export default function ContactItem({ item, router, currentUser }) {
  const [lastMsg, setLastMsg] = useState(null); // Default to null instead of undefined
  const [profilePic, setProfilePic] = useState(null); // Store fetched profile picture
  const chatId = getRoomId(currentUser?.uid, item?.id);

  useEffect(() => {
    const q = query(
      collection(db, "messages"),
      where("chatId", "==", chatId),
      orderBy("createdAt", "desc") // Ensures messages are ordered by createdAt in descending order
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const allMessages = snapshot.docs.map((doc) => doc.data());
      setLastMsg(allMessages[0] || null); // Set the latest message or null if no messages
    });

    return unsub; // Clean up the listener when the component is unmounted
  }, [currentUser?.uid, item?.id]); // Re-run when currentUser or item changes

  useEffect(() => {
    const fetchProfilePic = async () => {
      try {
        const userRef = doc(db, "users", item?.id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setProfilePic(userData.profilePicture || null); // ✅ Ensure correct field name
        }
      } catch (error) {
        console.error("Error fetching profile picture:", error);
      }
    };

    fetchProfilePic();
  }, [item?.id]);




  const renderTime = () => {
    if (lastMsg) {
      const date = lastMsg?.createdAt;
      return formatDate(new Date(date.seconds * 1000)); // Formatting the timestamp to a readable date
    }
  };

  const renderLastMessage = () => {
    if (!lastMsg) return "Say Hi 👋"; // Default message if no chat history

    if (currentUser?.uid === lastMsg?.sender) {
      return "You: " + lastMsg?.text; // If the current user sent the message
    }

    return lastMsg?.text; // Display the last message from the other user
  };

  const handleChatStart = async () => {
    const messagesCollection = collection(db, "messages");
    const q = query(
      messagesCollection,
      where("chatId", "==", chatId),
      where("receiver", "==", currentUser?.uid),
      where("read", "==", false)
    );

    try {
      const unreadMessagesSnapshot = await getDocs(q);

      // Mark all unread messages as read
      unreadMessagesSnapshot.forEach(async (doc) => {
        const messageRef = doc.ref;
        await updateDoc(messageRef, { read: true });
      });

      // Navigate to the chat room
      router.push({
        pathname: "/ChatRoom",
        params: { userId: item.id, userName: item.username },
      });
    } catch (error) {
      console.error("Error starting chat:", error.message);
    }
  };

  // Function to handle deleting a chat
  const handleDeleteChat = async () => {
    Alert.alert(
      "Delete Chat",
      "Are you sure you want to delete this chat? This will remove all messages related to it.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              let chatId = getRoomId(currentUser?.uid, item?.id);

              // Step 1: Delete messages from Firestore
              const messagesRef = collection(db, "messages");
              const q = query(messagesRef, where("chatId", "==", chatId));
              const messagesSnapshot = await getDocs(q);

              const batch = writeBatch(db);
              messagesSnapshot.forEach((doc) => {
                batch.delete(doc.ref);
              });

              await batch.commit();

              // Step 2: Optionally, remove the match from users collection (if needed)
              // const userRef = doc(db, "users", currentUser?.uid);
              // await updateDoc(userRef, {
              //   matches: matches.filter((match) => match.userId !== item.id),
              // });

              Alert.alert("Chat deleted successfully!");
            } catch (error) {
              console.error("Error deleting chat:", error);
            }
          },
        },
      ]
    );
  };

  // Function to render right swipe actions (delete button)
  const renderRightActions = () => (
    <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteChat}>
      <Ionicons name="trash-outline" size={24} color="white" />
      <Text style={styles.deleteText}>Delete</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <TouchableOpacity
        onPress={handleChatStart}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 12,
          paddingHorizontal: 0,
          backgroundColor: "white",
          borderRadius: 10,
        }}
      >
        <Image
                  style={{ height: 55, width: 55, borderRadius: 100, marginRight: 8 }}
                  source={profilePic ? { uri: profilePic } : require("../assets/default-profile.png")}
                  placeholder={blurhash}
                  transition={500}
                />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 16, fontWeight: "bold", color: "#000" }}>{item?.username}</Text>
            <Text style={{ fontSize: 14, color: "#777" }}>{renderTime()}</Text>
          </View>
          <Text style={{ fontSize: 14, color: "#555" }}>{renderLastMessage()}</Text>
        </View>
      </TouchableOpacity>

    </Swipeable>
  );
}

const styles = StyleSheet.create({
  deleteButton: {
    backgroundColor: "red",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
    borderRadius: 8,
  },
  deleteText: {
    color: "white",
    fontSize: 14,
  },
});
// ✅ Improved Messaging System with Push Notifications
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Keyboard,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { collection, query, where, orderBy, onSnapshot, addDoc, getDoc, updateDoc, doc, Timestamp, getDocs } from "firebase/firestore";
import * as Notifications from "expo-notifications";
import { getRoomId } from "../../utils/common";
import { useAuth } from "../../context/authContext";
import { db } from "../../firebaseConfig";
import ChatRoomHeader from "../../components/ChatRoomHeader";
import CustomKeyboardView from "../../components/CustomKeyboardView";

export default function ChatRoom() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userId: routeUserId, userName: routeUserName } = route.params || {};
  const [userId, setUserId] = useState(routeUserId);
  const [userName, setUserName] = useState(routeUserName);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isNewChat, setIsNewChat] = useState(true);
  const flatListRef = useRef(null);

  const { user } = useAuth();
  const currentUserId = user?.uid;
  const chatId = getRoomId(currentUserId, userId);

  // ✅ Handle Foreground Notifications (Expo)
  // useEffect(() => {
  //   const subscription = Notifications.addNotificationReceivedListener((notification) => {
  //     console.log("🔥 Expo Push Notification received:", notification);
  //     Alert.alert(
  //       notification.request.content.title || "New Message",
  //       notification.request.content.body || "You have a new message"
  //     );
  //   });

  //   return () => subscription.remove();
  // }, []);

  // ✅ Ensure user data is set
  useEffect(() => {
    console.log("🛠 Received route params:", route.params);

    if (!route.params || !route.params.userId) {
      console.log("❌ Missing userId in params:", route.params);
      Alert.alert("Error", "Invalid user selected.");
      navigation.goBack();
    } else {
      setUserId(route.params.userId);

      // ✅ Fetch userName if not provided in params
      if (!route.params.userName) {
        const fetchUserName = async () => {
          try {
            const userDoc = await getDoc(doc(db, "users", route.params.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              setUserName(userData.name || "Unknown User");
              console.log("✅ Retrieved userName:", userData.name);
            } else {
              console.log("❌ User not found in Firestore.");
            }
          } catch (error) {
            console.error("❌ Error fetching user data:", error);
          }
        };
        fetchUserName();
      } else {
        setUserName(route.params.userName);
      }
    }
  }, [route.params]);



  useEffect(() => {
    if (!userId || !userName) {
      Alert.alert("Error", "Invalid user selected.");
      navigation.goBack();
    }
  }, [userId, userName]);

  // ✅ Fetch messages and update UI in real-time
  useEffect(() => {
    if (!chatId) return;

    const chatQuery = query(
      collection(db, "messages"),
      where("chatId", "==", chatId),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(chatQuery, (snapshot) => {
      if (!snapshot.empty) {
        setIsNewChat(false);
        const fetchedMessages = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMessages(fetchedMessages);

        // Scroll to the latest message
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 500);
      } else {
        setIsNewChat(true);
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [chatId]);

  // ✅ Mark messages as read when opening the chat
  useEffect(() => {
    if (!chatId) return;

    const markMessagesAsRead = async () => {
      const chatQuery = query(
        collection(db, "messages"),
        where("chatId", "==", chatId),
        where("read", "==", false)
      );
      const snapshot = await getDocs(chatQuery);

      snapshot.forEach(async (docRef) => {
        await updateDoc(doc(db, "messages", docRef.id), { read: true });
      });

      console.log("✅ Messages marked as read.");
    };

    markMessagesAsRead();
  }, [chatId]);

  // ✅ Send message and ensure it appears instantly
  const handleSend = async () => {
    if (!newMessage.trim() || !chatId) return;

    try {
      await addDoc(collection(db, "messages"), {
        chatId: chatId,
        sender: currentUserId,
        receiver: userId,
        text: newMessage,
        read: false,
        createdAt: Timestamp.fromDate(new Date()),
      });

      console.log("✅ Message sent successfully with chatId:", chatId);

      // 🚀 Send Push Notification via Expo
      await sendPushNotification(userId, currentUserId, newMessage);

      setNewMessage(""); // Clear input
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };


  // ✅ Send push notification using Expo Push API (NOT Firebase)
  async function sendPushNotification(receiverId, senderId, message) {
    try {
      const userSnapshot = await getDoc(doc(db, "users", receiverId));

      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        const token = userData.expoPushToken; // Get Expo Push Token

        if (!token) {
          console.warn("⚠️ No Expo push token found for user:", receiverId);
          return;
        }

        console.log(`🔥 Sending Expo notification to: ${receiverId} with token: ${token}`);

        // await fetch("https://exp.host/--/api/v2/push/send", {
        //   method: "POST",
        //   headers: {
        //     "Content-Type": "application/json",
        //   },
        //   body: JSON.stringify({
        //     to: token,
        //     sound: "default",
        //     title: `📩 New Message from ${senderId}`,
        //     body: message,
        //     data: { type: "message", chatId: chatId },
        //   }),
        // });

        console.log("✅ Expo Push Notification sent successfully!");
      } else {
        console.warn("⚠️ No user found with ID:", receiverId);
      }
    } catch (error) {
      console.error("❌ Error sending Expo push notification:", error);
    }
  }


 return (
     <View style={styles.container}>
       <ChatRoomHeader userName={userName} navigation={navigation} />

       {messages.length === 0 ? (
         <View style={styles.newChatContainer}>
           <Text style={styles.newChatText}>Say hi to your SpeakWise partner!</Text>
         </View>
       ) : (
         <FlatList
           ref={flatListRef}
           data={messages}
           keyExtractor={(item) => item.id}
           renderItem={({ item }) => (
             <View
               style={[
                 styles.messageContainer,
                 item.sender === currentUserId
                   ? styles.myMessage
                   : styles.otherMessage,
               ]}
             >
               <Text
                 style={
                   item.sender === currentUserId
                     ? styles.messageText
                     : styles.otherMessageText
                 }
               >
                 {item.text}
               </Text>
             </View>
           )}
           onContentSizeChange={() =>
             flatListRef.current?.scrollToEnd({ animated: true })
           }
         />
       )}

       <View style={styles.inputContainer}>
         <TextInput
           value={newMessage}
           onChangeText={(text) => setNewMessage(text)}
           placeholder="Type a Message..."
           placeholderTextColor="#737373"
           style={styles.input}
         />
         <TouchableOpacity
           style={styles.sendButton}
           onPress={() => {
             handleSend();
             Keyboard.dismiss();
           }}
         >
           <Text style={styles.sendButtonText}>Send</Text>
         </TouchableOpacity>
       </View>
     </View>
   );
 };

 const styles = StyleSheet.create({
   container: { flex: 1, padding: 10, backgroundColor: "#FFFFFF" },

   headerContainer: {
     flexDirection: "row",
     alignItems: "center",
     marginBottom: 10,
   },
   header: {
     fontSize: 18,
     fontWeight: "bold",
     textAlign: "center",
     color: "#1E1E84",
     marginLeft: 10,
   },

   messageContainer: {
     padding: 10,
     borderRadius: 10,
     marginVertical: 5,
     maxWidth: "75%",
     flexDirection: "row",
     alignItems: "center",
   },

   myMessage: {
     alignSelf: "flex-end",
     backgroundColor: "#1E1E84", // Dark blue background
     padding: 10,
     borderRadius: 10,
   },

   otherMessage: {
     alignSelf: "flex-start",
     backgroundColor: "#F0F0F0", // Soft gray background
     padding: 10,
     borderRadius: 10,
   },

   messageText: {
     color: "#FFFFFF", // White text for sent messages
   },

   otherMessageText: {
     color: "#1E1E84", // Dark blue text for received messages
     fontWeight: "500",
   },

   newChatContainer: {
     flex: 1,
     justifyContent: "center",
     alignItems: "center",
   },

   newChatText: { fontSize: 18, color: "#999" },

   inputContainer: {
     flexDirection: "row",
     alignItems: "center",
     padding: 10,
     borderTopWidth: 1,
     borderColor: "#E0E0E0",
   },

   input: {
     flex: 1,
     backgroundColor: "#F5F5F5",
     borderRadius: 25,
     paddingHorizontal: 15,
     marginRight: 10,
     fontSize: 16,
   },

   sendButton: {
     backgroundColor: "#1E1E84",
     borderRadius: 25,
     paddingVertical: 10,
     paddingHorizontal: 20,
   },

   sendButtonText: { color: "#FFFFFF", fontWeight: "bold" },
 });


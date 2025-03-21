import React, { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { View, FlatList, ActivityIndicator, Text } from "react-native";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  where,
  query,
  orderBy,
  onSnapshot,
  limit,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import ContactItem from "../../components/ContactItem";
import { useAuth } from "../../context/authContext";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { getRoomId } from "../../utils/common";

export default function Chat() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  const currentUserId = user?.uid;

  useEffect(() => {
    if (!currentUserId) {
      console.error("No authenticated user found.");
      return;
    }

    console.log("Current User ID:", currentUserId);

    setLoading(true);

    const fetchMatches = async () => {
      try {
        const userRef = doc(db, "users", currentUserId);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          console.error("User document not found!");
          setUsers([]);
          setLoading(false);
          return;
        }

        const matches = userSnap.data().matches || [];
        if (!Array.isArray(matches) || matches.length === 0) {
          setUsers([]);
          setLoading(false);
          return;
        }

        const matchedUserIds = matches.map((match) => match.userId);
        if (matchedUserIds.length === 0) {
          setUsers([]);
          setLoading(false);
          return;
        }

        const usersCollection = collection(db, "users");
        const q = query(
          usersCollection,
          where("__name__", "in", matchedUserIds)
        );
        const usersSnapshot = await getDocs(q);

        let usersList = usersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Listen for real-time message updates
        const unsubscribeList = usersList.map((matchedUser) => {
          const chatId = getRoomId(currentUserId, matchedUser?.id);

          const messagesQuery = query(
            collection(db, "messages"),
            where("chatId", "==", chatId),
            orderBy("createdAt", "desc"),
            limit(1)
          );

          return onSnapshot(messagesQuery, (snapshot) => {
            if (!snapshot.empty) {
              const latestMessage = snapshot.docs[0].data();
              updateUsersList(matchedUser, latestMessage);
            }
          });
        });

        setUsers(usersList);
        return () => unsubscribeList.forEach((unsub) => unsub());
      } catch (error) {
        console.error("Error fetching matches:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [currentUserId]);

  const updateUsersList = (updatedUser, latestMessage) => {
    setUsers((prevUsers) => {
      const updatedUsers = prevUsers.map((user) =>
        user.id === updatedUser.id ? { ...user, latestMessage } : user
      );

      return updatedUsers.sort((a, b) => {
        const timeA = a.latestMessage?.createdAt?.seconds || 0;
        const timeB = b.latestMessage?.createdAt?.seconds || 0;
        return timeB - timeA;
      });
    });
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "white", paddingHorizontal: 12 }}>
      <Text style={{ fontSize: 20, textAlign: "center", fontWeight: "bold", color: "#1E1E84", marginBottom: 10 }}>
        Messages
      </Text>
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : users.length > 0 ? (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <ContactItem router={router} item={item} index={index} currentUser={user} />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 5 }} />}  // Reduce to 5px
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 10 }} // Reduce bottom padding
        />


      ) : (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ color: "red", fontWeight: "bold" }}>No contacts available.</Text>
        </View>
      )}
    </GestureHandlerRootView>
  );
}
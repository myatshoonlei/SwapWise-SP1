import { View, Text, ActivityIndicator, FlatList } from "react-native";
import React, { useEffect, useState } from "react";
import NotiHeader from "../../components/NotiHeader";
import NotiCard from "../../components/NotiCard";
import "../../global.css";
import { useAuth } from "../../context/authContext";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { FontAwesome } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getRoomId } from "../../utils/common";

export default function Notifications() {
  const router = useRouter();
  const [meetings, setMeetings] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const noNoti = "No new notifications.";
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchNotifications(user?.uid);
    }
  }, [user]);

  const fetchNotifications = async (userId) => {
    try {
      setLoading(true);

      // 🔥 Fetch meetings (ordered by latest first)
      const meetingsQuery = query(
        collection(db, "meetings"),
        where("attendees", "array-contains", userId),
        orderBy("createdAt", "desc")
      );
      const meetingsSnapshot = await getDocs(meetingsQuery);
      const meetingInvites = meetingsSnapshot.docs.map((doc) => ({
        meetingId: doc.id,
        ...doc.data(),
      }));
      setMeetings(meetingInvites);

      // 🔥 Fetch matches
      const userDocRef = doc(db, "users", userId);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) {
        setMatches([]);
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      let userMatches = userData.matches || [];

      // ✅ Ensure matches are unique
      const uniqueMatches = new Map();
      userMatches.forEach((match) => {
        uniqueMatches.set(match.userId, match);
      });

      setMatches([...uniqueMatches.values()].sort((a, b) => b.matchedAt - a.matchedAt));

      setLoading(false);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setLoading(false);
    }
  };



  const filterOutExistingChats = async (userId, matchesList) => {
    return matchesList.map((match) => ({
      ...match,
      uniqueKey: `${match.userId}-${match.matchedAt?.toMillis() || Math.random()}`, // ✅ Ensure uniqueness
    }));
  };


  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <NotiHeader />
      <View className="flex-1 m-2">
        {meetings.length === 0 && matches.length === 0 ? (
          <View className="flex-row justify-center items-center h-[75vh] gap-4">
            <FontAwesome name="bell-slash" size={25} />
            <Text className="text-xl">{noNoti}</Text>
          </View>
        ) : (
          <FlatList
            data={[
              ...meetings.map((m) => ({ type: "meeting", data: m })),
              ...matches.map((m) => ({ type: "match", data: m })),
            ]}
            contentContainerStyle={{ flexGrow: 1, paddingVertical: 5 }}
            keyExtractor={(item, index) =>
              `${item.type}-${item.data?.meetingId || item.data?.userId || index}`
            }


            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => <NotiCard type={item.type} data={item.data} />}
            ItemSeparatorComponent={() => <View className="h-2" />}
          />
        )}
      </View>
    </View>
  );
}

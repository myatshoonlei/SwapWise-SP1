import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useRouter } from "expo-router";
import { useEffect } from "react";

/**
 * Request permission and register for push notifications.
 * Stores the Expo push token in Firestore under the user's document.
 */
export const registerForPushNotifications = async (userId) => {
  let token;

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("Push notifications permission not granted.");
      return;
    }

    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log("Expo Push Token:", token);

    // Store the token in Firestore
    await setDoc(doc(db, "users", userId), { expoPushToken: token }, { merge: true });
  } else {
    console.warn("Must use a physical device for push notifications");
  }

  // Set up Android notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  return token;
};

/**
 * Listen for when a notification is tapped and navigate accordingly.
 */
export const useNotificationListener = () => {
  const router = useRouter();

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        console.log("🔔 Notification Clicked:", JSON.stringify(response, null, 2)); // Debug log

        const data = response?.notification?.request?.content?.data;
        if (!data) {
          console.error("❌ Notification data is missing!");
          return;
        }

        if (data?.meetingId && data?.action === "meeting-invite") {
          console.log(`✅ Navigating to: /(tabs)/MeetingDetails?meetingId=${data.meetingId}`);
          router.push(`/(tabs)/MeetingDetails?meetingId=${data.meetingId}`);
          return;
        }

        if (data?.action === "message" && data?.chatId && data?.senderId) {
          console.log(`✅ Navigating to: /(page)/ChatRoom?userId=${data.senderId}&chatId=${data.chatId}`);
          router.push({
            pathname: "/(page)/ChatRoom",
            params: { userId: data.senderId, chatId: data.chatId }, // ✅ Add chatId here
          });

          console.log("🔍 Notification Data:", JSON.stringify(data, null, 2));



          return;
        }


        console.log("📌 Navigating to Notifications page...");
        router.push("/(page)/Notifications");
      }
    );

    return () => subscription.remove();
  }, []);
};


/**
 * Send a push notification using Expo's push notification service.
 */
export const sendNotification = async (expoPushToken, message, chatId, senderId) => {
  if (!expoPushToken) {
    console.warn("No Expo Push Token found");
    return;
  }

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: expoPushToken,
        sound: "default",
        title: "📩 New Message",
        body: message,
        data: {
          chatId: chatId, // ✅ Send chatId properly
          senderId: senderId, // ✅ Send senderId properly
          action: "message" // ✅ Identify this as a message notification
        },
      }),
    });

    const dataRes = await response.json();
    console.log("📩 Push notification sent:", dataRes);
  } catch (error) {
    console.error("🚨 Error sending notification:", error);
  }
};

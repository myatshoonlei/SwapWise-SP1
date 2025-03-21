const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const serviceAccount = require("./serviceAccountKey.json");

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// 🔔 FUNCTION: Send Expo Push Notification
async function sendExpoNotification(pushToken, title, body, data = {}) {
  if (!pushToken) {
    console.log("❌ No Expo Push Token provided.");
    return;
  }

  const message = {
    to: pushToken,
    sound: "default", // Play a sound when the notification is received
    title,
    body,
    data,
    priority: "high", // Ensure the notification is delivered immediately
    channelId: "default", // Required for Android to display as a banner
  };

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    console.log("✅ Push notification sent:", result);
  } catch (error) {
    console.error("❌ Error sending push notification:", error);
  }
}

// 🔔 FUNCTION: Notify recipient when they receive a new message
exports.sendNewMessageNotification = onDocumentCreated(
  "messages/{messageId}",
  async (event) => {
    try {
      const snapshot = event.data;
      if (!snapshot) {
        console.log("❌ No snapshot data found.");
        return;
      }

      const messageData = snapshot.data();
      const receiverId = messageData.receiver;
      const senderId = messageData.sender;

      if (!receiverId || !senderId) {
        console.log("❌ Missing sender or receiver ID.");
        return;
      }

      // ✅ Prevent sender from receiving notification
      if (receiverId === senderId) {
        console.log("❌ Sender is the same as receiver. Skipping notification.");
        return;
      }

      // if (!receiverPushToken || receiverPushToken === senderPushToken) {
      //   console.log("❌ Skipping notification: Same push token for sender and receiver.");
      //   return;
      // }


      // Fetch receiver's push token
      const userDoc = await admin.firestore().collection("users").doc(receiverId).get();
      if (!userDoc.exists) {
        console.log("❌ Receiver user document does not exist.");
        return;
      }

      const userData = userDoc.data();
      const pushToken = userData.expoPushToken;

      if (!pushToken) {
        console.log("❌ No Expo Push Token found for the receiver.");
        return;
      }

      // Fetch sender's name
      let senderName = "Someone";
      const senderDoc = await admin.firestore().collection("users").doc(senderId).get();
      if (senderDoc.exists) {
        senderName = senderDoc.data().name || "Unknown";
      }

      // ✅ Send push notification to receiver only
      await sendExpoNotification(
        pushToken,
        "📩 New Message",
        `${senderName}: ${messageData.text}`,
        {
          chatId: messageData.chatId,
          userId: receiverId,
          action: "message"
        }
      );


      console.log("✅ Notification sent successfully!");

    } catch (error) {
      console.error("❌ Error sending message notification:", error);
    }
  }
);

exports.sendMeetingNotification = onDocumentCreated(
  "meetings/{meetingId}",
  async (event) => {
    try {
      const snapshot = event.data;
      if (!snapshot) {
        console.log("❌ No snapshot data found.");
        return;
      }

      const meetingData = snapshot.data();
      const attendees = meetingData.attendees || [];

      if (attendees.length === 0) {
        console.log("❌ No attendees found for the meeting.");
        return;
      }

      for (const attendeeId of attendees) {
        const userDoc = await admin.firestore().collection("users").doc(attendeeId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const pushToken = userData.expoPushToken;

          if (!pushToken) {
            console.log(`❌ No Expo Push Token found for attendee: ${attendeeId}`);
            continue;
          }

          // Send push notification
          await sendExpoNotification(
            pushToken,
            "📅 Meeting Invitation",
            `You've been invited to a ${meetingData.category} meeting. Click to respond.`,
            { meetingId: event.params.meetingId, action: "meeting-invite" }
          );
        } else {
          console.log(`❌ Attendee document does not exist: ${attendeeId}`);
        }
      }
    } catch (error) {
      console.error("❌ Error sending meeting notification:", error);
    }
  }
);


// 🔔 FUNCTION: Notify attendees when a new meeting is created
// exports.sendMeetingNotification = onDocumentCreated(
//   "meetings/{meetingId}",
//   async (event) => {
//     try {
//       const snapshot = event.data;
//       if (!snapshot) {
//         console.log("❌ No snapshot data found.");
//         return;
//       }

//       const meetingData = snapshot.data();
//       const attendees = meetingData.attendees || [];

//       if (attendees.length === 0) {
//         console.log("❌ No attendees found for the meeting.");
//         return;
//       }

//       for (const attendeeId of attendees) {
//         const userDoc = await admin.firestore().collection("users").doc(attendeeId).get();
//         if (userDoc.exists) {
//           const userData = userDoc.data();
//           const pushToken = userData.expoPushToken;

//           if (!pushToken) {
//             console.log(`❌ No Expo Push Token found for attendee: ${attendeeId}`);
//             continue;
//           }

//           // Send push notification
//           await sendExpoNotification(
//             pushToken,
//             "📅 New Meeting Invitation",
//             `You have been invited to a meeting: ${meetingData.subject}`,
//             { meetingId: event.params.meetingId }
//           );
//         } else {
//           console.log(`❌ Attendee document does not exist: ${attendeeId}`);
//         }
//       }
//     } catch (error) {
//       console.error("❌ Error sending meeting notification:", error);
//     }
//   }
// );

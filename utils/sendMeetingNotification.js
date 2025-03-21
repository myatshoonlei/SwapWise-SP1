import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

// ✅ Send push notification to all meeting attendees
export const sendMeetingNotifications = async (attendees, category, meetingDate, meetingId) => {
  if (!meetingDate) {
    console.error("❌ Invalid meetingDate:", meetingDate);
    return;
  }

  // ✅ Ensure meetingDate is converted properly
  const formattedDate = new Date(meetingDate).toLocaleString();

  for (const userId of attendees) {
    try {
      const userRef = doc(db, "users", userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) continue;

      const userData = userDoc.data();
      const pushToken = userData.expoPushToken;

      if (!pushToken || !pushToken.startsWith("ExponentPushToken")) {
        console.log(`❌ No valid push token for user ${userId}`);
        continue;
      }

       const message = {
         to: pushToken,
         sound: "default",
         title: "📅 Meeting Invitation",
         body: `A new ${category} meeting is scheduled on ${formattedDate}. Accept or decline.`,
         data: { meetingId, action: "meeting-invite" },
       };

       const response = await fetch("https://exp.host/--/api/v2/push/send", {
         method: "POST",
         headers: {
           Accept: "application/json",
           "Accept-Encoding": "gzip, deflate",
           "Content-Type": "application/json",
         },
         body: JSON.stringify(message),
       });

       const result = await response.json();
       console.log(`✅ Notification sent to user ${userId}:`, result);
    } catch (error) {
       console.error(`❌ Error sending notification to ${userId}:`, error);
    }
  }
};
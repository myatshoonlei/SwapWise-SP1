import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, updateDoc, deleteDoc, arrayRemove } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getAuth } from "firebase/auth";

export default function MeetingDetails() {
  const { meetingId } = useLocalSearchParams();
  const router = useRouter();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const auth = getAuth();
  const currentUser = auth.currentUser;

  useEffect(() => {
    fetchMeetingDetails();
  }, []);

  const fetchMeetingDetails = async () => {
    if (!meetingId) return;
    setLoading(true);
    try {
      const meetingRef = doc(db, "meetings", meetingId);
      const meetingSnap = await getDoc(meetingRef);
      if (meetingSnap.exists()) {
        setMeeting(meetingSnap.data());
      } else {
        Alert.alert("Error", "Meeting not found.");
      }
    } catch (error) {
      console.error("Error fetching meeting:", error);
    } finally {
      setLoading(false);
    }
  };

  const acceptMeeting = async () => {
    if (!meetingId || !currentUser) return;
    try {
      const meetingRef = doc(db, "meetings", meetingId);
      const meetingSnap = await getDoc(meetingRef);
      if (!meetingSnap.exists()) {
        Alert.alert("Error", "Meeting not found.");
        return;
      }

      const meetingData = meetingSnap.data();
      const updatedAcceptedAttendees = [...new Set([...(meetingData.acceptedAttendees || []), currentUser.uid])];
      const isConfirmed = updatedAcceptedAttendees.length === meetingData.attendees.length;

      await updateDoc(meetingRef, {
        acceptedAttendees: updatedAcceptedAttendees,
        status: isConfirmed ? "confirmed" : "pending",
      });

      setMeeting({ ...meetingData, acceptedAttendees: updatedAcceptedAttendees, status: isConfirmed ? "confirmed" : "pending" });

      Alert.alert("Success", isConfirmed ? "Meeting is now confirmed!" : "You accepted the invitation.");

      // ✅ Redirect to Calendar.jsx after accepting
      router.push("/Calendar");

    } catch (error) {
      Alert.alert("Error", "Failed to accept the meeting.");
    }
  };

  const declineMeeting = async () => {
    if (!meetingId || !currentUser) return;
    try {
      const meetingRef = doc(db, "meetings", meetingId);
      const meetingSnap = await getDoc(meetingRef);
      if (!meetingSnap.exists()) {
        Alert.alert("Error", "Meeting not found.");
        return;
      }
      const meetingData = meetingSnap.data();
      const remainingAttendees = meetingData.attendees.filter((uid) => uid !== currentUser.uid);

      if (remainingAttendees.length === 0) {
        await deleteDoc(meetingRef);
        Alert.alert("Meeting Deleted", "The meeting has been deleted because all attendees declined.");
      } else {
        await updateDoc(meetingRef, { attendees: arrayRemove(currentUser.uid) });
        Alert.alert("Declined", "You have declined the meeting.");
      }

      // ✅ Redirect back to Notifications.jsx after declining
      router.back();

    } catch (error) {
      Alert.alert("Error", "Failed to decline the meeting.");
    }
  };

  if (loading) return <ActivityIndicator size="large" color="#1E1E84" />;
  if (!meeting) return <Text style={styles.errorText}>Meeting not found.</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Meeting Details</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Category</Text>
        <Text style={styles.value}>{meeting.category}</Text>

        <Text style={styles.label}>Subject</Text>
        <Text style={styles.value}>{meeting.subject}</Text>

        <Text style={styles.label}>Start Date & Time</Text>
        <Text style={styles.value}>{new Date(meeting.fromDate.toDate()).toLocaleString()}</Text>

        <Text style={styles.label}>Location</Text>
        <Text style={styles.value}>{meeting.isOnline ? "Online (Google Meet)" : meeting.location}</Text>
      </View>

      {/* ✅ Show Accept/Decline buttons ONLY if meeting is still pending */}
      {meeting.status === "pending" && meeting.attendees.includes(currentUser.uid) && !meeting.acceptedAttendees?.includes(currentUser.uid) ? (
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.acceptButton} onPress={acceptMeeting}>
            <Text style={styles.buttonText}>Accept</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.declineButton} onPress={declineMeeting}>
            <Text style={styles.buttonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ✅ Show Back button at the bottom if meeting is already confirmed/declined */
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA", padding: 20 },
  header: { fontSize: 22, fontWeight: "bold", color: "#333", textAlign: "center", marginBottom: 15 },
  card: { backgroundColor: "#FFF", padding: 20, borderRadius: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 3 },
  label: { fontSize: 16, fontWeight: "bold", color: "#555", marginTop: 10 },
  value: { fontSize: 16, color: "#222", marginTop: 5, padding: 10, backgroundColor: "#F1F3F5", borderRadius: 8 },
  buttonContainer: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
  acceptButton: { flex: 1, backgroundColor: "#1E1E84", padding: 12, borderRadius: 8, alignItems: "center", marginRight: 10 },
  declineButton: { flex: 1, backgroundColor: "#878282", padding: 12, borderRadius: 8, alignItems: "center" },
  backButton: { flex: 1, backgroundColor: "#1E1E84", padding: 12, borderRadius: 8, alignItems: "center" }, // ✅ Styled like the other buttons
  buttonText: { color: "white", fontSize: 16, fontWeight: "bold" },
  errorText: { fontSize: 18, color: "red", textAlign: "center", marginTop: 20 },
});

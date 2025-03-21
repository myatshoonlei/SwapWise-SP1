import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { useNavigation, useRoute } from "@react-navigation/native";
import { db } from "../../firebaseConfig";
import { Timestamp } from "firebase/firestore";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { getAuth, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { sendMeetingNotifications } from "../../utils/sendMeetingNotification";




const MeetingInput = () => {
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [location, setLocation] = useState("");
  const [fromDate, setFromDate] = useState(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(60);
  const [reminder, setReminder] = useState("5 minutes before");
  const [users, setUsers] = useState([]); // List of matched users
  const [selectedAttendees, setSelectedAttendees] = useState([]); // Selected attendees
  const [submitting, setSubmitting] = useState(false); // For loading animation
  const [meetLink, setMeetLink] = useState(null);

  const navigation = useNavigation();
  const route = useRoute();
  const meeting = route.params?.meeting; // if exists, we're editing a meeting
  const auth = getAuth();
  const currentUser = auth.currentUser;



  useEffect(() => {
    GoogleSignin.configure({
      webClientId: "63070857564-g8qffvo2cvooi931q8kb7h573gmgm1f4.apps.googleusercontent.com",
      offlineAccess: true, // Ensures we get a refresh token
      forceCodeForRefreshToken: true,
      scopes: ["https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"],
    });
  }, []);

  const durationOptions = [
    { label: "1 hour", value: 60 },
    { label: "1.5 hours", value: 90 },
    { label: "2 hours", value: 120 },
    { label: "2.5 hours", value: 150 },
    { label: "3 hours", value: 180 },
  ];

  const reminderOptions = [
    "5 minutes before",
    "10 minutes before",
    "15 minutes before",
    "30 minutes before",
    "1 hour before",
    "2 hours before",
  ];

  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "lessons"));
      const fetchedCategories = [];
      querySnapshot.forEach((doc) => {
        fetchedCategories.push({
          category: doc.id,
          subjects: doc.data().names, // Assuming 'names' is an array of subjects
        });
      });
      setCategories(fetchedCategories);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchMatchedUsers = async () => {
    if (!currentUser) return;
    try {
      const userDocRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists()) return;
      const userData = userDoc.data();
      const matchedUsersData = userData.matches || [];
      if (matchedUsersData.length === 0) return;
      const matchedUsers = [];
      for (const match of matchedUsersData) {
        const userId = match.userId;
        if (!userId) continue;
        const userRef = doc(db, "users", userId);
        const userSnapshot = await getDoc(userRef);
        if (userSnapshot.exists()) {
          matchedUsers.push({
            id: userSnapshot.id,
            ...userSnapshot.data(),
          });
        }
      }
      setUsers(matchedUsers);
    } catch (error) {
      console.error("Error fetching matched users:", error);
    }
  };

  // Pre-populate form if editing an existing meeting.
  useEffect(() => {
    if (meeting) {
      setSelectedCategory(meeting.category);
      setSelectedSubject(meeting.subject);
      setIsOnline(meeting.isOnline);
      setLocation(meeting.location);
      // fromDate is stored as a Firestore Timestamp, convert it.
      setFromDate(new Date(meeting.fromDate.seconds * 1000));
      setSelectedDuration(meeting.duration);
      setReminder(meeting.reminder);
      setSelectedAttendees(meeting.attendees || []);
    }
  }, [meeting]);

  useEffect(() => {
    fetchCategories();
    fetchMatchedUsers();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      const selectedCat = categories.find((cat) => cat.category === selectedCategory);
      setSubjects(selectedCat ? selectedCat.subjects : []);
    } else {
      setSubjects([]);
    }
  }, [selectedCategory, categories]);

  const handleConfirmFromDate = (date) => {
    setFromDate(date);
    setShowFromPicker(false);
  };

  const calculateEndTime = () => {
    const endTime = new Date(fromDate);
    endTime.setMinutes(fromDate.getMinutes() + selectedDuration);
    return endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };


  const handleCreateMeeting = async () => {
      const auth = getAuth();
      const currentUser = auth.currentUser;

      if (!currentUser) {
          Alert.alert("Error", "You must be logged in to create a meeting.");
          return;
      }

      setSubmitting(true);
      let googleAccessToken = null;

      // 👉 Step 1: Google Sign-In (For Google Calendar)
      try {
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
          const signInResult = await GoogleSignin.signIn();
          googleAccessToken = (await GoogleSignin.getTokens()).accessToken;

          if (!googleAccessToken) {
              throw new Error("Google Sign-In failed: No access token returned.");
          }

          console.log("✅ Google Access Token received:", googleAccessToken);
      } catch (error) {
          console.error("❌ Google Sign-In failed:", error);
          Alert.alert("Google Sign-In Failed", error.message);
          setSubmitting(false);
          return;
      }

      // 👉 Step 2: Create Google Calendar Event (for reminders only)
      let googleMeetLink = ""; // Store Google Meet link separately
      let calendarEventLink = ""; // Google Calendar Event Link

      try {
          const eventData = await createGoogleMeet(
              fromDate,
              selectedDuration,
              googleAccessToken,
              reminder,
              isOnline ? "Google Meet" : location
          );

          if (!eventData) throw new Error("Google Calendar event creation failed.");

          calendarEventLink = eventData.htmlLink; // Google Calendar Event URL

          // ✅ Extract Google Meet Link if available
          if (eventData.conferenceData?.entryPoints) {
              googleMeetLink = eventData.conferenceData.entryPoints[0].uri;
          }

          console.log("✅ Google Calendar Event Created:", calendarEventLink);
          console.log("✅ Google Meet Link:", googleMeetLink);
      } catch (error) {
          console.error("🔥 Error creating Google Calendar event:", error);
          Alert.alert("Error", "Failed to create Google Calendar event.");
          setSubmitting(false);
          return;
      }

      // 👉 Step 3: Save Meeting to Firestore (Separate meetLink & location)
      try {
          const meetingData = {
              category: selectedCategory,
              subject: selectedSubject,
              isOnline,
              location: isOnline ? googleMeetLink : location, // ✅ Store Meet Link for online, Location for offline
              calendarEventLink: calendarEventLink, // ✅ Store Google Calendar Event Link for reference
              fromDate: Timestamp.fromDate(new Date(fromDate)),
              duration: selectedDuration,
              reminder: reminder,
              attendees: selectedAttendees,
              createdBy: currentUser.uid,
              status: "pending",
              createdAt: Timestamp.now(),
          };

          const meetingRef = await addDoc(collection(db, "meetings"), meetingData);
          const meetingId = meetingRef.id;

          // ✅ **Send Meeting Notifications**
          try {
              await sendMeetingNotifications(selectedAttendees, selectedCategory, fromDate.toISOString(), meetingId);
              console.log("✅ Notifications sent successfully!");
          } catch (notificationError) {
              console.error("❌ Error sending notifications:", notificationError);
          }

          Alert.alert("Success", "Meeting added to Google Calendar & Invitations Sent!");
          navigation.goBack();
      } catch (error) {
          console.error("Error saving meeting:", error);
          Alert.alert("Error", "Could not save the meeting.");
      } finally {
          setSubmitting(false);
      }
  };








  useEffect(() => {
    if (currentUser) {
      console.log("User provider data:", currentUser.providerData);
    }
  }, [currentUser]);


  const createGoogleMeet = async (fromDate, duration, googleAccessToken, reminderTime, meetingLocation) => {
      try {
          if (!googleAccessToken) throw new Error("No Google access token found.");

          console.log("🔍 Google Calendar Access Token:", googleAccessToken);

          const endDate = new Date(fromDate);
          endDate.setMinutes(endDate.getMinutes() + duration);

          // Convert reminder time from string to minutes
          const reminderMinutes = {
              "5 minutes before": 5,
              "10 minutes before": 10,
              "15 minutes before": 15,
              "30 minutes before": 30,
              "1 hour before": 60,
              "2 hours before": 120,
          }[reminderTime] || 10; // Default to 10 mins

          const event = {
              summary: "SwapWise Meeting",
              description: "Scheduled via SwapWise App",
              location: meetingLocation, // ✅ Works for both online & offline meetings
              start: {
                  dateTime: fromDate.toISOString(),
                  timeZone: "Asia/Bangkok",
              },
              end: {
                  dateTime: endDate.toISOString(),
                  timeZone: "Asia/Bangkok",
              },
              reminders: {
                  useDefault: false,
                  overrides: [
                      {
                          method: "popup", // ✅ Google Calendar Notification
                          minutes: reminderMinutes,
                      },
                      {
                          method: "email", // ✅ Email Reminder
                          minutes: reminderMinutes,
                      },
                  ],
              },
          };

          // ✅ If it's an online meeting, add Google Meet link
          if (meetingLocation === "Google Meet") {
              event.conferenceData = {
                  createRequest: {
                      requestId: Math.random().toString(36).substr(2, 9),
                      conferenceSolutionKey: { type: "hangoutsMeet" },
                  },
              };
          }

          const response = await fetch(
              "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1",
              {
                  method: "POST",
                  headers: {
                      Authorization: `Bearer ${googleAccessToken}`,
                      "Content-Type": "application/json",
                  },
                  body: JSON.stringify(event),
              }
          );

          if (!response.ok) {
              const errorData = await response.json();
              console.error("❌ Google Calendar API Error:", errorData);
              throw new Error("Failed to create Google Calendar event.");
          }

          const data = await response.json();
          console.log("✅ Google Calendar Event Created:", data.htmlLink);
          return data; // ✅ Returns full event data including Google Meet Link
      } catch (error) {
          console.error("🔥 Error creating Google Calendar event:", error);
          return null;
      }
  };













  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>


        {/* Category & Subject (Side by Side) */}
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedCategory}
                onValueChange={(itemValue) => setSelectedCategory(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Select a category" value="" />
                {categories.map((category) => (
                  <Picker.Item key={category.category} label={category.category} value={category.category} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.halfWidth}>
            <Text style={styles.label}>Subject</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedSubject}
                onValueChange={(itemValue) => setSelectedSubject(itemValue)}
                style={styles.picker}
              >
                <Picker.Item label="Select a subject" value="" />
                {subjects.map((subject, index) => (
                  <Picker.Item key={index} label={subject} value={subject} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        {/* Required Attendees */}
        <Text style={styles.label}>Required Attendees</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue=""
            onValueChange={(itemValue) => {
              if (!selectedAttendees.includes(itemValue)) {
                setSelectedAttendees([...selectedAttendees, itemValue]);
              }
            }}
            style={styles.picker}
          >
            <Picker.Item label="Select a user" value="" />
            {users.map((user) => (
              <Picker.Item key={user.id} label={user.name} value={user.id} />
            ))}
          </Picker>
        </View>
        <View>
          {selectedAttendees.map((attendeeId) => {
            const attendee = users.find((user) => user.id === attendeeId);
            return (
              <Text key={attendeeId} style={styles.attendeeText}>
                {attendee?.name}
              </Text>
            );
          })}
        </View>

        {/* Start Time & Duration */}
        <Text style={styles.label}>Start Date & Time</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowFromPicker(true)}>
          <Text>{fromDate.toLocaleString()}</Text>
        </TouchableOpacity>
        <DateTimePickerModal
          isVisible={showFromPicker}
          mode="datetime"
          onConfirm={handleConfirmFromDate}
          onCancel={() => setShowFromPicker(false)}
        />

        {/* Duration & End Time (Side by Side) */}
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Duration</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={selectedDuration.toString()}
                onValueChange={(value) => setSelectedDuration(parseInt(value))}
                style={styles.picker}
              >
                {durationOptions.map((option) => (
                  <Picker.Item
                    key={option.value}
                    label={option.label}
                    value={option.value.toString()}
                  />
                ))}
              </Picker>
            </View>
          </View>

          <View style={[styles.halfWidth, styles.fadedTextContainer]}>
            <Text style={styles.label}>End Time</Text>
            <View style={[styles.input, styles.fadedText]}>
              <Text>{calculateEndTime()}</Text>
            </View>
          </View>
        </View>

        {/* Online Meeting Toggle */}
        <Text style={styles.label}>Online Meeting</Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleOption, isOnline ? styles.activeToggle : styles.inactiveToggle]}
            onPress={() => setIsOnline(true)}
          >
            <Text style={[styles.toggleText, isOnline && styles.activeText]}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleOption, !isOnline ? styles.activeToggle : styles.inactiveToggle]}
            onPress={() => setIsOnline(false)}
          >
            <Text style={[styles.toggleText, !isOnline && styles.activeText]}>No</Text>
          </TouchableOpacity>
        </View>

        {/* Location Input or Google Meet Link */}
{isOnline ? (
  meetLink ? (
    <View>
      <Text style={styles.label}>Google Meet Link</Text>
      <TouchableOpacity onPress={() => Linking.openURL(meetLink)}>
        <Text style={styles.meetLink}>{meetLink}</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <Text style={styles.label}>Google Meet link will be generated after saving.</Text>
  )
) : (
  <>
    <Text style={styles.label}>Meeting Location</Text>
    <TextInput
      style={styles.input}
      placeholder="Enter location"
      value={location}
      onChangeText={setLocation}
    />
  </>
)}



        {/* Meeting Reminder */}
        <Text style={styles.label}>Meeting Reminder</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={reminder}
            onValueChange={setReminder}
            style={styles.picker}
          >
            {reminderOptions.map((option, index) => (
              <Picker.Item key={index} label={option} value={option} />
            ))}
          </Picker>
        </View>


      {/* Create / Update Meeting & Back Button Row */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        {submitting ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E1E84" />
            <Text style={styles.loadingText}>Creating Meeting...</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.button} onPress={handleCreateMeeting}>
            <Text style={styles.buttonText}>{meeting ? "Update Meeting" : "Create Meeting"}</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContainer: { flexGrow: 1, padding: 10, paddingBottom: 80, backgroundColor: "#FFFFFF" },
  backButton: { marginBottom: 20 },
  backButtonText: { color: "#1E1E84", fontSize: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  halfWidth: { width: "48%" },
  label: { fontSize: 16, fontWeight: "bold", color: "#1E1E84", marginBottom: 5 },
  pickerContainer: { borderWidth: 1, borderColor: "#E0E0E0", borderRadius: 8, marginBottom: 10 },
  input: { backgroundColor: "#F5F5F5", padding: 15, borderRadius: 8, marginBottom: 15 },
  fadedTextContainer: { opacity: 0.6 },
  fadedText: { backgroundColor: "#EAEAEA" },
  toggleContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20, borderWidth: 1, borderColor: "#1E1E84", borderRadius: 8, overflow: "hidden" },
  toggleOption: { flex: 1, padding: 15, alignItems: "center" },
  activeToggle: { backgroundColor: "#1E1E84" },
  inactiveToggle: { backgroundColor: "#FFFFFF" },
  toggleText: { fontSize: 16, fontWeight: "bold", color: "#1E1E84" },
  activeText: { color: "#FFFFFF" },
  button: { backgroundColor: "#1E1E84", padding: 15, borderRadius: 8, alignItems: "center", width: "100%" },
  buttonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "bold" },
  attendeeText: { fontSize: 14, color: "#1E1E84", marginBottom: 5 },
  loadingContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#1E1E84",
  },
  calendarContainer: {
    backgroundColor: "#FFFFFF",
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerButton: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E1E84",
  },
  headerText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1E1E84",
  },
  weekdays: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  weekdayText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8A8A8A",
  },
  calendarRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 8,
  },
  dayButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
  },
  highlightedDay: {
    backgroundColor: "#ADD8E6",
  },
  selectedDay: {
    backgroundColor: "#1E1E84",
    borderRadius: 20,
  },
  selectedDayText: {
    color: "#FFFFFF",
  },
  dayText: {
    fontSize: 16,
    color: "#000000",
  },
  meetingList: {
    marginTop: 16,
  },
  meetingHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1E1E84",
  },
  meetingCard: {
    backgroundColor: "#F5F5F5",
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    position: "relative",
  },
  meetingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 4,
  },
  meetingDetails: {
    fontSize: 14,
    color: "#8A8A8A",
    marginBottom: 4,
  },
  joinButton: {
    marginTop: 8,
    backgroundColor: "#1E1E84",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  joinButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  optionsButton: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 4,
  },
  optionsButtonText: {
    fontSize: 24,
    color: "#1E1E84",
  },
  addMeetingButton: {
    position: "absolute",
    bottom: 80,
    right: 20,
    backgroundColor: "#1E1E84",
    width: 60,
    height: 60,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  addMeetingButtonText: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "bold",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    paddingHorizontal: 10,
  },

  backButton: {
    backgroundColor: "#D3D3D3", // Light gray
    paddingVertical: 15,
    paddingHorizontal: 25,  // ✅ Make it equal in width to "Create Meeting"
    borderRadius: 8,
    flex: 1,  // ✅ Makes it take up equal space
    alignItems: "center",
  },

  backButtonText: {
    color: "#1E1E84",
    fontSize: 16,
    fontWeight: "bold",
  },
  button: {
    backgroundColor: "#1E1E84",
    paddingVertical: 15,
    paddingHorizontal: 25,  // ✅ Ensure same size as Back button
    borderRadius: 8,
    flex: 1,  // ✅ Makes it take up equal space
    alignItems: "center",
    marginLeft: 10, // ✅ Add some spacing between buttons
  },


});

export default MeetingInput;
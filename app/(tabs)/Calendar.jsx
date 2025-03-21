import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { collection, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { getAuth } from "firebase/auth";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Linking } from "react-native"; 

const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CalendarPage = () => {
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [meetings, setMeetings] = useState([]);
  const [highlightedDays, setHighlightedDays] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const [showDatePicker, setShowDatePicker] = useState(false); 

  const handleMonthChange = (direction) => {
    const newMonth = new Date(selectedDay);
    newMonth.setMonth(selectedDay.getMonth() + direction);
    setSelectedDay(newMonth);
    fetchMeetings(newMonth);
  };
  // ✅ Move by one week when navigating
  const handleWeekChange = (direction) => {
    const newDate = new Date(selectedDay);
    newDate.setDate(selectedDay.getDate() + 7 * direction);
    setSelectedDay(newDate);
  };

  // ✅ Open Date Picker when clicking on Month Name
  const openDatePicker = () => {
    setShowDatePicker(true);
  };



  const fetchMeetings = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const meetingsRef = collection(db, "meetings");

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const q = query(meetingsRef, where("fromDate", ">=", today));
      const querySnapshot = await getDocs(q);
      const fetchedMeetings = [];
      const highlightDays = new Set();

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.fromDate && data.status === "confirmed") { // ✅ Only show confirmed meetings
          const meetingStart = new Date(data.fromDate.seconds * 1000);
          const meetingEnd = new Date(meetingStart.getTime() + (data.duration || 0) * 60000);

          if (
            data.createdBy === currentUser.uid ||
            (Array.isArray(data.acceptedAttendees) && data.acceptedAttendees.includes(currentUser.uid)) // ✅ Check if it's an array before using includes()
          ) {
            highlightDays.add(meetingStart.toDateString());
            fetchedMeetings.push({
              id: docSnap.id,
              ...data,
              from: meetingStart,
              to: meetingEnd,
            });
          }

        }
      });

      setHighlightedDays(highlightDays);
      setMeetings(fetchedMeetings);
    } catch (error) {
      console.error("❌ Error fetching meetings:", error);
    } finally {
      setLoading(false);
    }
  };




  useEffect(() => {
    if (currentUser) {
      fetchMeetings(selectedDay);
    }
  }, [currentUser, selectedDay]);

  useEffect(() => {
    fetchMeetings(selectedDay);
  }, [selectedDay]);

  const filterMeetingsForSelectedDay = () => {
    return meetings.filter((meeting) => {
      const meetingDate = meeting.from.toDateString();
      const selectedDate = selectedDay.toDateString();

      return meetingDate === selectedDate; // ✅ Ensures all meetings for today are included
    });
  };


  const getUpcomingMeetings = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1); // ✅ Start from tomorrow

    return meetings
      .filter(
        (meeting) =>
          meeting.from >= tomorrow &&
          (meeting.createdBy === currentUser.uid ||
            (meeting.attendees && meeting.attendees.includes(currentUser.uid)))
      )
      .sort((a, b) => a.from - b.from);
  };





  const handleMeetingOptions = (meeting) => {
    Alert.alert(
      meeting.subject,
      "Choose an option",
      [
        { text: "Edit", onPress: () => navigation.navigate("MeetingInput", { meeting }) },
        { text: "Delete", onPress: () => deleteMeeting(meeting.id), style: "destructive" },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  const deleteMeeting = async (meetingId) => {
    try {
      await deleteDoc(doc(db, "meetings", meetingId));
      Alert.alert("Deleted", "Meeting deleted successfully.");
      fetchMeetings(selectedDay);
    } catch (error) {
      console.error("Error deleting meeting:", error);
      Alert.alert("Error", "Failed to delete meeting.");
    }
  };

  const joinMeeting = (meeting) => {
    if (meeting.isOnline && meeting.location) {
      Linking.openURL(meeting.location).catch((err) =>
        console.error("Failed to open Google Meet link:", err)
      );
    } else {
      Alert.alert("Meeting Info", "This is an offline meeting.");
    }
  };


  const renderCalendarRows = () => {
    const startOfWeek = new Date(
      selectedDay.getFullYear(),
      selectedDay.getMonth(),
      selectedDay.getDate() - selectedDay.getDay()
    );
    const dates = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      return date;
    });

    return (
      <View style={styles.calendarRow}>
        {dates.map((day, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dayButton,
              highlightedDays.has(day.toDateString()) && styles.highlightedDay, // ✅ Light blue for meeting days
              day.toDateString() === selectedDay.toDateString() && styles.selectedDay, // ✅ Dark blue for selected day
            ]}
            onPress={() => setSelectedDay(day)}
          >
            <Text
              style={[
                styles.dayText,
                day.toDateString() === selectedDay.toDateString() && styles.selectedDayText,
              ]}
            >
              {day.getDate()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };


  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.calendarContainer}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={() => handleWeekChange(-1)}>
              <Text style={styles.headerButton}>{"<"}</Text>
            </TouchableOpacity>

            {/* ✅ Clicking Month Name Opens Date Picker */}
            <TouchableOpacity onPress={openDatePicker}>
              <Text style={styles.headerText}>
                {selectedDay.toLocaleString("default", { month: "long", year: "numeric" })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleWeekChange(1)}>
              <Text style={styles.headerButton}>{">"}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekdays}>
            {weekdays.map((day, index) => (
              <Text key={index} style={styles.weekdayText}>
                {day}
              </Text>
            ))}
          </View>

          <View>{renderCalendarRows()}</View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDay}
            mode="date"
            display="calendar"
            onChange={(event, date) => {
              if (date) {
                setSelectedDay(date);
              }
              setShowDatePicker(false);
            }}
          />
        )}
        {/* Meetings for Selected Day */}
        <View style={styles.meetingList}>
          <Text style={styles.meetingHeader}>
            Meetings on {selectedDay.toDateString()}
          </Text>
          {loading ? (
            <Text style={styles.loadingText}>Loading...</Text>
          ) : filterMeetingsForSelectedDay().length === 0 ? (
            <Text style={styles.noMeetingsText}>No meetings scheduled for this day.</Text>
          ) : (
            filterMeetingsForSelectedDay().map((meeting) => {
              const now = new Date();
              const joinStart = new Date(meeting.from.getTime() - 5 * 60 * 1000);
              const joinEnd = meeting.to;
              const canJoin = now >= joinStart && now <= joinEnd;

              return (
                <View key={meeting.id} style={styles.meetingCard}>
                  <Text style={styles.meetingTitle}>{meeting.subject}</Text>
                  <Text style={styles.meetingDetails}>{meeting.from.toDateString()}</Text>
                  <Text style={styles.meetingDetails}>
                    {meeting.from.toLocaleTimeString()} - {meeting.to.toLocaleTimeString()}
                  </Text>
                  <Text style={styles.meetingDetails}>
                    {meeting.isOnline ? "Online" : "Offline"}
                  </Text>

                  {/* ✅ Show location for both online and offline meetings */}
                  {meeting.location && (
                    <Text style={styles.meetingDetails}>📍 Location: {meeting.location}</Text>
                  )}

                  <TouchableOpacity
                    onPress={() => handleMeetingOptions(meeting)}
                    style={styles.optionsButton}
                  >
                    <Text style={styles.optionsButtonText}>⋮</Text>
                  </TouchableOpacity>

                  {/* ✅ Keep the join button logic for online meetings */}
                  {canJoin && meeting.isOnline && meeting.location && (
                    <TouchableOpacity style={styles.joinButton} onPress={() => joinMeeting(meeting)}>
                      <Text style={styles.joinButtonText}>Join</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );

            })
          )}
        </View>

        {/* Upcoming Meetings Section */}
        <View style={styles.meetingList}>
  <Text style={styles.meetingHeader}>Upcoming Meetings</Text>
  {loading ? (
    <Text style={styles.loadingText}>Loading...</Text>
  ) : getUpcomingMeetings().length === 0 ? (
    <Text style={styles.noMeetingsText}>No upcoming meetings scheduled.</Text>
  ) : (
    getUpcomingMeetings().map((meeting) => (
      <View key={meeting.id} style={styles.meetingCard}>
        <Text style={styles.meetingTitle}>{meeting.subject}</Text>
        <Text style={styles.meetingDetails}>
          {meeting.from.toDateString()}
        </Text>
        <Text style={styles.meetingDetails}>
          {meeting.from.toLocaleTimeString()} - {meeting.to.toLocaleTimeString()}
        </Text>
        <Text style={styles.meetingDetails}>
          {meeting.isOnline ? "Online" : "Offline"}
        </Text>

        {/* ✅ Show location for both online and offline meetings */}
        {meeting.location && (
          <Text style={styles.meetingDetails}>📍 Location: {meeting.location}</Text>
        )}
      </View>
    ))
  )}
</View>



      </ScrollView>

      {/* Add Meeting Button */}
      <TouchableOpacity
        style={styles.addMeetingButton}
        onPress={() => navigation.navigate("MeetingInput")}
      >
        <Text style={styles.addMeetingButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100, // Extra bottom padding so content scrolls above the tab
    flexGrow: 1,
  },
  calendarContainer: {
    backgroundColor: "#FFFFFF", // Background for sticky header
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
  optionsButton: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 4,
    zIndex: 10,
  },
  optionsButtonText: {
    fontSize: 24,
    color: "#1E1E84",
  },
  joinButton: {
    position: "absolute",
    top: 70, // Adjust as needed so the join button appears below the options button
    right: 8,
    backgroundColor: "#1E1E84",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    zIndex: 9, // Below options button if needed
  },
  joinButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
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
    zIndex: 1,
  },
  addMeetingButtonText: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "bold",
  },
  meetLink: {
    color: "#1E1E84",
    textDecorationLine: "underline",
    marginTop: 5,
  },
  
});

export default CalendarPage;
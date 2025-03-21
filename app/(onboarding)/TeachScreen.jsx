import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import OnboardingHeader from "../../components/OnBoardingHeader";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";

// Firebase initialization
import { app } from "../../firebaseConfig";
const db = getFirestore(app);
const MAX_SELECTION = 5; // Set max lessons limit
const OTHERS_CATEGORY = "Others"; // Define the category for new lessons


const TeachScreen = () => {
  const router = useRouter();
  const auth = getAuth();
  const [lessons, setLessons] = useState([]);
  const [filteredLessons, setFilteredLessons] = useState([]); // Add filtered lessons
  const [searchQuery, setSearchQuery] = useState(""); // Add search query
  const [selectedLessons, setSelectedLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(""); // Add error state
 const [learnedLessons, setLearnedLessons] = useState([]);


useEffect(() => {
  const fetchData = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      setLoading(true); // Start loading
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      let learnedData = [];
      if (userDoc.exists()) {
        learnedData = userDoc.data().learn || [];
      }

      const lessonsCollection = collection(db, "lessons");
      const lessonsSnapshot = await getDocs(lessonsCollection);

      let lessonsData = lessonsSnapshot.docs.map((doc) => ({
        category: doc.id,
        names: doc.data().names.filter((name) => !learnedData.includes(name)),
      }));

      // Sort alphabetically but move "Others" to the end
      lessonsData = lessonsData
        .filter((lesson) => lesson.category !== OTHERS_CATEGORY)
        .sort((a, b) => a.category.localeCompare(b.category));

      // ✅ Ensure "Others" category also removes learned lessons
          const othersCategory = lessonsSnapshot.docs.find((doc) => doc.id === OTHERS_CATEGORY);
          if (othersCategory) {
            const othersNames = othersCategory.data().names.filter((name) => !learnedData.includes(name)); // ✅ Apply filtering
            if (othersNames.length > 0) {
              lessonsData.push({
                category: OTHERS_CATEGORY,
                names: othersNames,
              });
            }
          }

      setLessons(lessonsData);
      setFilteredLessons(lessonsData);

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false); // Stop loading only after filtering
    }
  };

  fetchData();
}, []);



    const fetchLessons = async () => {
      try {
        setLoading(true); // Ensure loading is set to true before processing

        const lessonsCollection = collection(db, "lessons");
        const lessonsSnapshot = await getDocs(lessonsCollection);
        const lessonsData = lessonsSnapshot.docs.map((doc) => ({
          category: doc.id,
          names: doc.data().names,
        }));

        setLessons(lessonsData);
      } catch (error) {
        console.error("Error fetching lessons:", error);
      }
    };


const toggleLesson = (lessonName) => {
  setError(""); // Reset error when user interacts

  setSelectedLessons((prevSelected) => {
    if (prevSelected.includes(lessonName)) {
      return prevSelected.filter((l) => l !== lessonName);
    } else if (prevSelected.length < MAX_SELECTION) {
      return [...prevSelected, lessonName];
    } else {
      setError(`You can only select up to ${MAX_SELECTION} lessons.`);
      return prevSelected;
    }
  });
};

    const handleSearch = (text) => {
      setSearchQuery(text);
      if (text.trim() === "") {
        setFilteredLessons(lessons); // Reset to all lessons when search is cleared
        return;
      }

      const lowercasedText = text.toLowerCase();
      const filtered = lessons.map((lesson) => ({
        category: lesson.category,
        names: lesson.names.filter((name) => name.toLowerCase().includes(lowercasedText)),
      })).filter((lesson) => lesson.names.length > 0); // Remove empty categories

      setFilteredLessons(filtered);
    };

    const addNewLesson = async () => {
      if (!searchQuery.trim()) return;
      const newLesson = searchQuery.trim();

      try {
        const othersRef = doc(db, "lessons", OTHERS_CATEGORY);
        const othersDoc = await getDoc(othersRef);

        let updatedLessons;

        if (othersDoc.exists()) {
          const existingLessons = othersDoc.data().names || [];
          if (existingLessons.includes(newLesson)) {
            Alert.alert("Lesson already exists!");
            return;
          }

          const updatedOthers = [...existingLessons, newLesson];
          await setDoc(othersRef, { names: updatedOthers }, { merge: true });

          updatedLessons = lessons.map((lesson) =>
            lesson.category === OTHERS_CATEGORY ? { ...lesson, names: updatedOthers } : lesson
          );
        } else {
          // "Others" category does not exist, create it
          await setDoc(othersRef, { names: [newLesson] });

          updatedLessons = [...lessons, { category: OTHERS_CATEGORY, names: [newLesson] }];
        }

        // 🔥 Reapply filtering to remove learned lessons after adding
        const user = auth.currentUser;
        if (user) {
          const userRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userRef);
          let learnedData = userDoc.exists() ? userDoc.data().learn || [] : [];

          updatedLessons = updatedLessons.map((lesson) => ({
            category: lesson.category,
            names: lesson.names.filter((name) => !learnedData.includes(name)), // ✅ Apply filtering
          }));
        }

        setLessons(updatedLessons);
        setFilteredLessons(updatedLessons);
        toggleLesson(newLesson);
        setSearchQuery("");
      } catch (error) {
        console.error("Error adding new lesson:", error);
        Alert.alert("Error", "Failed to add new lesson.");
      }
    };



  const handleNext = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "No authenticated user found.");
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        teach: selectedLessons, // Save selected lessons under 'teach'
      });
      router.push("/(onboarding)/HobbiesScreen"); // Navigate to the next screen
    } catch (error) {
      console.error("Error updating Firestore:", error);
      Alert.alert("Error", "Failed to save your lessons. Please try again.");
    }
  };

  // Display loading indicator while fetching data
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b3b98" />
        <Text style={styles.loadingText}>Loading Lessons...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
              <OnboardingHeader />
      {/* Title */}
      <Text style={styles.title}>What can you teach?</Text>
<Text style={styles.subtitle}>Choose at most {MAX_SELECTION} subjects or skills</Text>
    {error ? <Text style={styles.error}>{error}</Text> : null}

    <TextInput
      style={styles.searchBar}
      placeholder="Search for a skill or subject..."
      value={searchQuery}
      onChangeText={handleSearch}
    />

    {/* Show "Add" button if the search query is not found in filteredLessons */}
    {searchQuery && !filteredLessons.some((lesson) => lesson.names.includes(searchQuery)) && (
      <TouchableOpacity style={styles.addButton} onPress={addNewLesson}>
        <Text style={styles.addButtonText}>Add "{searchQuery}"</Text>
      </TouchableOpacity>
    )}

      {/* Lesson Categories */}
      <ScrollView contentContainerStyle={styles.scrollContainer}>
{!loading && lessons.length > 0 &&
  filteredLessons.map((lesson) =>
    lesson.names.length > 0 ? ( // Only render categories with remaining lessons
      <View key={lesson.category} style={styles.categoryContainer}>
        <Text style={styles.categoryTitle}>{lesson.category}</Text>
        <View style={styles.lessonGroup}>
          {lesson.names.map((name, index) => (
            <TouchableOpacity
              key={`${lesson.category}-${name}-${index}`}
              style={[
                styles.lessonButton,
                selectedLessons.includes(name) && styles.selectedLesson,
              ]}
              onPress={() => toggleLesson(name)}
            >
              <Text
                style={[
                  styles.lessonText,
                  selectedLessons.includes(name) && styles.selectedLessonText,
                ]}
              >
                {name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    ) : null
  )}

    {/* Only show buttons when searchQuery is empty */}
    {searchQuery.trim() === "" && (
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.sharedButton, styles.backButton]}
          onPress={() => router.back()}
        >
          <Text style={styles.sharedButtonText}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sharedButton, styles.nextButton]}
          onPress={handleNext}
          disabled={selectedLessons.length === 0} // Prevent empty selection
        >
          <Text style={styles.sharedButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    )}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff", paddingTop: 45 },
// Title styling
  title: {
      fontSize: 25,
      fontWeight: "600",
      marginTop: 15,  // <-- Add marginTop for spacing
      marginBottom: 16,
      color: "#000",
      textAlign: "center",
      width: "100%",
  },
  subtitle: { fontSize: 14, textAlign: "center", color: "#666", marginBottom: 10 },
  error: { color: "red", textAlign: "center", fontSize: 14, marginBottom: 10 },
  searchBar: { borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 8, marginBottom: 16 },
  scrollContainer: { paddingBottom: 20 },
  categoryContainer: { marginBottom: 16, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "#e0e0e0" },
  categoryTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 15, color: "#3b3b98" },
  lessonGroup: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  lessonButton: { padding: 8, borderRadius: 20, borderWidth: 1, borderColor: "#e0e0e0", backgroundColor: "#f5f5f5", margin: 5 },
  selectedLesson: { backgroundColor: "#3b3b98", borderColor: "#3b3b98" },
  selectedLessonText: { color: "#fff" },
  // Specific styling for Next button
    nextButton: {
      alignSelf: "flex-end", // Align to the right (relative to container)
    },
  // Shared button styling
  sharedButton: {
    backgroundColor: "#3b3b98",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30, // Rounded corners
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3, // Add shadow effect for better UI
  },

  sharedButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginHorizontal: 10,
  },
  addButton: {
    backgroundColor: "#3b3b98",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },

  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Button container
  buttonContainer: {
    flexDirection: "row", // Arrange buttons in a row
    justifyContent: "space-between", // Space them apart (Back on left, Next on right)
    marginTop: 16,
    width: "100%", // Ensure full width alignment
  },
});

export default TeachScreen;

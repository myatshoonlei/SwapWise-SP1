import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  updateDoc,
  collection,
  setDoc,
  getDoc,
  getDocs,
} from "firebase/firestore";
import { app } from "../../firebaseConfig";
import { Keyboard } from "react-native"; // Import Keyboard
import OnboardingHeader from "../../components/OnBoardingHeader";

const db = getFirestore(app);
const MAX_SELECTION = 5;

const LearnScreen = () => {
  const router = useRouter();
  const auth = getAuth();
  const [lessons, setLessons] = useState([]);
  const [filteredLessons, setFilteredLessons] = useState([]);
  const [selectedLessons, setSelectedLessons] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const OTHERS_CATEGORY = "Others"; // Define the category for new lessons

  useEffect(() => {
    async function fetchLessons() {
      try {
        const lessonsCollection = collection(db, "lessons");
        const lessonsSnapshot = await getDocs(lessonsCollection);
        let lessonsData = lessonsSnapshot.docs.map((doc) => ({
          category: doc.id,
          names: doc.data().names,
        }));

        // Sort alphabetically, but move "Others" to the end
        lessonsData = lessonsData
          .filter((lesson) => lesson.category !== OTHERS_CATEGORY)
          .sort((a, b) => a.category.localeCompare(b.category));

        // Add "Others" category at the end if it exists
        const othersCategory = lessonsSnapshot.docs.find((doc) => doc.id === OTHERS_CATEGORY);
        if (othersCategory) {
          lessonsData.push({
            category: OTHERS_CATEGORY,
            names: othersCategory.data().names,
          });
        }

        setLessons(lessonsData);
        setFilteredLessons(lessonsData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching lessons:", error);
        setLoading(false);
      }
    }
    fetchLessons();
  }, []);


  const toggleLesson = (lessonName) => {
    Keyboard.dismiss(); // Dismiss the keyboard

    // Wait a tiny bit to allow UI to process, then select the lesson
    setTimeout(() => {
      setError("");
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
    }, 100); // Small delay to allow keyboard dismissal first
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
        learn: selectedLessons,
      });
      router.push("/(onboarding)/TeachScreen");
    } catch (error) {
      console.error("Error updating Firestore:", error);
      Alert.alert("Error", "Failed to save your lessons. Please try again.");
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text.trim() === "") {
      setFilteredLessons(lessons);
      return;
    }

    const lowercasedText = text.toLowerCase();
    const filtered = lessons.map((lesson) => ({
      category: lesson.category,
      names: lesson.names.filter((name) => name.toLowerCase().includes(lowercasedText)),
    })).filter((lesson) => lesson.names.length > 0);

    setFilteredLessons(filtered);
  };


  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b3b98" />
        <Text style={styles.loadingText}>Loading Lessons...</Text>
      </View>
    );
  }

  const addNewLesson = async () => {
    if (!searchQuery.trim()) return;
    const newLesson = searchQuery.trim();

    try {
      const othersRef = doc(db, "lessons", OTHERS_CATEGORY);
      const othersDoc = await getDoc(othersRef);

      let updatedLessons;

      if (othersDoc.exists()) {
        // "Others" category exists, update it
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

      setLessons(updatedLessons);
      setFilteredLessons(updatedLessons);
      toggleLesson(newLesson);
      setSearchQuery("");
    } catch (error) {
      console.error("Error adding new lesson:", error);
      Alert.alert("Error", "Failed to add new lesson.");
    }
  };


  return (
    <View style={styles.container}>
      <OnboardingHeader />
      <Text style={styles.title}>What do you want to learn?</Text>
      <Text style={styles.subtitle}>Choose at most {MAX_SELECTION} subjects or skills</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.searchBar}
        placeholder="Search for a skill or subject..."
        value={searchQuery}
        onChangeText={handleSearch}
      />

      {searchQuery && !filteredLessons.some((lesson) => lesson.names.includes(searchQuery)) && (
        <TouchableOpacity style={styles.addButton} onPress={addNewLesson}>
          <Text style={styles.addButtonText}>Add "{searchQuery}"</Text>
        </TouchableOpacity>
      )}


      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {filteredLessons.map((lesson) => (
          <View key={lesson.category} style={styles.categoryContainer}>
            <Text style={styles.categoryTitle}>{lesson.category}</Text>
            <View style={styles.lessonGroup}>
              {lesson.names.map((name, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.lessonButton, selectedLessons.includes(name) && styles.selectedLesson]}
                  onPress={() => toggleLesson(name)}
                >
                  <Text style={[styles.lessonText, selectedLessons.includes(name) && styles.selectedLessonText]}>
                    {name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

    {/* Only show buttons when searchQuery is empty */}
    {searchQuery.trim() === "" && (
      <View style={styles.buttonContainer}>
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

});

export default LearnScreen;

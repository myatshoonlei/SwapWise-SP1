import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  updateDoc,
  collection,
  getDoc,
  getDocs,
} from "firebase/firestore";
import EditTeachLearnHeader from "../../components/EditTeachLearnHeader";
import { useRouter } from "expo-router";


const db = getFirestore();
const MAX_SELECTION = 5;
const OTHERS_CATEGORY = "Others"; // Category for new lessons

export default function EditLearn() {
  const auth = getAuth();
  const router = useRouter();
  const [lessons, setLessons] = useState([]);
  const [filteredLessons, setFilteredLessons] = useState([]);
  const [selectedLessons, setSelectedLessons] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLessons() {
      try {
        const user = auth.currentUser;
        if (!user) return;

        setLoading(true);

        // Fetch user data to get `teach` lessons
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);

        let currentLearnLessons = [];
        let teachLessons = []; // 🔹 Store lessons from Teach

        if (userDoc.exists()) {
          currentLearnLessons = userDoc.data().learn || [];
          teachLessons = userDoc.data().teach || []; // 🔹 Get teach lessons
        }

        const lessonsCollection = collection(db, "lessons");
        const lessonsSnapshot = await getDocs(lessonsCollection);
        let lessonsData = lessonsSnapshot.docs.map((doc) => ({
          category: doc.id,
          names: doc.data().names.filter((name) => !teachLessons.includes(name)), // 🔹 Remove teach lessons
        }));

        // Sort alphabetically but keep "Others" at the end
        lessonsData = lessonsData
          .filter((lesson) => lesson.category !== OTHERS_CATEGORY)
          .sort((a, b) => a.category.localeCompare(b.category));

        const othersCategory = lessonsSnapshot.docs.find((doc) => doc.id === OTHERS_CATEGORY);
        if (othersCategory) {
          const othersFiltered = othersCategory.data().names.filter(
            (name) => !teachLessons.includes(name) // 🔹 Remove teach lessons from "Others"
          );
          lessonsData.push({
            category: OTHERS_CATEGORY,
            names: othersFiltered,
          });
        }

        setLessons(lessonsData);
        setFilteredLessons(lessonsData);
        setSelectedLessons(currentLearnLessons);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching lessons:", error);
        setLoading(false);
      }
    }
    fetchLessons();
  }, []);


  const toggleLesson = (lessonName) => {
    setSelectedLessons((prevSelected) => {
      if (prevSelected.includes(lessonName)) {
        return prevSelected.filter((l) => l !== lessonName);
      } else if (prevSelected.length < MAX_SELECTION) {
        return [...prevSelected, lessonName];
      } else {
        Alert.alert("Limit Reached", `You can only select up to ${MAX_SELECTION} lessons.`);
        return prevSelected;
      }
    });
  };

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "No authenticated user found.");
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { learn: selectedLessons });

      // ✅ Navigate back after showing success message
      Alert.alert("Success", "Your Learn subjects have been updated!", [
        { text: "OK", onPress: () => router.back() },
      ]);
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
        <ActivityIndicator size="large" color="#1E1E84" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <EditTeachLearnHeader title="Edit Learn" />
      <Text style={styles.title}>Select what you want to learn</Text>

      <TextInput
        style={styles.searchBar}
        placeholder="Search for a skill or subject..."
        value={searchQuery}
        onChangeText={handleSearch}
      />

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
      </ScrollView>

      <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
        <Text style={styles.saveButtonText}>Save Changes</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: { fontSize: 20, fontWeight: "bold", textAlign: "center", marginBottom: 10, color: "#1E1E84" },
  searchBar: { borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 8, marginBottom: 16 },
  scrollContainer: { paddingBottom: 20 },
  categoryContainer: { marginBottom: 16, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: "#e0e0e0" },
  categoryTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 10, color: "#1E1E84" },
  lessonGroup: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center" },
  lessonButton: { padding: 10, borderRadius: 20, borderWidth: 1, borderColor: "#e0e0e0", backgroundColor: "#f5f5f5", margin: 5 },
  selectedLesson: { backgroundColor: "#1E1E84", borderColor: "#1E1E84" },
  selectedLessonText: { color: "#fff" },
  saveButton: { backgroundColor: "#1E1E84", padding: 10, borderRadius: 8, alignItems: "center", marginTop: 10 },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});


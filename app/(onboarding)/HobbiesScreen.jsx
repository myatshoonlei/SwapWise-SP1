import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  updateDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import OnboardingHeader from "../../components/OnBoardingHeader"
// Firebase initialization
import { app } from "../../firebaseConfig";
const db = getFirestore(app);

const HobbiesScreen = () => {
  const router = useRouter();
  const auth = getAuth();

  // State management
  const [hobbies, setHobbies] = useState([]);
  const [selectedHobbies, setSelectedHobbies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch hobbies from Firestore
  useEffect(() => {
    async function fetchHobbies() {
      try {
        const hobbiesCollection = collection(db, "hobbies");
        const hobbiesSnapshot = await getDocs(hobbiesCollection);
        const hobbiesData = hobbiesSnapshot.docs.map((doc) => ({
          category: doc.id,
          names: doc.data().names || [], // Default to an empty array if `names` is undefined
          id: doc.id,
        }));
        setHobbies(hobbiesData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching hobbies:", error);
        setLoading(false);
      }
    }
    fetchHobbies();
  }, []);

  const toggleHobby = (hobbyName) => {
    setSelectedHobbies((prevSelected) =>
      prevSelected.includes(hobbyName)
        ? prevSelected.filter((h) => h !== hobbyName)
        : [...prevSelected, hobbyName]
    );
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
        hobbies: selectedHobbies,
      });
      router.push("/(tabs)/Home"); // Navigate to the next screen
    } catch (error) {
      console.error("Error updating Firestore:", error);
      Alert.alert("Error", "Failed to save your hobbies. Please try again.");
    }
  };

  // Group hobbies by category
  const groupedHobbies = hobbies.reduce((groups, hobby) => {
    const category = hobby.category || "Uncategorized";
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(hobby);
    return groups;
  }, {});

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b3b98" />
        <Text style={styles.loadingText}>Loading Hobbies...</Text>
      </View>
    );
  }

  // Handle empty hobbies
  if (!hobbies.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          No hobbies found. Please try again later.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
              <OnboardingHeader />
          {/* Title */}
      <Text style={styles.title}>What are your hobbies and interests?</Text>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {hobbies.map((hobby) => (
          <View key={hobby.category} style={styles.categoryContainer}>
            <Text style={styles.categoryTitle}>{hobby.category}</Text>
            <View style={styles.hobbyGroup}>
              {hobby.names.map((name, index) => (
                <TouchableOpacity
                  key={`${hobby.category}-${name}-${index}`} // Unique key for each hobby
                  style={[
                    styles.hobbyButton,
                    selectedHobbies.includes(name) && styles.selectedHobby,
                  ]}
                  onPress={() => toggleHobby(name)}
                >
                  <Text
                    style={[
                      styles.hobbyText,
                      selectedHobbies.includes(name) &&
                        styles.selectedHobbyText,
                    ]}
                  >
                    {name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
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
          >
            <Text style={styles.sharedButtonText}>Next</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff", paddingTop: 45, },
  scrollContainer: { paddingBottom: 20 },
  // Title styling
    title: {
        fontSize: 25,
        fontWeight: "600",
        marginTop: 20,  // <-- Add marginTop for spacing
        marginBottom: 16,
        color: "#000",
        textAlign: "center",
        width: "100%",
    },
  categoryContainer: {
    marginBottom: 16,
    backgroundColor: "#f9f9f9",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#3b3b98",
  },
  hobbyGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  hobbyButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#f5f5f5",
    margin: 5,
    minWidth: 80,
    alignItems: "center",
  },
  selectedHobby: { backgroundColor: "#3b3b98", borderColor: "#3b3b98" },
  hobbyText: { fontSize: 14, color: "#000" },
  selectedHobbyText: { color: "#fff" },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  sharedButton: {
    backgroundColor: "#3b3b98",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 3,
  },
  sharedButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginHorizontal: 10,
  },
  backButton: { alignSelf: "flex-start" },
  nextButton: { alignSelf: "flex-end" },
  loadingText: { fontSize: 16, marginTop: 10, color: "#3b3b98" },
  errorText: { fontSize: 16, color: "red", textAlign: "center", marginTop: 20 },
});

export default HobbiesScreen;
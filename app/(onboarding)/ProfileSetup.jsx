import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import OnboardingHeader from "../../components/OnBoardingHeader";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import {
  collection as firestoreCollection,
  getDocs,
  doc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import Icon from "react-native-vector-icons/MaterialIcons";
import * as ImageManipulator from 'expo-image-manipulator';
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  uploadBytesResumable,
} from "firebase/storage";
import { db, storage } from "../../firebaseConfig";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "../../context/authContext";

const ProfileSetup = () => {
  const router = useRouter();
  const { user } = useAuth();

  const [image, setImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState("");
  const [birthday, setBirthday] = useState(null);
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [university, setUniversity] = useState("");
  const [error, setError] = useState("");

  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [universities, setUniversities] = useState([]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loadingProvinces, setLoadingProvinces] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingUniversities, setLoadingUniversities] = useState(true);
  const [isGoogleSignIn, setIsGoogleSignIn] = useState(false); // Track if it's Google Sign-In

    useEffect(() => {
      if (user) {
        console.log("User UID:", user.uid);
      } else {
        console.log("User is not authenticated.");
      }
    }, [user]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          console.log("Fetched User Data:", userData); // Debugging line

          // Check if the user signed in with Google
          const isGoogle = user.providerData.some(
            (provider) => provider.providerId === "google.com"
          );

          if (userData.profilePicture) {
            setImage(userData.profilePicture); // Set profile picture from Firestore
            console.log("Profile picture set to:", userData.profilePicture); // Debugging line
          }

          setIsGoogleSignIn(isGoogle);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUserProfile();
  }, [user]);




  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const provincesCollection = firestoreCollection(db, "provinces");
        const provincesSnapshot = await getDocs(provincesCollection);
        const provincesList = provincesSnapshot.docs.map((doc) => doc.id);
        setProvinces(provincesList);
      } catch (error) {
        console.error("Error fetching provinces:", error);
      } finally {
        setLoadingProvinces(false);
      }
    };

    fetchProvinces();
  }, []);

  useEffect(() => {
    const fetchUniversities = async () => {
      try {
        const universitiesCollection = firestoreCollection(db, "universities");
        const universitiesSnapshot = await getDocs(universitiesCollection);
        const universitiesList = universitiesSnapshot.docs.map(
          (doc) => doc.data().name
        );
        setUniversities(universitiesList);
      } catch (error) {
        console.error("Error fetching universities:", error);
      } finally {
        setLoadingUniversities(false);
      }
    };

    fetchUniversities();
  }, []);

  const retryUpload = async (user, imageUri, retries = 3) => {
      let attempt = 0;
      while (attempt < retries) {
          const url = await uploadImage(user, imageUri);
          if (url) return url;
          attempt++;
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait before retrying
      }
      throw new Error("Failed to upload image after multiple attempts.");
  };


  const fetchDistricts = async (selectedProvince) => {
    setLoadingDistricts(true);
    try {
      const provinceDoc = doc(db, "provinces", selectedProvince);
      const provinceSnapshot = await getDoc(provinceDoc);
      setDistricts(
        provinceSnapshot.exists() ? provinceSnapshot.data().districts || [] : []
      );
    } catch (error) {
      console.error("Error fetching districts:", error);
    } finally {
      setLoadingDistricts(false);
    }
  };

  const handleProvinceChange = (selectedProvince) => {
    setProvince(selectedProvince);
    setDistrict("");
    fetchDistricts(selectedProvince);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const today = new Date();
      const birthYear = selectedDate.getFullYear();
      const currentYear = today.getFullYear();
      const age = currentYear - birthYear;

      if (age < 16) {
        Alert.alert("Age Restriction", "You must be at least 16 years old to use this app.");
        return;
      }

      setBirthday(selectedDate.toISOString().split("T")[0]);
    }
  };


  const pickImage = async () => {
    if (isGoogleSignIn) {
      Alert.alert("Google Sign-In", "You cannot change your profile picture.");
      return; // Stop function execution
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "We need access to your gallery.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
    }
  };




    const uploadImage = async (user, imageUri) => {
      if (!imageUri) {
        console.error("No image URI found!");
        return null;
      }

      try {
        setUploading(true);
        console.log("Starting image upload...");

        // Ensure fetch works correctly
        const response = await fetch(imageUri);
        if (!response.ok) {
          throw new Error("Failed to fetch the image URI.");
        }

        const blob = await response.blob();

        // Create a storage reference
        const storageRef = ref(storage, `ProfilePictures/${user.uid}/profile.jpg`);

        // Upload to Firebase Storage
        const snapshot = await uploadBytes(storageRef, blob);

        // Get the download URL
        const downloadUrl = await getDownloadURL(snapshot.ref);
        console.log("Download URL:", downloadUrl);

        setUploading(false);
        return downloadUrl;
      } catch (error) {
        console.error("Upload failed:", error);
        setUploading(false);
        return null;
      }
    };

  const handleNext = async () => {
      imageUrl = await retryUpload(user, image);

    if (!username || !gender || !birthday || !province || !district || !university) {
      setError("All fields are required.");
      return;
    }
    setError("");

    try {
      if (!user) {
        Alert.alert("Error", "User not authenticated.");
        return;
      }

      let imageUrl = image; // Keep existing profile picture for Google users
      if (!isGoogleSignIn && image) {
        imageUrl = await uploadImage(user, image);
        if (!imageUrl) {
          throw new Error("Failed to upload image");
        }
      }

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        username,
        gender,
        birthday,
        province,
        district,
        university,
        profilePicture: imageUrl || "",
      });

      router.push("/(onboarding)/LearnScreen");
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile: " + error.message);
    }
  };



  return (
    <View style={styles.container}>
      <OnboardingHeader />
      <ScrollView contentContainerStyle={[styles.scrollContainer, { flexGrow: 1 }]}>

      <Text style={styles.title}>Create Your Profile</Text>

      <View style={styles.profileImageContainer}>
        <Image
          source={
            image
              ? { uri: image }  // Show fetched profile picture
              : require("../../assets/default-profile.png") // Show default if none
          }
          style={styles.profileImage}
        />

        <TouchableOpacity
          style={[styles.cameraIconContainer, isGoogleSignIn && { opacity: 0.5 }]} // Dim the button
          onPress={() => {
            if (!isGoogleSignIn) {
              console.log("Camera Icon Pressed");
              pickImage();
            } else {
              Alert.alert("Google Sign-In", "You cannot change your profile picture.");
            }
          }}
          disabled={isGoogleSignIn} // Disable click event
        >
          <Icon name="camera-alt" size={24} color="#333" />
        </TouchableOpacity>

      </View>

      {/* Username */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your username"
          value={username}
          onChangeText={setUsername}
        />
      </View>

      {/* Gender */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Gender</Text>
        <View style={styles.genderContainer}>
          {["Male", "Female", "Secret"].map((g) => (
            <TouchableOpacity
              key={g}
              style={[
                styles.genderButton,
                gender === g && styles.genderButtonSelected,
              ]}
              onPress={() => setGender(g)}
            >
              <Text
                style={[
                  styles.genderText,
                  gender === g && styles.genderTextSelected,
                ]}
              >
                {g}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Birthday */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Birthday</Text>
        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowDatePicker(true)}
        >
          <Text>{birthday || "Select your birthday"}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={birthday ? new Date(birthday) : new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}
      </View>

      {/* Province */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Province</Text>
        {loadingProvinces ? (
          <Text>Loading provinces...</Text>
        ) : (
          <Picker
            selectedValue={province}
            onValueChange={handleProvinceChange}
            style={styles.picker}
          >
            <Picker.Item label="Select your province" value="" />
            {provinces.map((prov) => (
              <Picker.Item key={prov} label={prov} value={prov} />
            ))}
          </Picker>
        )}
      </View>

      {/* District */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>District</Text>
        {loadingDistricts ? (
          <Text>Loading districts...</Text>
        ) : (
          <Picker
            selectedValue={district}
            onValueChange={(itemValue) => setDistrict(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Select your district" value="" />
            {districts.map((dist) => (
              <Picker.Item key={dist} label={dist} value={dist} />
            ))}
          </Picker>
        )}
      </View>

      {/* University */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>University</Text>
        {loadingUniversities ? (
          <Text>Loading universities...</Text>
        ) : (
          <Picker
            selectedValue={university}
            onValueChange={(itemValue) => setUniversity(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Select your university" value="" />
            {universities.map((uni, index) => (
              <Picker.Item key={index} label={uni} value={uni} />
            ))}
          </Picker>
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={{ marginBottom: 20, alignItems: "center" }}>
        <TouchableOpacity style={styles.nextButton} onPress={handleNext} disabled={uploading}>
          <Text style={styles.nextButtonText}>{uploading ? "Uploading..." : "Next"}</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    backgroundColor: "#fff",
    paddingTop: 45,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
    paddingTop: 20, // Space for header
    paddingBottom: 80,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  profileImageContainer: { alignItems: "center", marginBottom: 16 },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1,
    padding: 5,
  },
  cameraIconContainer: { position: "absolute", bottom: 0, right: 0 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 16, marginBottom: 8 },
    input: {
      backgroundColor: "#F0F0F0", // Light gray background
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
    },
    pickerContainer: {
      backgroundColor: "#F0F0F0", // Light gray background
      borderRadius: 8,  // ✅ Ensures rounded corners
      paddingHorizontal: 12,
      height: 50,  // ✅ Matches other input fields
      justifyContent: "center",
    },
    picker: {
      fontSize: 16,
      backgroundColor: "#F0F0F0", // Light gray background
      borderRadius: 8,  // ✅ Ensures rounded corners
    },

  genderContainer: { flexDirection: "row", justifyContent: "space-around" },
  genderButton: { padding: 10, borderWidth: 1, borderRadius: 8 },
  genderButtonSelected: { backgroundColor: "#3b3b98" },
  genderText: { textAlign: "center" },
  genderTextSelected: { color: "#fff" },
  error: { color: "red", textAlign: "center", marginBottom: 16 },
  nextButton: { backgroundColor: "#3b3b98", padding: 10, borderRadius: 8 },
  nextButtonText: { color: "#fff", textAlign: "center", fontSize: 16 },
});

export default ProfileSetup;
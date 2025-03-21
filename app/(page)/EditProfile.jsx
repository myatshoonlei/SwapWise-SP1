import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import EditProfileHeader from "../../components/EditProfileHeader";
import { useRouter } from "expo-router";

export default function EditProfile() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  const auth = getAuth();
  const db = getFirestore();
  const router = useRouter();
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!currentUserId) return;
      try {
        const userDoc = await getDoc(doc(db, "users", currentUserId));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setName(data.name || "");
          setUsername(data.username || "");
          setProfilePicture(data.profilePicture || null);
          setProvince(data.province || "");
          setDistrict(data.district || "");
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [currentUserId]);

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const provincesCollection = collection(db, "provinces");
        const provincesSnapshot = await getDocs(provincesCollection);
        const provincesList = provincesSnapshot.docs.map((doc) => doc.id);
        setProvinces(provincesList);
      } catch (error) {
        console.error("Error fetching provinces:", error);
      }
    };

    fetchProvinces();
  }, []);

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

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfilePicture(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !username.trim() || !province || !district) {
      Alert.alert("Error", "All fields must be filled.");
      return;
    }

    setUpdating(true);

    try {
      await updateDoc(doc(db, "users", currentUserId), {
        name,
        username,
        profilePicture,
        province,
        district,
      });
      Alert.alert("Success", "Profile updated successfully!");
      router.back(); // Go back to profile screen
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#1E1E84" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <EditProfileHeader />

      {/* Profile Picture */}
      <View style={styles.profileContainer}>
        <Text style={styles.title}>Profile Picture</Text>
        <Image
          source={
            profilePicture
              ? { uri: profilePicture }
              : require("../../assets/default-profile.png")
          }
          style={styles.profileImage}
        />
        <TouchableOpacity style={styles.editIcon} onPress={pickImage}>
          <Ionicons name="camera" size={18} color="#1E1E84" />
        </TouchableOpacity>
      </View>


      {/* Full Name Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          value={name}
          onChangeText={setName}
        />
      </View>

      {/* Username Input */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Username</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your username"
          value={username}
          onChangeText={setUsername}
        />
      </View>

      {/* Province Picker */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Province</Text>
        <View style={styles.pickerContainer}>
          <Picker selectedValue={province} onValueChange={handleProvinceChange} style={styles.picker}>

          <Picker.Item label="Select your province" value="" />
          {provinces.map((prov) => (
            <Picker.Item key={prov} label={prov} value={prov} />
          ))}
        </Picker>
        </View>
      </View>

      {/* District Picker */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>District</Text>
        {loadingDistricts ? (
          <Text>Loading districts...</Text>
        ) : (
          <View style={styles.pickerContainer}>
            <Picker selectedValue={district} onValueChange={(itemValue) => setDistrict(itemValue)} style={styles.picker}>

            <Picker.Item label="Select your district" value="" />
            {districts.map((dist) => (
              <Picker.Item key={dist} label={dist} value={dist} />
            ))}
          </Picker>
          </View>
        )}
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={updating}>
        {updating ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Save</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    alignItems: "center",
    paddingTop: 50,
  },
  profileContainer: { alignItems: "center", marginBottom: 20 },
  profileImage: { width: 120, height: 120, borderRadius: 60 },
  editIcon: {
      position: "absolute",
      bottom: 5,
      right: 5,
      backgroundColor: "#FFFFFF",
      borderRadius: 15,
      padding: 5,
    },
title: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    textAlign: "center",
  },
  inputContainer: { width: "100%", marginBottom: 15 },
  inputLabel: { fontSize: 16, fontWeight: "bold", color: "#1E1E84", marginBottom: 5 },
  input: { padding: 12, borderWidth: 1, backgroundColor: "#F0F0F0", borderColor: "#CCC", borderRadius: 10, fontSize: 16 },
  pickerContainer: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#CCC",
    borderRadius: 10,
    backgroundColor: "#F0F0F0", // Same as text input
    paddingHorizontal: 12,
    height: 50, // Ensure consistent height
    justifyContent: "center",
  },

  picker: {
    width: "100%",
    fontSize: 16,
    color: "#000", // Ensures text is visible
  },

  saveButton: { backgroundColor: "#1E1E84", paddingVertical: 12, paddingHorizontal: 30, borderRadius: 10 },
  saveButtonText: { color: "#FFFFFF", fontWeight: "bold", fontSize: 16 },
});


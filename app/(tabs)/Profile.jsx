import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getAuth, signOut, signInWithCredential, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { getAverageRating } from "../(recommendation)/Scoring"; // Adjust the path
import { useRouter } from "expo-router";

export default function Profile() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const auth = getAuth();
  const db = getFirestore();
  const router = useRouter();
  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
      const fetchUserData = async () => {
        try {
          if (currentUserId) {
            const userDoc = await getDoc(doc(db, "users", currentUserId));
            if (userDoc.exists()) {
              const userDataFromDB = userDoc.data();

              // Fetch rating from reviews collection
              const avgRating = await getAverageRating(currentUserId);

              setUserData({
                ...userDataFromDB,
                rating: avgRating, // Store rating from reviews
              });
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchUserData();
    }, [currentUserId]);

  const handleGoogleSignIn = async (googleCredential) => {
    try {
      const credential = GoogleAuthProvider.credential(googleCredential.idToken);
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;

      // Check if user exists in Firestore
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        // Save user details in Firestore
        await setDoc(userDocRef, {
          name: user.displayName,
          email: user.email,
          profilePicture: user.photoURL || "https://via.placeholder.com/150",
          username: user.email.split("@")[0], // Generate a default username
          rating: 0, // Default rating
        });
      }
    } catch (error) {
      console.error("Google Sign-In Error:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log("Logged out successfully!");
      router.push("/(auth)/LogIn");
    } catch (error) {
      console.error("Sign out error:", error.message);
      Alert.alert("Error", error.message);
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
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        <View style={styles.profileContainer}>
          <Image
            source={
              userData?.profilePicture
                ? { uri: userData.profilePicture }
                : require("../../assets/default-profile.png")
            }
            style={styles.profileImage}
          />
          <TouchableOpacity
            style={styles.editIcon}
            onPress={() => router.push("/(page)/EditProfile")}
          >
            <Ionicons name="pencil" size={18} color="#1E1E84" />
          </TouchableOpacity>
        </View>

        <Text style={styles.userName}>{userData?.name || "User"}</Text>
        <Text style={styles.userHandle}>@{userData?.username || "username"}</Text>

        {/* Star Rating */}
        <View style={styles.ratingContainer}>
          {[...Array(5)].map((_, index) => (
            <Ionicons
              key={index}
              name={userData?.rating && index < Math.round(userData.rating) ? "star" : "star-outline"}
              size={24}
              color="#FFD700"
            />
          ))}
          <Text style={styles.ratingText}>({userData?.rating?.toFixed(1) || "0.0"})</Text>
        </View>

        {/* Teach & Learn Sections */}
        <View style={styles.teachLearnContainer}>
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Teach</Text>
            <View style={styles.infoTags}>
              {Array.isArray(userData?.teach) && userData.teach.length > 0 ? (
                userData.teach.map((skill, index) => (
                  <Text key={index} style={styles.tag}>{skill.trim()}</Text>
                ))
              ) : (
                <Text style={styles.sectionText}>Not set</Text>
              )}
            </View>
            <TouchableOpacity style={styles.editButtonBelow} onPress={() => router.push("/(page)/EditTeach")}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Learn</Text>
            <View style={styles.infoTags}>
              {Array.isArray(userData?.learn) && userData.learn.length > 0 ? (
                userData.learn.map((skill, index) => (
                  <Text key={index} style={styles.tag}>{skill.trim()}</Text>
                ))
              ) : (
                <Text style={styles.sectionText}>Not set</Text>
              )}
            </View>
            <TouchableOpacity style={styles.editButtonBelow} onPress={() => router.push("/(page)/EditLearn")}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sign Out Button (Inside ScrollView now) */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 80, // Ensures space above bottom navigation
  },

  contentWrapper: {
    flex: 1,
    width: "100%",
    justifyContent: "center", // Centers content in available space
  },
  signOutButton: {
    backgroundColor: "#FF0000",
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 30,
    alignSelf: "center",
    marginTop: 20, // Pushes it below the Learn section
  },

  backButton: {
    position: "absolute",
    top: 20,
    left: 20,
  },
  infoTags: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 5,
      marginTop: 5,
    },
    tag: {
      backgroundColor: "rgba(30, 30, 132, 0.1)", // 🔵 Soft background
      color: "#1E1E84",
      fontWeight: "600",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 10,
      fontSize: 12,
    },
sectionTitle: {
  fontSize: 16,
  fontWeight: "bold",
  color: "#1E1E84",
  marginBottom: 12, // ⬅️ Added spacing below the title
},

editButtonBelow: {
  backgroundColor: "#1E1E84",
  alignSelf: "flex-end", // Align to the right
  paddingHorizontal: 14,
  paddingVertical: 6,
  borderRadius: 8,
  marginTop: 14, // ⬅️ Increased spacing between lessons and Edit button
},

editButtonText: {
  color: "white",
  fontSize: 12,
  fontWeight: "bold",
},

  profileContainer: {
    alignItems: "center",
    position: "relative",
    marginTop: -30, // ⬅️ Moves profile picture higher
  },

  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  editIcon: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 5,
  },
  userName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1E1E84",
    marginTop: 10,
  },
  userHandle: {
    fontSize: 14,
    color: "#777",
    marginBottom: 10,
  },
  ratingContainer: {
    flexDirection: "row",
    marginBottom: 20,
  },
    ratingText: {
      fontSize: 14,
      fontWeight: "bold",
      color: "#777",
      marginLeft: 5,
    },
  editButton: {
    backgroundColor: "#1E1E84",
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 30,
    marginBottom: 20,
  },
  editButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },

  signOutButtonText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 16,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
sectionContainer: {
    backgroundColor: "#F0F0F0",
    borderRadius: 10,
    padding: 15,
    width: "100%", // Ensure it takes full width
    paddingHorizontal: 20, // Add horizontal padding for spacing
    alignSelf: "stretch", // Stretch it across the screen
    marginBottom: 10,
    minHeight: 120, // Ensures consistent size
  },
  sectionText: {
    fontSize: 14,
    color: "#333",
    flex: 1, // Allow text to expand properly
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },

teachLearnContainer: {
    width: "100%", // Stretch across screen
    alignItems: "flex-start", // Align contents (text & tags) to the left
    marginTop: 20,
  },


  editIconSmall: {
    padding: 5,
    marginLeft: 10,
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: "center",
    paddingBottom: 30, // Ensure enough space for scrolling
  },


});
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  FlatList
} from "react-native";
import { auth, db } from "../../firebaseConfig";
import { collection, query, where, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { AirbnbRating } from "react-native-ratings";
import { useRouter } from "expo-router";
import { Rating } from "react-native-ratings";

const Home = () => {
  const [userName, setUserName] = useState("");
  const [matchedUsers, setMatchedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [rating, setRating] = useState(4);
  const [reviewText, setReviewText] = useState("");
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await fetchUserName(user.uid);
        await fetchMatchedUsers(user.uid);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchUserName = async (uid) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        setUserName(userDoc.data().name);
      }
    } catch (error) {
      console.error("Error fetching user name:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatchedUsers = async (uid) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();

        if (userData.matches && userData.matches.length > 0) {
          const matchUserIds = userData.matches.map((match) => match.userId);

          const matchedUsersPromises = matchUserIds.map(async (matchUserId) => {
            const matchUserDocRef = doc(db, "users", matchUserId);
            const matchUserDoc = await getDoc(matchUserDocRef);

            if (matchUserDoc.exists()) {
              const matchUserData = matchUserDoc.data();
              const reviewDocRef = doc(db, "reviews", `${uid}_${matchUserId}`);
              const reviewDoc = await getDoc(reviewDocRef);

              return {
                id: matchUserId,
                ...matchUserData,
                hasReview: reviewDoc.exists(),
                rating: reviewDoc.exists() ? reviewDoc.data().rating : null,
                reviewText: reviewDoc.exists() ? reviewDoc.data().reviewText : "",
                profilePicture: matchUserData.profilePicture || require("../../assets/default-profile.png"),
              };
            }
            return null;
          });

          const matchedUsers = (await Promise.all(matchedUsersPromises)).filter(user => user !== null);
          const uniqueMatchedUsers = matchedUsers.filter((user, index, self) =>
            index === self.findIndex((u) => u.id === user.id)
          );
          setMatchedUsers(uniqueMatchedUsers);

          console.log("Matched Users:", matchedUsers);

        } else {
          setMatchedUsers([]);
        }
      } else {
        setMatchedUsers([]);
      }
    } catch (error) {
      console.error("Error fetching matched users:", error);
      setMatchedUsers([]);
    }
  };


  const openReviewModal = (user) => {
    setSelectedUser(user);
    setRating(user.rating ?? 4); // Ensure a valid rating
    setReviewText(user.reviewText || "");
    setModalVisible(true);
  };


  const submitReview = async () => {
    if (!selectedUser) return;
    try {
      Keyboard.dismiss();
      const reviewDocRef = doc(db, "reviews", `${auth.currentUser.uid}_${selectedUser.id}`);
      await setDoc(reviewDocRef, {
        reviewerId: auth.currentUser.uid,
        reviewedUserId: selectedUser.id,
        rating: rating,
        reviewText: reviewText,
        createdAt: new Date(),
      });

      console.log("Review submitted successfully!");
      await fetchMatchedUsers(auth.currentUser.uid);
    } catch (error) {
      console.error("Error submitting review:", error);
    }
    setModalVisible(false);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1E1E84" />
      </View>
    );
  }

    const RatingComponent = ({ rating = 0 }) => {
      return (
        <Rating
          startingValue={rating}
          readonly
          imageSize={20} // Adjust star size if needed
        />
      );
    };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Welcome {userName ? `${userName},` : "to SwapWise"}</Text>

      {/* Matched Users & Reviews Section */}
      <Text style={styles.sectionTitle}>Ratings and Reviews</Text>
      <View style={styles.reviewContainer}>
        {matchedUsers.length > 0 ? (
          <FlatList
            data={matchedUsers}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => openReviewModal(item)} style={styles.reviewCard}>
                <Image
                  style={styles.userImage}
                  source={
                    typeof item.profilePicture === "string"
                      ? { uri: item.profilePicture }
                      : item.profilePicture
                  }
                />
                <Text style={styles.userName}>{item.name}</Text>
                <RatingComponent rating={item.rating ?? 0} />
              </TouchableOpacity>
            )}
          />
        ) : (
          <Text style={styles.noPendingReviews}>No matched users available</Text>
        )}
      </View>



      {/* Review Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {selectedUser && (
                <>
                  <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                    <Text style={styles.closeButtonText}>✖</Text>
                  </TouchableOpacity>

                  <Text style={styles.modalTitle}>{selectedUser.name}</Text>
                  <Text style={styles.modalSubtitle}>How was your learning experience?</Text>

                  <Rating
                    startingValue={rating}
                    imageSize={30}
                    showRating={false}
                    onFinishRating={setRating} // This updates the rating when the user selects a star
                  />

                  <TextInput
                    style={styles.reviewInput}
                    placeholder="Add detailed review..."
                    multiline
                    value={reviewText}
                    onChangeText={setReviewText}
                  />

                  <TouchableOpacity style={styles.submitButton} onPress={submitReview}>
                    <Text style={styles.submitButtonText}>Done</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <TouchableOpacity
        style={styles.findPartnersButton}
        onPress={() => router.push("/(tabs)/Discover")}
      >
        <Text style={styles.findPartnersText}>Find More Partners →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};




const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1E1E84",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E1E84",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  matchesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 15,
  },
  matchItem: {
    alignItems: "center",
    width: 80,
  },
  matchImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  matchName: {
    fontSize: 14,
    color: "#333",
    marginTop: 5,
  },
  noMatchesText: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    marginTop: 20,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: 300,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#555",
    marginVertical: 10,
  },
  reviewInput: {
    width: "100%",
    height: 80,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginTop: 10,
    borderRadius: 8,
  },
  submitButton: {
    backgroundColor: "#1E1E84",
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
  },
  submitButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  closeButton: {
      position: "absolute",
      top: 10,
      right: 10,

      borderRadius: 10,

    },
    closeButtonText: {
      fontSize: 18,
      color: "#555",
    },

  findPartnersButton: {
    marginTop: 30,
    backgroundColor: "#1E1E84",
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  findPartnersText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
reviewContainer: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 3, // Adds a slight shadow for better UI
  },

  reviewCard: {
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 10,
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2, // For Android shadow
    width: 120, // Adjust width for better centering
  },


  userImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 5, // Add spacing between image and name
    alignSelf: "center",
  },

  userName: {
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 5, // Ensure spacing before the rating
  },

  noPendingReviews: { textAlign: "center", fontSize: 14, color: "#777", padding: 10 },

});
export default Home;

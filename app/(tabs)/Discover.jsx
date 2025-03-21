import {
 View,
 Text,
 ActivityIndicator,
 Image,
 StyleSheet,
 TouchableOpacity,
 Alert,
 Dimensions,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../../context/authContext";
import {
 addDoc,
 setDoc,  // ✅ Fix: Import setDoc
 deleteDoc,  // ✅ Fix: Import deleteDoc
 arrayUnion,
 collection,
 doc,
 getDoc,
 getDocs,
 limit,
 query,
 Timestamp,
 updateDoc,
 where,
} from "firebase/firestore";
import { getAge } from '../../utils/common';
import recommendProfiles from "../(recommendation)/Recommendation";
import { db } from "../../firebaseConfig";
import { AntDesign, FontAwesome } from "@expo/vector-icons";
import Swiper from "react-native-deck-swiper";
import { useRouter } from "expo-router";
// Import boy profile pictures
import Boy1 from "../../assets/pfp/boy/boy1.jpg";
import Boy2 from "../../assets/pfp/boy/boy2.jpg";
import Boy3 from "../../assets/pfp/boy/boy3.jpg";
import Boy4 from "../../assets/pfp/boy/boy4.jpg";
import Boy5 from "../../assets/pfp/boy/boy5.jpg";

// Import girl profile pictures
import Girl1 from "../../assets/pfp/girl/girl1.jpg";
import Girl2 from "../../assets/pfp/girl/girl2.jpg";
import Girl3 from "../../assets/pfp/girl/girl3.jpg";
import Girl4 from "../../assets/pfp/girl/girl4.jpg";
import Girl5 from "../../assets/pfp/girl/girl5.jpg";


export default function Discover() {
 const { user } = useAuth();
 const [recommendedUsers, setRecommendedUsers] = useState([]);
 const [loading, setLoading] = useState(false);
 const [swipedUserIds, setSwipedUserIds] = useState(new Set());
 const [currentCardIndex, setCurrentCardIndex] = useState(0);
 const [showingOneWayMatch, setShowingOneWayMatch] = useState(false);
 const [nopeProfiles, setNopeProfiles] = useState([]); // Store full profile objects
 const [refreshKey, setRefreshKey] = useState(0);
 const swiperRef = useRef(null);
 const router = useRouter();

 const { height } = Dimensions.get("window");
 const CARD_HEIGHT = height * 0.7;

 const boyProfileImages = [Boy1, Boy2, Boy3, Boy4, Boy5];
 const girlProfileImages = [Girl1, Girl2, Girl3, Girl4, Girl5];

 const getConsistentProfileImage = (userId, gender) => {
   const images = gender === "Male" ? boyProfileImages : girlProfileImages;
   const index = Math.abs(hashCode(userId)) % images.length;
   return images[index]; // 🔥 Fixed image based on userId
 };

 // Helper function to generate a consistent hash code
 const hashCode = (str) => {
   let hash = 0;
   for (let i = 0; i < str.length; i++) {
     hash = str.charCodeAt(i) + ((hash << 5) - hash);
   }
   return hash;
 };

 useEffect(() => {
   if (user) {
     initialFetch();
   }
 }, [user]);

 const initialFetch = async () => {
   try {
     setLoading(true);

     // ✅ Fetch all users the current user has already matched with
     const userDocRef = doc(db, "users", user?.uid);
     const userDoc = await getDoc(userDocRef);
     let matchedUserIds = new Set();

     if (userDoc.exists()) {
       const userData = userDoc.data();
       matchedUserIds = new Set(userData.matches?.map(match => match.userId) || []);
     }

     // ✅ Fetch all users the current user has swiped
     const swipedQuery = query(
       collection(db, "likes"),
       where("fromUserId", "==", user?.uid)
     );
     const swipedDocs = await getDocs(swipedQuery);
     const swipedIds = new Set(swipedDocs.docs.map((doc) => doc.data().toUserId));

     setSwipedUserIds(swipedIds);

     // ✅ Fetch all users
     const usersCollection = collection(db, "users");
     const querySnapshot = await getDocs(query(usersCollection, limit(50)));

     let usersList = querySnapshot.docs
       .map((doc) => {
         const userData = doc.data();
         return {
           id: doc.id,
           ...userData,
           teach: userData.teach || [],
           learn: userData.learn || [],
           hobbies: userData.hobbies || [],
           location: userData.location || [0, 0],
           age: userData.birthday ? getAge(userData.birthday) : null,
           profilePicture: userData.profilePicture || getConsistentProfileImage(doc.id, userData.gender),
         };
       })
       .filter(
         (potentialUser) =>
           !swipedIds.has(potentialUser.id) && // ✅ Exclude already swiped users
           !matchedUserIds.has(potentialUser.id) && // ✅ Exclude already matched users
           potentialUser.id !== user?.uid // ✅ Exclude self
       );

     const currentUser = userDoc.exists() ? userDoc.data() : null;
     if (!currentUser) {
       console.error("Current user not found in database");
       return;
     }

     // ✅ Rank recommendations using recommendation system
     const recommendations = await recommendProfiles(currentUser, usersList);
     setRecommendedUsers([...new Set(recommendations)]); // ✅ Prevent duplicates
   } catch (error) {
     console.error("Error in initial fetch:", error);
   } finally {
     setLoading(false);
   }
 };


 const handleLikeAction = async (cardIndex) => {
   const swipedUser = recommendedUsers[cardIndex];
   if (!swipedUser) return;

   try {
     setSwipedUserIds((prev) => new Set([...prev, swipedUser.id]));

     // ✅ Remove from NOPE when liked
     try {
       const nopeDocRef = doc(db, "nopeUsers", `${user?.uid}_${swipedUser.id}`);
       await deleteDoc(nopeDocRef);
     } catch (error) {
       console.error("Error removing from nope:", error);
     }

     // ✅ Add to Likes
     await addDoc(collection(db, "likes"), {
       fromUserId: user?.uid,
       toUserId: swipedUser.id,
       createdAt: Timestamp.fromDate(new Date()),
     });

     // ✅ Check for Mutual Likes
     const mutualQuery = query(
       collection(db, "likes"),
       where("fromUserId", "==", swipedUser.id),
       where("toUserId", "==", user?.uid)
     );
     const mutualDocs = await getDocs(mutualQuery);

     if (!mutualDocs.empty) {
       const userRef = doc(db, "users", user?.uid);
       const swipedUserRef = doc(db, "users", swipedUser.id);

       await Promise.all([
         updateDoc(userRef, {
           matches: arrayUnion({
             userId: swipedUser.id,
             matchedAt: Timestamp.fromDate(new Date()),
           }),
         }),
         updateDoc(swipedUserRef, {
           matches: arrayUnion({
             userId: user?.uid,
             matchedAt: Timestamp.fromDate(new Date()),
           }),
         }),
       ]);

       // ✅ DELETE LIKE RECORD FROM FIRESTORE
       try {
         const likeDocQuery = query(
           collection(db, "likes"),
           where("fromUserId", "==", user?.uid),
           where("toUserId", "==", swipedUser.id)
         );
         const likeDocs = await getDocs(likeDocQuery);

         likeDocs.forEach(async (doc) => {
           await deleteDoc(doc.ref);
         });

         const reverseLikeQuery = query(
           collection(db, "likes"),
           where("fromUserId", "==", swipedUser.id),
           where("toUserId", "==", user?.uid)
         );
         const reverseLikeDocs = await getDocs(reverseLikeQuery);

         reverseLikeDocs.forEach(async (doc) => {
           await deleteDoc(doc.ref);
         });
       } catch (error) {
         console.error("Error removing mutual likes:", error);
       }

       Alert.alert("It's a Match! 🎉", "You and this person liked each other!");

       // ✅ Fetch user data and send match notifications
       const [user1Doc, user2Doc] = await Promise.all([
         getDoc(userRef),
         getDoc(swipedUserRef),
       ]);

       if (user1Doc.exists() && user2Doc.exists()) {
         const [username1, username2] = [
           user1Doc.data().name,
           swipedUser.name,
         ];
         const [token1, token2] = [
           user1Doc.data().expoPushToken,
           swipedUser.expoPushToken,
         ];

         if (token1)
           sendNotification(token1, `You matched with ${username2}!`);
         if (token2)
           sendNotification(token2, `You matched with ${username1}!`);
       }
     }
   } catch (error) {
     console.error("Error handling like action:", error);
   }
 };


 const handleSwipeRight = async (cardIndex) => {
   await handleLikeAction(cardIndex);
   setCurrentCardIndex((prevIndex) => prevIndex + 1);
 };

 const handleSwipeLeft = async (cardIndex) => {
   if (recommendedUsers.length > 0 && cardIndex < recommendedUsers.length) {
     const swipedUser = recommendedUsers[cardIndex];

     if (swipedUser) {
       setSwipedUserIds((prev) => new Set([...prev, swipedUser.id]));

       // ✅ Store NOPE users persistently in Firestore
       try {
         await setDoc(doc(db, "nopeUsers", `${user?.uid}_${swipedUser.id}`), {
           fromUserId: user?.uid,
           toUserId: swipedUser.id,
           createdAt: Timestamp.fromDate(new Date()),
         });
       } catch (error) {
         console.error("Error storing nope user:", error);
       }
     }

     setCurrentCardIndex((prevIndex) => prevIndex + 1);
   }

   // ✅ When all profiles are swiped, reload NOPE users
   if (cardIndex === recommendedUsers.length - 1) {
     setTimeout(() => {
       handleAllSwiped();
     }, 300);
   }
 };


 const handleClosePress = async () => {
   if (recommendedUsers.length > 0 && currentCardIndex < recommendedUsers.length) {
     const swipedUser = recommendedUsers[currentCardIndex];

     if (!swipedUser) return;

     // ✅ Swipe left programmatically
     if (swiperRef.current) {
       swiperRef.current.swipeLeft();
     }

     // ✅ Store NOPE user in Firestore
     try {
       await setDoc(doc(db, "nopeUsers", `${user?.uid}_${swipedUser.id}`), {
         fromUserId: user?.uid,
         toUserId: swipedUser.id,
         createdAt: Timestamp.fromDate(new Date()),
       });
     } catch (error) {
       console.error("Error storing nope user:", error);
     }

     // ✅ Move to the next profile
     const nextIndex = currentCardIndex + 1;
     setCurrentCardIndex(nextIndex);

     // ✅ If all profiles are swiped, fetch NOPE users
     if (nextIndex >= recommendedUsers.length) {
       setTimeout(() => {
         handleAllSwiped();
       }, 300);
     }
   }
 };

const handleRefresh = async () => {
 console.log("Refreshing system...");

 setLoading(true); // ✅ Show loading indicator

 try {
   // ✅ Fetch matched users first
   const userRef = doc(db, "users", user?.uid);
   const userDoc = await getDoc(userRef);
   const matchedUsers = userDoc.exists() ? userDoc.data().matches || [] : [];

   const matchedUserIds = new Set(matchedUsers.map((match) => match.userId));

   // ✅ Delete NOPE users from Firestore
   const nopeQuery = query(
     collection(db, "nopeUsers"),
     where("fromUserId", "==", user?.uid)
   );
   const nopeDocs = await getDocs(nopeQuery);
   const nopeDeletes = nopeDocs.docs.map((doc) => deleteDoc(doc.ref));
   await Promise.all(nopeDeletes);
   console.log("Deleted NOPE users.");

   // ✅ Fetch all liked users
   const likeQuery = query(
     collection(db, "likes"),
     where("fromUserId", "==", user?.uid)
   );
   const likeDocs = await getDocs(likeQuery);

   // ✅ Only delete likes that DID NOT result in a match
   const likeDeletes = likeDocs.docs
     .filter((doc) => {
       const toUserId = doc.data().toUserId;
       return !matchedUserIds.has(toUserId); // ❌ Skip deleting matched likes
     })
     .map((doc) => deleteDoc(doc.ref));

   await Promise.all(likeDeletes);
   console.log("Deleted likes only for non-matched users.");

   // ✅ Reset all state variables
   setSwipedUserIds(new Set());
   setRecommendedUsers([]);
   setNopeProfiles([]);
   setCurrentCardIndex(0);

   // ✅ Fetch fresh recommendations
   await initialFetch();
   setRefreshKey((prev) => prev + 1); // ✅ Force full re-render
 } catch (error) {
   console.error("Error resetting system:", error);
 } finally {
   setLoading(false); // ✅ Hide loading indicator
 }
};


 const handleAllSwiped = async () => {
   console.log("All profiles swiped. Fetching one-way matches...");

   setLoading(true);
   setShowingOneWayMatch(true); // ✅ Show transition message

   try {
     const nopeQuery = query(
       collection(db, "nopeUsers"),
       where("fromUserId", "==", user?.uid)
     );
     const nopeDocs = await getDocs(nopeQuery);

     if (!nopeDocs.empty) {
       const nopeUserIds = nopeDocs.docs.map((doc) => doc.data().toUserId);

       if (nopeUserIds.length > 0) {
         const usersCollection = collection(db, "users");
         const querySnapshot = await getDocs(usersCollection);

         let nopeUsers = querySnapshot.docs
           .map((doc) => {
             const userData = doc.data();
             return {
               id: doc.id,
               ...userData,
               teach: userData.teach || [],
               learn: userData.learn || [],
               hobbies: userData.hobbies || [],
               location: userData.location || [0, 0],
               age: userData.birthday ? getAge(userData.birthday) : null,
               profilePicture: userData.profilePicture || getConsistentProfileImage(doc.id, userData.gender), // ✅ FIXED: Now consistent
             };
           })
           .filter((user) => nopeUserIds.includes(user.id));

         // ✅ Fetch current user profile to re-rank NOPE users
         const currentUserDoc = await getDoc(doc(db, "users", user?.uid));
         if (!currentUserDoc.exists()) {
           console.error("Current user not found in database");
           return;
         }
         const currentUser = currentUserDoc.data();

         // ✅ Re-rank NOPE users using the recommendation system
         const rankedNopeUsers = await recommendProfiles(currentUser, nopeUsers);

         // ✅ Filter out already liked users
         const swipedQuery = query(
           collection(db, "likes"),
           where("fromUserId", "==", user?.uid)
         );
         const swipedDocs = await getDocs(swipedQuery);
         const swipedIds = new Set(swipedDocs.docs.map((doc) => doc.data().toUserId));

         const filteredNopeUsers = rankedNopeUsers.filter(user => !swipedIds.has(user.id));

         console.log("Re-ranked one-way matches:", filteredNopeUsers);

         if (filteredNopeUsers.length > 0) {
           setRecommendedUsers(filteredNopeUsers);
           setCurrentCardIndex(0);
           setRefreshKey((prev) => prev + 1); // ✅ Force full re-render
           setLoading(false);
           setShowingOneWayMatch(false); // ✅ Hide message when done
           return;
         }
       }
     }
   } catch (error) {
     console.error("Error fetching NOPE users:", error);
   }

   console.log("No NOPE users left, fetching new recommendations...");
   await initialFetch();
   setLoading(false);
   setShowingOneWayMatch(false); // ✅ Reset flag after done
 };

 const handleGoChat = () => {
   router.push("/(tabs)/ContactList");
 };

 const getProfileImage = (user) => {
   if (user.profilePicture && typeof user.profilePicture === "string") {
     return { uri: user.profilePicture };
   }
   return require('../../assets/default-profile.png');
 };

 // Send Push Notification
   const sendNotification = async (expoPushToken, message) => {
     // console.log("token:", expoPushToken);
     await fetch("https://exp.host/--/api/v2/push/send", {
       method: "POST",
       headers: {
         Accept: "application/json",
         "Accept-Encoding": "gzip, deflate",
         "Content-Type": "application/json",
       },
       body: JSON.stringify({
         to: expoPushToken,
         sound: "default",
         title: "🎉 It's a Match!",
         body: message,
       }),
     });
   };


 const renderCard = (user) => {
   if (!user) return null;
   return (
     <View style={[styles.card, { height: CARD_HEIGHT }]}>
       {/* Profile Image with Overlay */}
       <View style={{ flex: 1, position: "relative" }}>
         <Image
                   source={getProfileImage(user)}
                   style={{
                     width: "100%",
                     height: CARD_HEIGHT * 0.45,
                     borderTopLeftRadius: 24,
                     borderTopRightRadius: 24,
                     resizeMode: "cover",
                   }}
                 />
         <View style={styles.overlay} />
         <View style={styles.profileDetails}>
           <Text style={styles.userName}>
             {user.name} ({user.age || "N/A"})
           </Text>
           <View style={{ flexDirection: "row", alignItems: "center" }}>
             <FontAwesome name="location-arrow" size={16} color="#fff" />
             <Text style={styles.locationText}>
               {user.district}, {user.province}
             </Text>
           </View>
         </View>
       </View>

       {/* Profile Details Section */}
       <View style={{ padding: 15, backgroundColor: "white", flex: 1 }}>
         <View style={styles.infoBlock}>
           <Text style={styles.infoTitle}>Speciality:</Text>
           <View style={styles.infoTags}>
             {user.teach?.map((item, index) => (
               <Text key={index} style={styles.tag}>{item}</Text>
             ))}
           </View>
         </View>

         <View style={styles.infoBlock}>
           <Text style={styles.infoTitle}>Need:</Text>
           <View style={styles.infoTags}>
             {user.learn?.map((item, index) => (
               <Text key={index} style={styles.tag}>{item}</Text>
             ))}
           </View>
         </View>

         <View style={styles.infoBlock}>
           <Text style={styles.infoTitle}>University:</Text>
           <Text style={styles.universityText}>{user.university}</Text>
         </View>
       </View>

       {/* Buttons Row */}
       <View style={styles.buttonRow}>
         <TouchableOpacity onPress={handleRefresh} style={[styles.actionButton, styles.smallButton]}>
           <FontAwesome name="refresh" size={20} color="#1E1E84" />
         </TouchableOpacity>

         <TouchableOpacity onPress={handleClosePress} style={[styles.actionButton, styles.largeButton]}>
           <FontAwesome name="close" size={30} color="#dc2626" />
         </TouchableOpacity>

         <TouchableOpacity onPress={() => swiperRef.current?.swipeRight()} style={[styles.actionButton, styles.largeButton]}>
           <FontAwesome name="heart" size={30} color="#16a34a" />
         </TouchableOpacity>

         <TouchableOpacity onPress={handleGoChat} style={[styles.actionButton, styles.smallButton]}>
           <AntDesign name="message1" size={16} color="#000" />
         </TouchableOpacity>
       </View>
     </View>
   );

 };

 return (
   <View className="flex-1 justify-center items-center w-full px-5 mt-8 bg-white">
     {loading ? (
       <View className="flex-1 justify-center items-center">
         <ActivityIndicator size="large" color="#1E1E84" />
         <Text className="text-gray-700 mt-4 text-lg font-semibold">
           {showingOneWayMatch
             ? "All recommended users swiped! Showing one-way matches..."
             : "Fetching Users..."}
         </Text>
       </View>
     ) : ( // ✅ Corrected syntax here
       <Swiper
         key={refreshKey} // 🔥 Forces full re-render
         ref={swiperRef}
         cards={recommendedUsers}
         renderCard={renderCard}
         onSwipedRight={(cardIndex) => handleSwipeRight(cardIndex)}
         onSwipedLeft={(cardIndex) => handleSwipeLeft(cardIndex)}
         onSwipedAll={handleAllSwiped}
         cardIndex={0}
         stackSize={3}
         stackScale={5}
         stackSeparation={14}
         disableBottomSwipe
         disableTopSwipe
         cardVerticalMargin={5}
         cardHorizontalMargin={10}
         animateOverlayLabelsOpacity
         animateCardOpacity
         swipeBackCard
         containerStyle={{ backgroundColor: "white" }}
         overlayLabels={{
           left: {
             title: "NOPE",
             style: {
               label: {
                 backgroundColor: "red",
                 color: "white",
                 fontSize: 17,
               },
               wrapper: {
                 flexDirection: "column",
                 alignItems: "flex-end",
                 justifyContent: "flex-start",
                 marginTop: 30,
                 marginLeft: -30,
               },
             },
           },
           right: {
             title: "LIKE",
             style: {
               label: {
                 backgroundColor: "green",
                 color: "white",
                 fontSize: 17,
               },
               wrapper: {
                 flexDirection: "column",
                 alignItems: "flex-start",
                 justifyContent: "flex-start",
                 marginTop: 30,
                 marginLeft: 30,
               },
             },
           },
         }}
       />
     )}
   </View>
 );
}

const styles = StyleSheet.create({
  card: {
      borderRadius: 24,
      backgroundColor: "#fff",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 6, // ✅ Android shadow
      height: Dimensions.get("window").height * 0.85, // ✅ Full height (adjust this value)
      marginBottom: 0, // ✅ Remove extra space
    },
  overlay: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 80,
    backgroundColor: "rgba(0, 0, 0, 0.5)", // ✅ Improved opacity for readability
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  profileDetails: {
    position: "absolute",
    bottom: 15,
    left: 15,
  },
  userName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  locationText: {
    color: "#fff",
    fontSize: 14,
    marginLeft: 5,
  },
  infoBlock: {
    marginBottom: 10,
  },
  infoTitle: {
    fontWeight: "bold",
    fontSize: 14,
    marginBottom: 5,
  },
  infoTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
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
  universityText: {
    fontSize: 14,
    color: "#000",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },

  actionButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    borderRadius: 30,
    marginHorizontal: 10,
  },
  largeButton: {
    width: 60,
    height: 60,
  },
  smallButton: {
    width: 45,
    height: 45,
  },
});
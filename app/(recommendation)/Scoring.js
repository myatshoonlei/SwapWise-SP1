import contentBasedMatch from "./ContentBased";
import { getDistance } from "geolib";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebaseConfig"; // Ensure correct path

// Google Maps API Key
const GOOGLE_API_KEY = "AIzaSyCkDOdlndDRDPSZkOESB9YAQpBsLJkPwO8"; // Replace with your key

// 🔹 Cache API Responses to Avoid Repeated Calls
const locationCache = new Map();

// Function to fetch latitude and longitude using Google Geocoding API
const fetchCoordinates = async (district, province) => {
  const locationKey = `${district},${province}`;

  if (locationCache.has(locationKey)) return locationCache.get(locationKey);

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    locationKey
  )}&key=${GOOGLE_API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK") {
      const coords = data.results[0].geometry.location;
      locationCache.set(locationKey, { latitude: coords.lat, longitude: coords.lng });
      return { latitude: coords.lat, longitude: coords.lng };
    } else {
      console.error(`Error fetching coordinates for ${locationKey}: ${data.status}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching coordinates for ${locationKey}:`, error);
    return null;
  }
};

// 🔹 Function to calculate the location score
export const calculateLocationScore = async (currentUser, otherUser, maxDistance = 10000) => {
  try {
    const coords1 = await fetchCoordinates(currentUser.district, currentUser.province);
    const coords2 = await fetchCoordinates(otherUser.district, otherUser.province);

    if (!coords1 || !coords2) {
      console.error("Unable to fetch coordinates for one or both users.");
      return 0;
    }

    const distance = getDistance(
      { latitude: coords1.latitude, longitude: coords1.longitude },
      { latitude: coords2.latitude, longitude: coords2.longitude }
    ) / 1000;

    return distance > maxDistance ? 0 : 1 - distance / maxDistance;
  } catch (error) {
    console.error("Error calculating location score:", error);
    return 0;
  }
};

// 🔹 Fetch all unique hobbies from the database
const fetchAllUniqueHobbies = async () => {
  try {
    const usersRef = collection(db, "users");
    const querySnapshot = await getDocs(usersRef);

    const allHobbies = new Set();
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.hobbies) {
        userData.hobbies.forEach((hobby) => allHobbies.add(hobby));
      }
    });

    return allHobbies;
  } catch (error) {
    console.error("Error fetching unique hobbies:", error);
    return new Set();
  }
};

// 🔹 Hybrid Function to calculate preference score
export const calculatePreferenceScore = async (currentHobbies, otherHobbies) => {
  if (!currentHobbies.length || !otherHobbies.length) return 0;

  const uniqueHobbiesDB = await fetchAllUniqueHobbies(); // Fetch total unique hobbies from DB
  const set1 = new Set(currentHobbies);
  const set2 = new Set(otherHobbies);
  const intersection = [...set1].filter((hobby) => set2.has(hobby)).length;
  const union = set1.size + set2.size - intersection; // Union of both users' hobbies

  const α = 0.2; // 🔥 Adjust weight (0.2 = 20% fairness, 80% personalization)
  return union === 0 ? 0 : (intersection / union) + α * (intersection / uniqueHobbiesDB.size);
};

// 🔹 Function to normalize and calculate rating score
export const calculateRatingScore = (rating, maxRating = 5) => {
  return rating > 0 ? rating / maxRating : 0;
};

// 🔹 Fetch all ratings for a user and compute the average rating
export const getAverageRating = async (userId) => {
  try {
    const reviewsRef = collection(db, "reviews");
    const q = query(reviewsRef, where("reviewedUserId", "==", userId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return 0; // No ratings found, return default rating
    }

    let totalRating = 0;
    let count = 0;

    querySnapshot.forEach((doc) => {
      totalRating += doc.data().rating;
      count++;
    });

    return count > 0 ? totalRating / count : 0; // ✅ Compute average rating
  } catch (error) {
    console.error("Error fetching ratings:", error);
    return 0;
  }
};

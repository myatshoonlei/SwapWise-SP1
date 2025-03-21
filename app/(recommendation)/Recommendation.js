import contentBasedMatch from "./ContentBased";
import {
  calculateLocationScore,
  calculatePreferenceScore,
  calculateRatingScore,
  getAverageRating,
} from "./Scoring";

export const recommendProfiles = async (currentUser, users) => {
  const matches = contentBasedMatch(currentUser, users);

  if (matches.length === 0) {
    console.log("No mutual matches found.");
    return [];
  }

  // 🔹 Compute scores for each matched user
  const scoredUsers = await Promise.all(
    matches.map(async (user) => {
      const locationScore = await calculateLocationScore(currentUser, user);
      const preferenceScore = await calculatePreferenceScore(
        currentUser.hobbies || [],
        user.hobbies || []
      );
      const rating = await getAverageRating(user.id); // ✅ Fetch actual average rating from Firestore
      const ratingScore = calculateRatingScore(rating);

      // 🔹 Weighted scoring: 25% Location, 35% Preference, 40% Rating
      const totalScore = (
        0.5 * ratingScore +
        0.3 * preferenceScore +
        0.2 * locationScore
      ).toFixed(2); // ✅ Keep decimals clean

      // Debug logs
      console.log(`--- Scoring for ${user.name} ---`);
      console.log(`Location Score: ${locationScore}`);
      console.log(`Preference Score: ${preferenceScore}`);
      console.log(`Rating Score: ${ratingScore} (Avg: ${rating})`);
      console.log(`Total Score: ${totalScore}`);
      console.log(`------------------------------`);

      return { ...user, totalScore: parseFloat(totalScore) }; // ✅ Convert back to float for sorting
    })
  );

  // 🔹 Sort by highest score
  return scoredUsers.sort((a, b) => b.totalScore - a.totalScore);
};

export default recommendProfiles;

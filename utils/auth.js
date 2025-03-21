import { GoogleSignin } from "@react-native-google-signin/google-signin";

const resetGoogleSignIn = async () => {
  try {
    await GoogleSignin.signOut();  // ✅ Sign out the user
    await GoogleSignin.revokeAccess();  // ✅ Revoke all previous permissions
    const userInfo = await GoogleSignin.signIn();  // ✅ Sign in again with updated scopes

    console.log("User Info:", userInfo);
  } catch (error) {
    console.error("Error resetting Google Sign-In:", error);
  }
};
import { useAuth } from "../context/authContext";
import { Redirect, Slot, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { usePushNotification } from "../utils/usePushNotification";
import { useNotificationListener } from "../utils/NotificationService";

export default function Index() {
  const { isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { expoPushToken, notification } = usePushNotification();
   useNotificationListener();

  console.log("📲 Registered Push Token:", expoPushToken);
   useEffect(() => {
    if (isAuthenticated === undefined) return; // Prevent navigation issues while loading state

    const inApp = segments[0] === "(app)";

    if (isAuthenticated && !inApp) {
      router.replace("(tabs)/Home");
    } else if (!isAuthenticated) {
      router.replace("(auth)/welcomeScreen"); // Redirects to SignUp when user is not authenticated
    }
  }, [isAuthenticated]);

  return isAuthenticated ? <Redirect href="/(tabs)/Home" /> : <Redirect href="/(auth)/WelcomeScreen" />;
 }

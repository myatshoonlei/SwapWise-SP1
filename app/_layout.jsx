import { Slot } from "expo-router";
import { AuthContextProvider } from "../context/authContext";
import { useNotificationListener } from "../utils/NotificationService";

export default function Layout() {
    useNotificationListener();
  return (
    <AuthContextProvider>
      <Slot />
    </AuthContextProvider>
  );
}

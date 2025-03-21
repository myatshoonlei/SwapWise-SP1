import { Stack } from "expo-router";

const PageLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: true, // This removes the header for all screens in the "page" folder
      }}
    >
      {/* Define screens or leave this empty to automatically pick up screens in the "page" folder */}
    </Stack>
  );
};

export default PageLayout;

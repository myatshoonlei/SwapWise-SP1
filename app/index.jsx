import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Image, Button } from 'react-native';
import "expo-dev-client";
import { GoogleSignin, GoogleSigninButton } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header'; // Adjust the path as needed
import { useRouter } from 'expo-router';

export default function SignUp() {
  const router = useRouter();
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);

  // Configure Google Sign-In once on mount
  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '63070857564-g8qffvo2cvooi931q8kb7h573gmgm1f4.apps.googleusercontent.com',
    });
  }, []);

  // Handle user state changes
  const onAuthStateChanged = (user) => {
    setUser(user);
    if (initializing) setInitializing(false);
    if (user) {
      // After a successful sign-in, navigate to the home route
      router.push('/(tabs)/Home');
    }
  };

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(onAuthStateChanged);
    return subscriber; // unsubscribe on unmount
  }, []);

  const onGoogleButtonPress = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const signInResult = await GoogleSignin.signIn();
      // Support both new and older versions of the module:
      const idToken = signInResult.data?.idToken || signInResult.idToken;
      if (!idToken) {
        throw new Error('No ID token found');
      }
      // Create a Google credential with the token
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      // Sign in the user with the credential
      await auth().signInWithCredential(googleCredential);
    } catch (error) {
      console.error('Google Sign-In error:', error);
    }
  };

  const signOut = async () => {
    try {
      await GoogleSignin.revokeAccess();
      await auth().signOut();
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  if (initializing) return null;

  if (!user) {
    return (
      <View style={styles.container}>
        <Header />
        <GoogleSigninButton
          style={{ width: 192, height: 48 }}
          size={GoogleSigninButton.Size.Wide}
          color={GoogleSigninButton.Color.Light}
          onPress={onGoogleButtonPress}
        />
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      <View style={{ marginTop: 100, alignItems: 'center' }}>
        <Text>Welcome {user.displayName}</Text>
        {user.photoURL && (
          <Image
            source={{ uri: user.photoURL }}
            style={{ width: 100, height: 100, borderRadius: 150, margin: 50 }}
          />
        )}
        <Button title="Sign out" onPress={signOut} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

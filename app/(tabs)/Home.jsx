import React, { useState, useEffect } from 'react';
import { View, Text, Image, Button, StyleSheet } from 'react-native';
import auth from '@react-native-firebase/auth';
import { useRouter } from 'expo-router';
import Header from '../../components/Header'; // Adjust the path if needed

export default function Home() {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const subscriber = auth().onAuthStateChanged((user) => {
      setUser(user);
      // If the user signs out, navigate back to the sign-up page
      if (!user) {
        router.replace('/');
      }
    });
    return subscriber; // Unsubscribe on unmount
  }, []);

  const signOut = async () => {
    try {
      await auth().signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  // Optionally, you can show a loading state if user is null
  if (!user) return null;

  return (
    <View style={styles.container}>
      <Header />
      <View style={styles.content}>
        <Text style={styles.welcomeText}>Welcome {user.displayName}</Text>
        {user.photoURL && (
          <Image
            source={{ uri: user.photoURL }}
            style={styles.profileImage}
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
  content: {
    marginTop: 100,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 20,
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 150,
    margin: 50,
  },
});

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Alert } from 'react-native';
import { Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../supabaseClient'; // Adjust the path as necessary

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [userName, setUserName] = useState('Loading...');
  const [userEmail, setUserEmail] = useState('Loading...');
  const [profileImage, setProfileImage] = useState('https://via.placeholder.com/150');

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError || !userData?.user) {
        Alert.alert('Error', 'Unable to retrieve user information.');
        return;
      }

      const userId = userData.user.id;

      // Fetch user profile information from your database
      const { data, error } = await supabase
        .from('profiles') // Assuming you have a 'profiles' table
        .select('name, email, profile_image')
        .eq('id', userId);

      if (error) {
        Alert.alert('Error', error.message || 'An unknown error occurred.');
      } else if (data && data.length === 1) {
        setUserName(data[0].name);
        setUserEmail(data[0].email);
        setProfileImage(data[0].profile_image || 'https://via.placeholder.com/150');
      } else {
        Alert.alert('Error', 'User profile not found or multiple profiles returned.');
      }
    };

    fetchUserProfile();
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Error', error.message || 'An unknown error occurred.');
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Welcome' }], // Reset navigation stack and navigate to Welcome screen
      });
    }
  };

  const handleImagePicker = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: [ImagePicker.MediaType.Images],
      allowsEditing: true,
      quality: 1,
    });

    if (!result.cancelled && result.uri) {
      console.log('Image URI:', result.uri); // Log the URI for debugging
      const imageUrl = await uploadImageToStorage(result.uri);
      if (imageUrl) {
        console.log('Image URL:', imageUrl); // Log the URL for debugging
        setProfileImage(imageUrl);
        // Update the profile image URL in the database
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userData?.user) {
          const userId = userData.user.id;
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ profile_image: imageUrl })
            .eq('id', userId);

          if (updateError) {
            Alert.alert('Error', updateError.message || 'An unknown error occurred while updating profile image.');
          }
        }
      }
    } else {
      console.log('Image selection was cancelled or failed.');
    }
  };

  const uploadImageToStorage = async (uri: string) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileName = uri.split('/').pop();
      const { data, error } = await supabase.storage
        .from('profile-images') // Ensure you have a bucket named 'profile-images'
        .upload(`public/${fileName}`, blob, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw error;
      }

      const { publicURL, error: urlError } = supabase.storage
        .from('profile-images')
        .getPublicUrl(`public/${fileName}`);

      if (urlError) {
        throw urlError;
      }

      return publicURL;
    } catch (error) {
      Alert.alert('Error', error.message || 'An unknown error occurred during image upload.');
      return null;
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: profileImage }}
        style={styles.profileImage}
      />
      <Button
        mode="contained"
        onPress={handleImagePicker}
        style={styles.updateButton}
      >
        Update Photo
      </Button>
      <Text style={styles.name}>{userName}</Text>
      <Text style={styles.email}>{userEmail}</Text>
      <Button
        mode="contained"
        onPress={handleLogout}
        style={styles.logoutButton}
      >
        Logout
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF3F3',
  },
  profileImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
    marginBottom: 20,
  },
  updateButton: {
    marginBottom: 20,
    backgroundColor: '#FF6F61',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  email: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  logoutButton: {
    backgroundColor: '#FF6F61',
  },
});

export default ProfileScreen; 
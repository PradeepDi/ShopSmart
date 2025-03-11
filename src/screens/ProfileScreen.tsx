import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Alert, Platform } from 'react-native';
import { Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../supabaseClient';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [userName, setUserName] = useState('Loading...');
  const [userEmail, setUserEmail] = useState('Loading...');
  const [profileImage, setProfileImage] = useState('https://via.placeholder.com/150.png');

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
        .select('name, email, avatar_url')
        .eq('id', userId);

      if (error) {
        Alert.alert('Error', error.message || 'An unknown error occurred.');
      } else if (data && data.length === 1) {
        setUserName(data[0].name);
        setUserEmail(data[0].email);
        // Use avatar_url if it exists, otherwise use default image
        if (data[0].avatar_url) {
          setProfileImage(data[0].avatar_url);
        }
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
    try {
      // Request permission first
      console.log('Requesting media library permissions...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }
      
      console.log('Permissions granted, launching image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8, // Reduced quality for better compatibility
        base64: false,
        exif: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        console.log('Selected image:', selectedAsset);
        console.log('Image URI:', selectedAsset.uri);
        
        // Show loading indicator or disable button here if needed
        Alert.alert('Uploading', 'Uploading your image, please wait...');
        
        const imageUrl = await uploadImageToStorage(selectedAsset.uri);
        if (imageUrl) {
          console.log('Image URL:', imageUrl);
          setProfileImage(imageUrl);
          
          // Update the profile image URL in the database
          const { data: userData, error: userError } = await supabase.auth.getUser();
          if (userData?.user) {
            const userId = userData.user.id;
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ avatar_url: imageUrl })
              .eq('id', userId);

            if (updateError) {
              console.error('Profile update error:', updateError);
              Alert.alert('Error', updateError.message || 'An unknown error occurred while updating profile image.');
            } else {
              Alert.alert('Success', 'Profile image updated successfully!');
            }
          }
        } else {
          Alert.alert('Upload Failed', 'Could not upload the image to storage. Please try again.');
        }
      } else if (result.canceled) {
        console.log('Image selection was cancelled by user.');
      } else {
        console.log('No image asset found in result:', result);
        Alert.alert('Selection Error', 'No image was selected or the image format is not supported.');
      }
    } catch (error) {
      console.error('Error in handleImagePicker:', error);
      Alert.alert('Error', 'There was a problem with the image picker. Please try again.');
    }
  };


  const uploadImageToStorage = async (uri: string) => {
    try {
      console.log('Starting image upload process for URI:', uri);
      
      // For React Native, we need to handle file:// URIs specially
      // First, determine MIME type
      const fileName = uri.split('/').pop() || 'unknown';
      const fileExt = fileName.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp'
      }[fileExt] || 'image/jpeg';
      
      // Generate a unique file path with proper extension
      const filePath = `${Date.now()}.${fileExt}`;
      console.log('Generated file path:', filePath);
      
      // For React Native, the most reliable approach is to read the file as base64
      // and then convert it to a blob or use it directly
      if (Platform.OS === 'web') {
        // Web platform handling remains the same
        const response = await fetch(uri);
        const blob = await response.blob();
        
        const { data, error } = await supabase.storage
          .from('profile-images')
          .upload(filePath, blob, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: true,
          });
          
        if (error) {
          console.error('Upload error details:', error);
          throw error;
        }
        
        console.log('Upload successful, data:', data);
      } else {
        // For native platforms (Android/iOS), use fetch API to get the file data
        try {
          // Read the file as base64 string first
          const base64Data = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          console.log('Successfully read file as base64');
          
          // Convert base64 to a Uint8Array for upload
          // This avoids the Blob issue in React Native
          const binaryData = Buffer.from(base64Data, 'base64');
          
          // Upload the binary data directly
          const { data, error } = await supabase.storage
            .from('profile-images')
            .upload(filePath, binaryData, {
              contentType: mimeType,
              cacheControl: '3600',
              upsert: true,
            });
            
          if (error) {
            console.error('Upload error details:', error);
            throw error;
          }
          
          console.log('Upload successful, data:', data);
        } catch (fileError) {
          console.error('Error handling file:', fileError);
          
          // Fallback to direct fetch approach if base64 fails
          try {
            // Create a FormData object
            const formData = new FormData();
            // In React Native, we need to use this specific format for files
            const fileInfo = {
              uri: uri,
              name: fileName,
              type: mimeType
            };
            formData.append('file', fileInfo as any);
            
            console.log('Created FormData with file info');
            
            // Use direct fetch API to upload the file
            const { data, error } = await supabase.storage
              .from('profile-images')
              .upload(filePath, formData, {
                contentType: 'multipart/form-data', // Important for FormData
                cacheControl: '3600',
                upsert: true,
              });
              
            if (error) {
              console.error('Upload error details from FormData approach:', error);
              throw error;
            }
            
            console.log('Upload successful with FormData approach, data:', data);
          } catch (formDataError) {
            console.error('FormData approach failed:', formDataError);
            throw new Error('All file handling approaches failed');
          }
        }
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        console.error('Failed to get public URL from:', urlData);
        throw new Error('Failed to get public URL');
      }

      console.log('Successfully uploaded to:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error in uploadImageToStorage:', error);
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
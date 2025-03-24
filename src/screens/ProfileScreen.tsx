import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, Alert, Platform, TouchableOpacity } from 'react-native';
import { Button, Provider, IconButton, TextInput } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../supabaseClient';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [userName, setUserName] = useState('Loading...');
  const [userEmail, setUserEmail] = useState('Loading...');
  const [profileImage, setProfileImage] = useState(require('../../assets/profile.png'));
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');

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
        // Use avatar_url if it exists and is not empty, otherwise keep the default image
        if (data[0].avatar_url && data[0].avatar_url.trim() !== '') {
          setProfileImage(data[0].avatar_url);
        }
      } else {
        Alert.alert('Error', 'User profile not found or multiple profiles returned.');
      }
    };

    fetchUserProfile();
  }, []);

  const handleEditName = () => {
    setNewName(userName);
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!newName.trim()) {
      Alert.alert('Error', 'Name cannot be empty');
      return;
    }

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData?.user) {
        Alert.alert('Error', 'Unable to retrieve user information.');
        return;
      }

      const userId = userData.user.id;

      // Update the name in the database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ name: newName })
        .eq('id', userId);

      if (updateError) {
        console.error('Profile update error:', updateError);
        Alert.alert('Error', updateError.message || 'An unknown error occurred while updating name.');
      } else {
        setUserName(newName);
        Alert.alert('Success', 'Name updated successfully!');
        setIsEditingName(false);
      }
    } catch (error) {
      console.error('Error in handleSaveName:', error);
      Alert.alert('Error', 'There was a problem updating your name. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
  };

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
        Alert.alert('Permission Required', 'Sorry, need camera roll permissions to make this work!');
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
      
      // For React Native, Need to handle file:// URIs specially
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
            // In React Native, Need to use this specific format for files
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
    <Provider>
      <LinearGradient
        colors={['#FF6F61', '#f5f0e8']}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <View style={styles.card}>
          <Image
            source={typeof profileImage === 'string' ? { uri: profileImage } : profileImage}
            style={styles.profileImage}
          />
          <Button
            mode="contained"
            onPress={handleImagePicker}
            style={styles.updateButton}
          >
            Update Photo
          </Button>
          
          {isEditingName ? (
            <View style={styles.editNameContainer}>
              <TextInput
                label="Name"
                value={newName}
                onChangeText={setNewName}
                style={styles.nameInput}
                mode="outlined"
                outlineColor="#b5b1b1"
                activeOutlineColor="#FF6F61"
              />
              <View style={styles.editButtonsContainer}>
                <Button
                  mode="contained"
                  onPress={handleSaveName}
                  style={styles.saveButton}
                >
                  Save
                </Button>
                <Button
                  mode="outlined"
                  onPress={handleCancelEdit}
                  style={styles.cancelButton}
                  textColor="#FF6F61"
                >
                  Cancel
                </Button>
              </View>
            </View>
          ) : (
            <View style={styles.nameContainer}>
              <Text style={styles.name}>{userName}</Text>
              <View style={styles.iconWrapper}>
                <IconButton
                  icon="pencil"
                  size={20}
                  onPress={handleEditName}
                  iconColor="#FF6F61"
                />
              </View>
            </View>
          )}
          
          <Text style={styles.email}>{userEmail}</Text>
          <Button
            mode="contained"
            onPress={handleLogout}
            style={styles.logoutButton}
          >
            Logout
          </Button>
        </View>
      </LinearGradient>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingTop: 80,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 20,
  },
  profileImage: {
    width: 250,
    height: 250,
    borderRadius: 150,
    marginBottom: 20,
    marginTop: 60,
    borderWidth: 3,
    borderColor: '#FF6F61',
  },
  updateButton: {
    marginBottom: 80,
    backgroundColor: '#FF6F61',
    borderRadius: 8,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  name: {
    fontSize: 30,
    fontWeight: 'bold',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 40,
    color: '#FF6F61',
  },
  editNameButton: {
    marginLeft: 5,
  },
  editNameContainer: {
    width: '80%',
    marginBottom: 10,
  },
  nameInput: {
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  editButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  saveButton: {
    flex: 1,
    marginRight: 5,
    backgroundColor: '#FF6F61',
    borderRadius: 8
  },
  cancelButton: {
    flex: 1,
    marginLeft: 5,
    borderColor: '#FF6F61',
    borderWidth: 1,
    borderRadius: 8,
  },
  email: {
    fontSize: 20,
    color: '#666',
    marginBottom: 20,
  },
  logoutButton: {
    marginTop: 80,
    marginBottom: 30,
    backgroundColor: '#FF6F61',
    width: '70%',
    borderRadius: 8,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF0EF',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    marginLeft: 20,
  },
});

export default ProfileScreen;
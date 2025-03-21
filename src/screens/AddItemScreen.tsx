import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text, Image, Platform, TouchableOpacity } from 'react-native';
import { Button, TextInput, Switch, HelperText, IconButton } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../supabaseClient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import { CameraView, CameraType, Camera } from 'expo-camera';

interface RouteParams {
  storeId: string;
}

export const AddItemScreen = () => {
  const navigation = useNavigation();
  console.log('Navigation object:', navigation); // Debugging line
  const route = useRoute();
  const { storeId } = route.params as RouteParams;

  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [stockStatus, setStockStatus] = useState(true);
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [priceError, setPriceError] = useState('');
  const [itemImage, setItemImage] = useState(require('../../assets/product-default.png'));
  
  // Camera related states
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [showCamera, setShowCamera] = useState(false);
const cameraRef = useRef<CameraView>(null);

  const validateInputs = () => {
    let isValid = true;

    // Validate item name
    if (!itemName.trim()) {
      setNameError('Item name is required');
      isValid = false;
    } else {
      setNameError('');
    }

    // Validate price
    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      setPriceError('Please enter a valid price');
      isValid = false;
    } else {
      setPriceError('');
    }

    return isValid;
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
          setItemImage(imageUrl);
          Alert.alert('Success', 'Item image updated successfully!');
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
          .from('product-images')
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
            .from('product-images')
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
              .from('product-images')
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
        .from('product-images')
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

  const handleAddItem = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    try {
      // Add the item directly to the inventory table
      const { error: inventoryError } = await supabase
        .from('inventory_items')
        .insert([
          {
            shop_id: storeId,
            name: itemName.trim(), // Add the item name directly to the inventory table
            price: parseFloat(price),
            stock_status: stockStatus,
            description: description || null,
            image_url: typeof itemImage === 'string' ? itemImage : null,
            updated_at: new Date().toISOString()
          }
        ]);

      if (inventoryError) throw inventoryError;

      Alert.alert('Success', 'Item added to inventory successfully');
      if (navigation.canGoBack()) {
        navigation.goBack(); // Ensure navigation is used correctly
      } else {
        console.warn('Cannot go back, navigation stack does not support it.');
        // Optionally navigate to a specific screen
        // navigation.navigate('PreviousScreenName');
      }
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item to inventory');
    } finally {
      setLoading(false);
    }
  };

  // Camera component
  if (showCamera) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          type="back"
          ratio="16:9"
        >
          <View style={styles.cameraControls}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => setShowCamera(false)}
            >
              <Text style={styles.backButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.captureButton}
              onPress={async () => {
                if (cameraRef.current) {
                  try {
                    const photo = await cameraRef.current.takePictureAsync();
                    setShowCamera(false);
                    if (photo.uri) {
                      const imageUrl = await uploadImageToStorage(photo.uri);
                      if (imageUrl) {
                        setItemImage(imageUrl);
                        Alert.alert('Success', 'Photo captured and uploaded successfully!');
                      }
                    }
                  } catch (error) {
                    console.error('Error taking picture:', error);
                    Alert.alert('Error', 'Failed to take picture');
                  }
                }
              }}
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add New Item</Text>
      </View>
      <ScrollView style={styles.formContainer}>
        <View style={styles.content}>
          <View style={styles.imageContainer}>
            <Image
              source={typeof itemImage === 'string' ? { uri: itemImage } : itemImage}
              style={styles.itemImage}
            />
            <View style={styles.imageButtonsContainer}>
              <Button
                mode="contained"
                onPress={handleImagePicker}
                style={styles.imageButton}
                buttonColor="#FF6F61"
                icon="image"
              >
                Gallery
              </Button>
              <Button
                mode="contained"
                onPress={async () => {
                  try {
                    // Use the correct approach for requesting camera permissions
                    const { status } = await Camera.requestCameraPermissionsAsync();
                    setCameraPermission(status === 'granted');
                    if (status === 'granted') {
                      setShowCamera(true);
                    } else {
                      Alert.alert('Permission Required', 'Camera permission is required to take photos');
                    }
                  } catch (error) {
                    console.error('Error requesting camera permission:', error);
                    Alert.alert('Error', 'Failed to request camera permission');
                  }
                }}
                style={styles.imageButton}
                buttonColor="#FF6F61"
                icon="camera"
              >
                Camera
              </Button>
            </View>
          </View>
          
          <TextInput
            label="Item Name"
            value={itemName}
            onChangeText={setItemName}
            style={styles.input}
            mode="outlined"
            error={!!nameError}
          />
          {nameError ? <HelperText type="error">{nameError}</HelperText> : null}
          
          <TextInput
            label="Price"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            style={styles.input}
            mode="outlined"
            error={!!priceError}
          />
          {priceError ? <HelperText type="error">{priceError}</HelperText> : null}
          
          <TextInput
            label="Item Description"
            value={description}
            onChangeText={setDescription}
            style={[styles.input, styles.descriptionInput]}
            mode="outlined"
            multiline
            numberOfLines={5}
          />
          
          <View style={styles.stockContainer}>
            <Text>In Stock</Text>
            <Switch
              value={stockStatus}
              onValueChange={setStockStatus}
            />
          </View>
          
          <View style={styles.buttonContainer}>
            <Button 
              mode="outlined" 
              onPress={() => navigation.goBack()} 
              style={styles.button}
              textColor='#FF6F61'
              disabled={loading}
            >
              Cancel
            </Button>
            
            <Button 
              mode="contained" 
              onPress={handleAddItem} 
              style={styles.button}
              loading={loading}
              disabled={loading}
              buttonColor="#FF6F61"
            >
              Add Item
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF3F3',
  },
  header: {
    backgroundColor: '#FF6F61',
    width: '100%',
    paddingVertical: 60,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  formContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  imageContainer: {
    alignItems: 'center',
    marginBottom: 20,
    width: '80%',
  },
  itemImage: {
    width: 150,
    height: 150,
    borderRadius: 10,
    marginBottom: 10,
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  imageButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  input: {
    width: '80%',
    marginVertical: 10,
  },
  descriptionInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 16,
    width: '80%',
    paddingHorizontal: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    width: '80%',
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
  // Camera styles
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 30,
    width: '100%',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    padding: 15,
  },
  backButtonText: {
    color: 'white',
    fontSize: 18,
  },
});

export default AddItemScreen;
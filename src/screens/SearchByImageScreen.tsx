import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text, Image, Platform, TouchableOpacity, FlatList } from 'react-native';
import { Button, ActivityIndicator } from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../../supabaseClient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';
import { checkApiHealth, recognizeImage } from '../utils/ApiUtils';
import { CameraView, Camera } from 'expo-camera';
import { RootStackParamList } from '../navigation/AppNavigator';
import BottomNavBar from '../components/BottomNavBar';

interface RouteParams {
  listId?: number;
  listName?: string;
}

// Define the navigation prop type
type SearchByImageScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SearchByImage'>;
type SearchByImageScreenRouteProp = RouteProp<RootStackParamList, 'SearchByImage'>;

// Define the PredictionResult interface 
interface PredictionResult {
  className: string;
  probability: number;
}

export const SearchByImageScreen = () => {
  const navigation = useNavigation<SearchByImageScreenNavigationProp>();
  const route = useRoute<SearchByImageScreenRouteProp>();
  const { listId, listName } = route.params;

  const [searchImage, setSearchImage] = useState(require('../../assets/product-default.png'));
  const [recognizedProduct, setRecognizedProduct] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Camera related states
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const [isApiReady, setIsApiReady] = useState(false);
  const [prediction, setPrediction] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Check if the backend API is available when component mounts
  useEffect(() => {
    const checkBackendApi = async () => {
      try {
        const isHealthy = await checkApiHealth();
        setModelLoaded(isHealthy);
        setIsApiReady(isHealthy);
        console.log('Backend API health check:', isHealthy ? 'OK' : 'Failed');
        
        if (!isHealthy) {
          Alert.alert('Backend Not Available', 'The image recognition service is currently unavailable. Please try again later.');
        }
      } catch (error) {
        console.error('Failed to connect to backend API:', error);
        Alert.alert('Connection Error', 'Failed to connect to the image recognition service');
      }
    };

    checkBackendApi();
  }, []);
  const handleImagePicker = async () => {
    try {
      // Reset recognition data when starting a new image selection
      setRecognizedProduct(null);
      setConfidence(null);
      setPrediction('');
      
      // Request permission first
      console.log('Requesting media library permissions...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, Need camera roll permissions to make this work!');
        return;
      }
      
      console.log('Permissions granted, launching image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8, // Reduced quality for better compatibility
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const base64Image = asset.base64;
    
        if (!base64Image) {
          console.error('Base64 image is undefined');
          return;
        }

        console.log('Base64 image size:', base64Image.length);
        setLoading(true);
        
        try {
          // Use the ApiUtils to send the image to the backend for recognition
          const predictions = await recognizeImage(base64Image);
          
          if (predictions.length > 0) {
            const topPrediction = predictions[0];
            const label = topPrediction.className;
            const confidenceValue = topPrediction.probability;
            
            // Update state with prediction results
            setRecognizedProduct(label);
            setConfidence(confidenceValue);
            setPrediction(`${label} (${(confidenceValue * 100).toFixed(2)}%)`);
            setSelectedImage(asset.uri);
            
            // Set the search image to display the selected image
            setSearchImage(asset.uri);
            
            console.log('Prediction:', label, 'with confidence:', confidenceValue);
          }
        } catch (inferenceError) {
          console.error('Error during inference:', inferenceError);
          Alert.alert('Recognition Error', 'Failed to analyze the image. Please try again.');
        } finally {
          setLoading(false);
        }
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
          .from('search-images')
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
        // For native platforms , use fetch API to get the file data
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
            .from('search-images')
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
              .from('search-images')
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
        .from('search-images')
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

  const handleSearch = async () => {
    if (typeof searchImage !== 'string') {
      Alert.alert('Error', 'Please select or capture an image first');
      return;
    }

    if (!modelLoaded || !isApiReady) {
      Alert.alert('Service Not Ready', 'The image recognition service is not available. Please try again in a moment.');
      return;
    }

    setLoading(true);
    try {
      // If already have a recognized product from the image selection/capture process, use it
      if (recognizedProduct) {
        console.log('Using existing recognized product:', recognizedProduct);
        // Navigate to PickItemScreen with the recognized product name
        const productName = recognizedProduct.replace(/_/g, ' ');
        setLoading(false);
        navigation.navigate('PickItem', { 
          itemName: productName,
          listId: listId,
          listName: listName
        });
        return;
      }
      
      // Otherwise, send the image to the backend API for recognition
      let predictions: PredictionResult[];
      
      try {
        // If the image is a URL (from storage), need to use that
        if (searchImage.startsWith('http')) {
          console.log('Recognizing image from URL:', searchImage);
          predictions = await recognizeImage(searchImage);
        } else if (selectedImage) {
          console.log('Recognizing image from local URI:', selectedImage);
          predictions = await recognizeImage(searchImage);
        } else {
          // Fallback case
          Alert.alert('Error', 'Invalid image format');
          setLoading(false);
          return;
        }
      } catch (recognitionError) {
        console.error('Error recognizing image:', recognitionError);
        Alert.alert('Recognition Error', 'Failed to analyze the image. Please try again.');
        setLoading(false);
        return;
      }
      
      // Get the top prediction
      if (predictions && predictions.length > 0) {
        const topPrediction = predictions[0];
        setRecognizedProduct(topPrediction.className);
        setConfidence(topPrediction.probability);
        
        console.log('Top prediction:', topPrediction.className, 'with confidence:', topPrediction.probability);
        
        // Format the product name and navigate to PickItemScreen
        const productName = topPrediction.className.replace(/_/g, ' ');
        setPrediction(`${topPrediction.className} (${(topPrediction.probability * 100).toFixed(2)}%)`);
        
        // Navigate to PickItemScreen with the recognized product name
        navigation.navigate('PickItem', { 
          itemName: productName,
          listId: listId,
          listName: listName
        });
      } else {
        Alert.alert('Recognition Failed', 'Could not recognize the product in the image.');
      }
    } catch (error) {
      console.error('Error searching by image:', error);
      Alert.alert('Search Error', 'Failed to search using the image. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Search functionality is now handled by PickItemScreen

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
                    // Reset recognition data when capturing a new image
                    setRecognizedProduct(null);
                    setConfidence(null);
                    setPrediction('');
                    
                    const photo = await cameraRef.current.takePictureAsync({base64: true});
                    setShowCamera(false);
                    if (photo.uri) {
                      setLoading(true);
                      
                      // First perform image recognition
                      if (photo.base64) {
                        try {
                          // Use recognizeImage instead of undefined runInference function
                          const predictions = await recognizeImage(photo.base64);
                          
                          if (predictions.length > 0) {
                            const topPrediction = predictions[0];
                            setRecognizedProduct(topPrediction.className);
                            setConfidence(topPrediction.probability);
                            setPrediction(` ${topPrediction.className} (${(topPrediction.probability * 100).toFixed(2)}%)`);
                          }
                        } catch (inferenceError) {
                          console.error('Error during inference:', inferenceError);
                        }
                      }
                      
                      // Then upload to storage
                      const imageUrl = await uploadImageToStorage(photo.uri);
                      if (imageUrl) {
                        setSearchImage(imageUrl);
                        setSelectedImage(photo.uri);
                        Alert.alert('Success', 'Photo captured and analyzed successfully!');
                      }
                      
                      setLoading(false);
                    }
                  } catch (error) {
                    console.error('Error taking picture:', error);
                    Alert.alert('Error', 'Failed to take picture');
                    setLoading(false);
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
        <Text style={styles.title}>Search by Image</Text>
      </View>
      <View style={styles.formContainer}>
        <View style={styles.content}>
          <View style={styles.imageContainer}>
            <Image
              source={typeof searchImage === 'string' ? { uri: searchImage } : searchImage}
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
                    const { status } = await Camera.requestCameraPermissionsAsync();
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
          
          <Button 
            mode="contained" 
            onPress={handleSearch} 
            style={styles.searchButton}
            loading={loading}
            disabled={loading || typeof searchImage !== 'string'}
            buttonColor="#FF6F61"
            icon="magnify"
          >
            Find Similar Items
          </Button>
          
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6F61" />
              <Text style={styles.loadingText}>Analyzing image...</Text>
            </View>
          )}
          
          {recognizedProduct && !loading && (
            <View style={styles.recognitionContainer}>
              <Text style={styles.recognitionTitle}>Recognized Product:</Text>
              <Text style={styles.recognizedProduct}>{recognizedProduct.replace(/_/g, ' ')}</Text>
              {confidence !== null && (
                <Text style={styles.confidence}>Confidence: {(confidence * 100).toFixed(2)}%</Text>
              )}
            </View>
          )}
        </View>
      </View>
      <View style={styles.bottomNavContainer}>
        <BottomNavBar currentScreen="SearchByImage" />
      </View>
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
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 500,
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    width: '100%',
  },
  itemImage: {
    width: 250,
    height: 250,
    borderRadius: 10,
    marginBottom: 20,
    alignSelf: 'center',
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  imageButton: {
    flex: 1,
    marginHorizontal: 5,
    borderRadius: 8,
    maxWidth: 150,
  },
  searchButton: {
    width: '100%',
    maxWidth: 312,
    marginVertical: 25,
    borderRadius: 8,
    alignSelf: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  recognitionContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginVertical: 10,
    width: '100%',
    maxWidth: 312,
    alignItems: 'center',
    alignSelf: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  recognitionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
    textAlign: 'center',
  },
  recognizedProduct: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6F61',
    marginBottom: 5,
    textAlign: 'center',
  },
  confidence: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
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

export default SearchByImageScreen;
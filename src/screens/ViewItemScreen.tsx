import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text, Image, Alert, Platform } from 'react-native';
import { Button, Divider, Paragraph, TextInput, Switch, HelperText } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../supabaseClient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer';

interface RouteParams {
  item: {
    id: string;
    item_name: string;
    price: number;
    stock_status: boolean;
    description?: string;
    image_url?: string;
  };
}

export const ViewItemScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { item } = route.params as RouteParams;

  // State for editable fields
  const [isEditing, setIsEditing] = useState(false);
  const [itemName, setItemName] = useState(item.item_name);
  const [price, setPrice] = useState(item.price.toString());
  const [description, setDescription] = useState(item.description || '');
  const [stockStatus, setStockStatus] = useState(item.stock_status);
  const [imageUrl, setImageUrl] = useState(item.image_url);
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState('');
  const [priceError, setPriceError] = useState('');

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
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: false,
        exif: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        
        // Show loading indicator
        Alert.alert('Uploading', 'Uploading your image, please wait...');
        
        const newImageUrl = await uploadImageToStorage(selectedAsset.uri);
        if (newImageUrl) {
          setImageUrl(newImageUrl);
          Alert.alert('Success', 'Item image updated successfully!');
        } else {
          Alert.alert('Upload Failed', 'Could not upload the image to storage. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error in handleImagePicker:', error);
      Alert.alert('Error', 'There was a problem with the image picker. Please try again.');
    }
  };

  const uploadImageToStorage = async (uri: string) => {
    try {
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
      
      if (Platform.OS === 'web') {
        // Web platform handling
        const response = await fetch(uri);
        const blob = await response.blob();
        
        const { data, error } = await supabase.storage
          .from('product-images')
          .upload(filePath, blob, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: true,
          });
          
        if (error) throw error;
      } else {
        // For native platforms (Android/iOS)
        try {
          // Read the file as base64 string first
          const base64Data = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          // Convert base64 to a Uint8Array for upload
          const binaryData = Buffer.from(base64Data, 'base64');
          
          // Upload the binary data directly
          const { data, error } = await supabase.storage
            .from('product-images')
            .upload(filePath, binaryData, {
              contentType: mimeType,
              cacheControl: '3600',
              upsert: true,
            });
            
          if (error) throw error;
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
            
            // Use direct fetch API to upload the file
            const { data, error } = await supabase.storage
              .from('product-images')
              .upload(filePath, formData, {
                contentType: 'multipart/form-data',
                cacheControl: '3600',
                upsert: true,
              });
              
            if (error) throw error;
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
        throw new Error('Failed to get public URL');
      }

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error in uploadImageToStorage:', error);
      Alert.alert('Error', error.message || 'An unknown error occurred during image upload.');
      return null;
    }
  };

  const handleUpdateItem = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('inventory')
        .update({
          name: itemName.trim(),
          price: parseFloat(price),
          stock_status: stockStatus,
          description: description || null,
          image_url: imageUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);

      if (error) throw error;

      Alert.alert('Success', 'Item updated successfully');
      setIsEditing(false);
      
      // Update the item in the route params to reflect changes
      const updatedItem = {
        ...item,
        item_name: itemName,
        price: parseFloat(price),
        stock_status: stockStatus,
        description: description || null,
        image_url: imageUrl
      };
      
      // Update navigation params
      navigation.setParams({ item: updatedItem });
    } catch (error) {
      console.error('Error updating item:', error);
      Alert.alert('Error', 'Failed to update item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Item Details</Text>
      </View>
      <ScrollView style={styles.contentContainer}>
        <View style={styles.content}>
          <View style={styles.imageContainer}>
            {isEditing ? (
              <>
                <Image
                  source={imageUrl ? { uri: imageUrl } : require('../../assets/product-default.png')}
                  style={styles.itemImage}
                  resizeMode="cover"
                />
                <Button
                  mode="contained"
                  onPress={handleImagePicker}
                  style={styles.imageButton}
                  buttonColor="#FF6F61"
                >
                  Change Image
                </Button>
              </>
            ) : (
              <Image
                source={imageUrl ? { uri: imageUrl } : require('../../assets/product-default.png')}
                style={styles.itemImage}
                resizeMode="cover"
              />
            )}
          </View>
          
          {isEditing ? (
            <>
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
                <Text style={styles.stockLabel}>In Stock</Text>
                <Switch
                  value={stockStatus}
                  onValueChange={setStockStatus}
                />
              </View>
            </>
          ) : (
            <>
              <Text style={styles.itemName}>{itemName}</Text>
              
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Price:</Text>
                <Text style={styles.priceValue}>Rs. {parseFloat(price).toFixed(2)}</Text>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.stockContainer}>
                <Text style={styles.stockLabel}>Stock Status:</Text>
                <Text style={[styles.stockValue, { color: stockStatus ? '#4CAF50' : '#F44336' }]}>
                  {stockStatus ? 'In Stock' : 'Out of Stock'}
                </Text>
              </View>
              
              <Divider style={styles.divider} />
              
              {description ? (
                <View style={styles.descriptionContainer}>
                  <Text style={styles.descriptionLabel}>Description:</Text>
                  <Paragraph style={styles.descriptionText}>{description}</Paragraph>
                </View>
              ) : (
                <Paragraph style={styles.noDescription}>No description available</Paragraph>
              )}
            </>
          )}
          
          {isEditing ? (
            <View style={styles.buttonContainer}>
              <Button 
                mode="outlined" 
                onPress={() => setIsEditing(false)} 
                style={styles.button}
                textColor="#FF6F61"
                disabled={loading}
              >
                Cancel
              </Button>
              
              <Button 
                mode="contained" 
                onPress={handleUpdateItem} 
                style={styles.button}
                loading={loading}
                disabled={loading}
                buttonColor="#FF6F61"
              >
                Save Changes
              </Button>
            </View>
          ) : (
            <>
              <Button
                mode="contained"
                onPress={() => setIsEditing(true)}
                style={styles.updateButton}
                buttonColor="#FF6F61"
              >
                Update Item
              </Button>
              
              <Button
                mode="outlined"
                onPress={() => navigation.goBack()}
                style={styles.backButton}
                textColor="#FF6F61"
              >
                Back to Inventory
              </Button>
            </>
          )}
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
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    padding: 16,
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  itemImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  imageButton: {
    marginBottom: 10,
  },
  itemName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 18,
    marginRight: 8,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6F61',
  },
  divider: {
    width: '100%',
    marginVertical: 16,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    width: '80%',
    justifyContent: 'space-between',
  },
  stockLabel: {
    fontSize: 18,
    marginRight: 8,
  },
  stockValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  descriptionContainer: {
    width: '100%',
    marginBottom: 24,
  },
  descriptionLabel: {
    fontSize: 18,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  noDescription: {
    fontStyle: 'italic',
    color: '#888',
    marginBottom: 24,
  },
  input: {
    width: '80%',
    marginVertical: 10,
  },
  descriptionInput: {
    minHeight: 120,
    textAlignVertical: 'top',
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
  updateButton: {
    marginTop: 16,
    width: '80%',
    marginBottom: 8,
  },
  backButton: {
    marginTop: 8,
    width: '80%',
    borderColor: '#FF6F61',
  },
});

export default ViewItemScreen;
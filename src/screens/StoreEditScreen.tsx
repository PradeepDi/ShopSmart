import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { Button, TextInput, Title, Snackbar, HelperText } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../supabaseClient';

interface RouteParams {
  storeId: string;
  storeName: string;
  storeAddress: string;
  storeContact: string;
  storeCoordinates?: string;
}

export const StoreEditScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { storeId, storeName, storeAddress, storeContact, storeCoordinates } = route.params as RouteParams;
  
  const [name, setName] = useState(storeName || '');
  const [address, setAddress] = useState(storeAddress || '');
  const [contact, setContact] = useState(storeContact || '');
  const [coordinates, setCoordinates] = useState(storeCoordinates || '');
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleUpdateStore = async () => {
    if (!name || !address || !contact) {
      setSnackbarMessage('Please fill in all required fields');
      setSnackbarVisible(true);
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Parse coordinates string (expected format: "latitude,longitude")
      let parsedLatitude = null;
      let parsedLongitude = null;
      
      if (coordinates && coordinates.trim()) {
        const coordsArray = coordinates.split(',');
        if (coordsArray.length === 2) {
          parsedLatitude = parseFloat(coordsArray[0].trim());
          parsedLongitude = parseFloat(coordsArray[1].trim());
          
          if (isNaN(parsedLatitude) || isNaN(parsedLongitude)) {
            parsedLatitude = null;
            parsedLongitude = null;
          }
        }
      }

      const { data, error } = await supabase
        .from('shops')
        .update({
          name,
          address,
          contact,
          latitude: parsedLatitude,
          longitude: parsedLongitude,
        })
        .eq('id', storeId);

      if (error) throw error;

      setSnackbarMessage('Store updated successfully!');
      setSnackbarVisible(true);
      
      // Navigate back to vendor dashboard after successful update
      setTimeout(() => {
        navigation.navigate('VendorDashboard' as never);
      }, 1500);
    } catch (error) {
      console.error('Error updating store:', error);
      setSnackbarMessage('Failed to update store. Please try again.');
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.navigate('VendorDashboard' as never);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Edit Store</Text>
      </View>
      <ScrollView style={styles.formContainer}>
        <View style={styles.content}>
          <TextInput
            label="Store Name *"
            value={name}
            onChangeText={setName}
            style={styles.input}
            mode="outlined"
            outlineColor="#b5b1b1"
            activeOutlineColor="#FF6F61"
          />
          
          <TextInput
            label="Address *"
            value={address}
            onChangeText={setAddress}
            style={styles.input}
            mode="outlined"
            outlineColor="#b5b1b1"
            activeOutlineColor="#FF6F61"
            multiline
          />
          
          <TextInput
            label="Contact Information *"
            value={contact}
            onChangeText={setContact}
            style={styles.input}
            mode="outlined"
            outlineColor="#b5b1b1"
            activeOutlineColor="#FF6F61"
          />
          
          <TextInput
            label="Store Coordinates"
            value={coordinates}
            onChangeText={setCoordinates}
            style={styles.input}
            mode="outlined"
            outlineColor="#b5b1b1"
            activeOutlineColor="#FF6F61"
            placeholder="e.g. 37.7749, -122.4194"
          />
          <HelperText type="info" style={styles.helperText}>
            Enter as "latitude, longitude" (e.g. 37.7749, -122.4194)
          </HelperText>
        </View>
      </ScrollView>
      
      <View style={styles.buttonContainer}>
        <Button 
          mode="outlined" 
          onPress={handleCancel} 
          style={styles.button}
          textColor='#FF6F61'
        >
          Cancel
        </Button>
        
        <Button 
          mode="contained" 
          onPress={handleUpdateStore} 
          style={styles.button}
          loading={loading}
          disabled={loading}
          buttonColor="#FF6F61"
        >
          Update Store
        </Button>
      </View>
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
      >
        {snackbarMessage}
      </Snackbar>
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
    marginBottom: 80,
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
    padding: 20,
    alignItems: 'center',
    width: '90%',
    alignSelf: 'center',
  },
  input: {
    width: '100%',
    marginVertical: 8,
    backgroundColor: '#fff',
  },
  helperText: {
    width: '80%',
    marginTop: -8,
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FAF3F3',
    padding: 30,
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
    borderColor: '#FF6F61',
    borderRadius: 8,
  },
});
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import { Button, TextInput, Title, Snackbar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../supabaseClient';

export const StoreCreationScreen = () => {
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');
  const [mapLink, setMapLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleCreateStore = async () => {
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

      const { data, error } = await supabase
        .from('shops')
        .insert([
          {
            vendor_id: user.id,
            name,
            address,
            contact,
            map_link: mapLink,
          },
        ]);

      if (error) throw error;

      setSnackbarMessage('Store created successfully!');
      setSnackbarVisible(true);
      
      // Navigate back to vendor dashboard after successful creation
      setTimeout(() => {
        navigation.navigate('VendorDashboard' as never);
      }, 1500);
    } catch (error) {
      console.error('Error creating store:', error);
      setSnackbarMessage('Failed to create store. Please try again.');
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
        <Text style={styles.title}>Create Store</Text>
      </View>
      <ScrollView style={styles.formContainer}>
        <View style={styles.content}>
          <TextInput
            label="Store Name *"
            value={name}
            onChangeText={setName}
            style={styles.input}
            mode="outlined"
          />
          
          <TextInput
            label="Address *"
            value={address}
            onChangeText={setAddress}
            style={styles.input}
            mode="outlined"
            multiline
          />
          
          <TextInput
            label="Contact Information *"
            value={contact}
            onChangeText={setContact}
            style={styles.input}
            mode="outlined"
          />
          
          <TextInput
            label="Map Link"
            value={mapLink}
            onChangeText={setMapLink}
            style={styles.input}
            mode="outlined"
            placeholder="https://maps.google.com/..."
          />
          
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
              onPress={handleCreateStore} 
              style={styles.button}
              loading={loading}
              disabled={loading}
              buttonColor="#FF6F61"
            >
              Create Store
            </Button>
          </View>
        </View>
      </ScrollView>
      
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
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
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
  input: {
    width: '80%',
    marginVertical: 10,
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
});
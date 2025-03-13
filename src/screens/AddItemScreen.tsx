import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text } from 'react-native';
import { Button, TextInput, Switch, HelperText } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../supabaseClient';

interface RouteParams {
  storeId: string;
}

export const AddItemScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { storeId } = route.params as RouteParams;

  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [stockStatus, setStockStatus] = useState(true);
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

  const handleAddItem = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    try {
      // Add the item directly to the inventory table
      const { error: inventoryError } = await supabase
        .from('inventory')
        .insert([
          {
            shop_id: storeId,
            name: itemName.trim(), // Add the item name directly to the inventory table
            price: parseFloat(price),
            stock_status: stockStatus,
            description: description || null,
            updated_at: new Date().toISOString()
          }
        ]);

      if (inventoryError) throw inventoryError;

      Alert.alert('Success', 'Item added to inventory successfully');
      navigation.goBack();
    } catch (error) {
      console.error('Error adding item:', error);
      Alert.alert('Error', 'Failed to add item to inventory');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add New Item</Text>
      </View>
      <ScrollView style={styles.formContainer}>
        <View style={styles.content}>
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
            style={styles.input}
            mode="outlined"
            multiline
            numberOfLines={3}
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
});

export default AddItemScreen;
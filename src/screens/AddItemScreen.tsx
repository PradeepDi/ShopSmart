import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Button, TextInput, Title, Switch, Text, HelperText } from 'react-native-paper';
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
    <ScrollView style={styles.container}>
      <Title style={styles.title}>Add New Item</Title>
      
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
        label="Description (Optional)"
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
      
      <Button
        mode="contained"
        onPress={handleAddItem}
        style={styles.button}
        loading={loading}
        disabled={loading}
      >
        Add Item
      </Button>
      
      <Button
        mode="outlined"
        onPress={() => navigation.goBack()}
        style={styles.button}
        disabled={loading}
      >
        Cancel
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 12,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 16,
    paddingHorizontal: 8,
  },
  button: {
    marginVertical: 8,
  },
});

export default AddItemScreen;
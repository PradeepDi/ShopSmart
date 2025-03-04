import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Button, Card, Title, Paragraph, FAB, IconButton, Divider, Switch, TextInput } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../supabaseClient';

interface InventoryItem {
  id: string;
  item_name: string;
  price: number;
  stock_status: boolean;
  item_id: string;
}

interface RouteParams {
  storeId: string;
}

export const StoreManagementScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { storeId } = route.params as RouteParams;
  
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [storeName, setStoreName] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');

  useEffect(() => {
    fetchStoreDetails();
    fetchInventory();
  }, []);

  const fetchStoreDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('shops')
        .select('name')
        .eq('id', storeId)
        .single();

      if (error) throw error;
      if (data) setStoreName(data.name);
    } catch (error) {
      console.error('Error fetching store details:', error);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      // Join inventory with items to get item names
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          id,
          price,
          stock_status,
          item_id,
          items:item_id(name)
        `)
        .eq('shop_id', storeId);

      if (error) throw error;
      
      // Transform the data to include item_name
      const formattedData = data?.map(item => ({
        id: item.id,
        item_name: item.items?.name || 'Unknown Item',
        price: item.price,
        stock_status: item.stock_status,
        item_id: item.item_id
      })) || [];
      
      setInventory(formattedData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      Alert.alert('Error', 'Failed to load inventory items');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    navigation.navigate('AddInventoryItem', { storeId });
  };

  const toggleStockStatus = async (itemId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('inventory')
        .update({ stock_status: !currentStatus })
        .eq('id', itemId);

      if (error) throw error;
      
      // Update local state
      setInventory(inventory.map(item => 
        item.id === itemId ? {...item, stock_status: !currentStatus} : item
      ));
    } catch (error) {
      console.error('Error updating stock status:', error);
      Alert.alert('Error', 'Failed to update stock status');
    }
  };

  const startEditingPrice = (itemId: string, currentPrice: number) => {
    setEditingItem(itemId);
    setEditPrice(currentPrice.toString());
  };

  const savePrice = async (itemId: string) => {
    const newPrice = parseFloat(editPrice);
    
    if (isNaN(newPrice) || newPrice <= 0) {
      Alert.alert('Invalid Price', 'Please enter a valid price');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('inventory')
        .update({ price: newPrice })
        .eq('id', itemId);

      if (error) throw error;
      
      // Update local state
      setInventory(inventory.map(item => 
        item.id === itemId ? {...item, price: newPrice} : item
      ));
      
      setEditingItem(null);
    } catch (error) {
      console.error('Error updating price:', error);
      Alert.alert('Error', 'Failed to update price');
    }
  };

  const cancelEditing = () => {
    setEditingItem(null);
  };

  return (
    <View style={styles.container}>
      <Title style={styles.title}>{storeName} - Inventory</Title>
      
      <ScrollView style={styles.inventoryList}>
        {inventory.length === 0 && !loading ? (
          <Paragraph style={styles.emptyMessage}>No items in inventory. Add some items to get started!</Paragraph>
        ) : (
          inventory.map((item) => (
            <Card key={item.id} style={styles.itemCard}>
              <Card.Content>
                <Title>{item.item_name}</Title>
                
                {editingItem === item.id ? (
                  <View style={styles.priceEditContainer}>
                    <TextInput
                      label="Price"
                      value={editPrice}
                      onChangeText={setEditPrice}
                      keyboardType="decimal-pad"
                      style={styles.priceInput}
                      mode="outlined"
                    />
                    <IconButton icon="check" onPress={() => savePrice(item.id)} />
                    <IconButton icon="close" onPress={cancelEditing} />
                  </View>
                ) : (
                  <View style={styles.priceContainer}>
                    <Paragraph>Price: ${item.price.toFixed(2)}</Paragraph>
                    <IconButton 
                      icon="pencil" 
                      size={20} 
                      onPress={() => startEditingPrice(item.id, item.price)} 
                    />
                  </View>
                )}
                
                <Divider style={styles.divider} />
                
                <View style={styles.stockContainer}>
                  <Paragraph>In Stock</Paragraph>
                  <Switch 
                    value={item.stock_status} 
                    onValueChange={() => toggleStockStatus(item.id, item.stock_status)}
                  />
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>
      
      <FAB
        style={styles.fab}
        icon="plus"
        label="Add Item"
        onPress={handleAddItem}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    textAlign: 'center',
    margin: 16,
  },
  inventoryList: {
    flex: 1,
    padding: 16,
  },
  itemCard: {
    marginBottom: 16,
  },
  divider: {
    marginVertical: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  priceEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  priceInput: {
    flex: 1,
    marginRight: 8,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  emptyMessage: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#888',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
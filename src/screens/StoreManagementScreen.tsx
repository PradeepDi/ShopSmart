import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text, Image } from 'react-native';
import { Button, Card, Title, Paragraph, FAB, IconButton, Divider, Switch, TextInput, Portal, Dialog, Provider } from 'react-native-paper';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../supabaseClient';

interface InventoryItem {
  id: string;
  item_name: string;
  price: number;
  stock_status: boolean;
  description?: string;
  image_url?: string;
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
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  useEffect(() => {
    fetchStoreDetails();
    fetchInventory();
  }, []);

  // Add useFocusEffect to refresh inventory when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchInventory();
      return () => {};
    }, [])
  );

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
      // Get inventory items directly without joining
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          id,
          name,
          price,
          stock_status,
          description,
          image_url
        `)
        .eq('shop_id', storeId);

      if (error) throw error;
      
      // Transform the data to include item_name
      const formattedData = data?.map(item => ({
        id: item.id,
        item_name: item.name || 'Unknown Item',
        price: item.price,
        stock_status: item.stock_status,
        description: item.description,
        image_url: item.image_url
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
        .from('inventory_items')
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
        .from('inventory_items')
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

  const confirmDelete = (itemId: string) => {
    setDeleteItemId(itemId);
    setDeleteDialogVisible(true);
  };

  const handleDeleteItem = async () => {
    if (!deleteItemId) return;
    
    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', deleteItemId);

      if (error) throw error;
      
      // Update local state by removing the deleted item
      setInventory(inventory.filter(item => item.id !== deleteItemId));
      Alert.alert('Success', 'Item deleted successfully');
    } catch (error) {
      console.error('Error deleting item:', error);
      Alert.alert('Error', 'Failed to delete item');
    } finally {
      setDeleteDialogVisible(false);
      setDeleteItemId(null);
    }
  };

  return (
    <Provider>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{storeName} - Inventory</Text>
        </View>
        
        <ScrollView style={styles.inventoryList}>
          {inventory.length === 0 && !loading ? (
            <Paragraph style={styles.emptyMessage}>No items in inventory. Add some items to get started!</Paragraph>
          ) : (
            inventory.map((item) => (
              <Card key={item.id} style={styles.itemCard}>
                <Card.Content>
                  <View style={styles.itemContainer}>
                    <Image 
                      source={item.image_url ? { uri: item.image_url } : require('../../assets/product-default.png')} 
                      style={styles.itemImage} 
                    />
                    <View style={styles.itemDetails}>
                      <Title style={styles.itemTitle} onPress={() => navigation.navigate('ViewItem', { item })}>{item.item_name}</Title>
                      
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
                          <Paragraph>Price: Rs. {item.price.toFixed(2)}</Paragraph>
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
                      
                      <View style={styles.actionContainer}>
                        <Button 
                          mode="outlined" 
                          onPress={() => navigation.navigate('ViewItem', { item })}
                          style={styles.viewButton}
                          textColor="#FF6F61"
                        >
                          View Details
                        </Button>
                        <IconButton 
                          icon="delete" 
                          color="#FF5252"
                          size={20} 
                          onPress={() => confirmDelete(item.id)} 
                        />
                      </View>
                    </View>
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
          color="white"
          backgroundColor="#FF6F61"
        />
        
        <Portal>
          <Dialog
            visible={deleteDialogVisible}
            onDismiss={() => setDeleteDialogVisible(false)}
          >
            <Dialog.Title>Delete Item</Dialog.Title>
            <Dialog.Content>
              <Paragraph>Are you sure you want to delete this item? This action cannot be undone.</Paragraph>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
              <Button onPress={handleDeleteItem} color="#FF5252">Delete</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
    </Provider>
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
    paddingHorizontal: 16,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  inventoryList: {
    flex: 1,
    padding: 16,
  },
  itemCard: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  itemDetails: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#333',
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
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  viewButton: {
    flex: 1,
    marginRight: 8,
    borderColor: '#FF6F61',
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
    backgroundColor: '#FF6F61',
  },
});
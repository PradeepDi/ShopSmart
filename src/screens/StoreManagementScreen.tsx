import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, Text, Image } from 'react-native';
import { Button, Card, Title, Paragraph, FAB, IconButton, Divider, Switch, TextInput, Portal, Dialog, Provider, Chip, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../supabaseClient';
import BottomNavBar from '../components/BottomNavBar';

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
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
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

  // Filter inventory items when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredInventory(inventory);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = inventory.filter(item => 
        item.item_name.toLowerCase().includes(query)
      );
      setFilteredInventory(filtered);
    }
  }, [searchQuery, inventory]);

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

  const onChangeSearch = (query: string) => {
    setSearchQuery(query);
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
      setFilteredInventory(formattedData);
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
        .from('inventory_items')
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
        
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search items"
            onChangeText={onChangeSearch}
            value={searchQuery}
            style={styles.searchBar}
            iconColor="#FF6F61"
          />
        </View>
        
        <ScrollView style={styles.inventoryList}>
          {inventory.length === 0 && !loading ? (
            <View style={styles.emptyContainer}>
              <Image 
                source={require('../../assets/add-item.png')} 
                style={styles.emptyImage} 
                resizeMode="contain"
              />
              <Text style={styles.emptyText}>No items in inventory</Text>
              <Text style={styles.emptySubText}>Add items to get started</Text>
            </View>
          ) : filteredInventory.length === 0 && searchQuery.trim() !== '' ? (
            <Paragraph style={styles.emptyMessage}>No items match your search.</Paragraph>
          ) : (
            filteredInventory.map((item) => (
              <Card key={item.id} style={styles.card}>
                <Card.Content>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName} onPress={() => navigation.navigate('ViewItem', { item })}>{item.item_name}</Text>
                      
                      {editingItem === item.id ? (
                        <View style={styles.priceEditContainer}>
                          <TextInput
                            label="Price"
                            value={editPrice}
                            onChangeText={setEditPrice}
                            keyboardType="decimal-pad"
                            style={styles.priceInput}
                            mode="outlined"
                            outlineColor="#a8a7a7"
                            activeOutlineColor="#FF6F61"
                          />
                          <View style={styles.iconWrapper}>
                            <IconButton 
                              icon="check" 
                              size={20} 
                              onPress={() => savePrice(item.id)} 
                              iconColor="#FF6F61"
                            />
                          </View>
                          <View style={styles.iconWrapper}>
                            <IconButton 
                              icon="close" 
                              size={20} 
                              onPress={cancelEditing} 
                              iconColor="#FF6F61"
                            />
                          </View>
                        </View>
                      ) : (
                        <View style={styles.priceContainer}>
                          <Text style={styles.price}>Rs. {item.price.toFixed(2)}</Text>
                          <View style={styles.iconWrapper}>
                            <IconButton 
                              icon="pencil" 
                              size={20} 
                              onPress={() => startEditingPrice(item.id, item.price)} 
                              iconColor="#FF6F61"
                            />
                          </View>
                        </View>
                      )}
                    </View>
                    <View style={styles.imageContainer}>
                      <Image 
                        source={item.image_url ? { uri: item.image_url } : require('../../assets/product-default.png')} 
                        style={styles.itemImage}
                        resizeMode="cover"
                      />
                    </View>
                  </View>
                  
                  <Divider style={styles.divider} />
                  
                  <View style={styles.stockContainer}>
                    <Chip 
                      icon={item.stock_status ? "check-circle" : "alert-circle"}
                      style={[styles.stockChip, item.stock_status ? styles.inStock : styles.outOfStock]}
                    >
                      {item.stock_status ? 'In Stock' : 'Out of Stock'}
                    </Chip>
                  </View>
                </Card.Content>
                <Card.Actions style={styles.cardActions}>
                  <View style={styles.buttonContainer}>
                    <Button 
                      mode="outlined" 
                      onPress={() => toggleStockStatus(item.id, item.stock_status)}
                      style={styles.actionButton}
                      labelStyle={styles.buttonLabel}
                      icon={({size, color}) => (
                        <MaterialCommunityIcons name="package-variant" size={size} color={color} style={{marginRight: 20}} />
                      )}
                    >
                      Toggle Stock
                    </Button>
                    <Button 
                      mode="outlined" 
                      onPress={() => navigation.navigate('ViewItem', { item })}
                      style={styles.actionButton}
                      labelStyle={styles.buttonLabel}
                      icon={({size, color}) => (
                        <MaterialCommunityIcons name="information-outline" size={size} color={color} style={{marginRight: 20}} />
                      )}
                    >
                      View Details
                    </Button>
                    <Button 
                      mode="contained" 
                      onPress={() => confirmDelete(item.id)}
                      style={[styles.actionButton, styles.primaryButton]}
                      labelStyle={styles.primaryButtonLabel}
                      icon={({size, color}) => (
                        <MaterialCommunityIcons name="delete" size={size} color={color} style={{marginRight: 20}} />
                      )}
                    >
                      Delete
                    </Button>
                  </View>
                </Card.Actions>
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
              <Button onPress={() => setDeleteDialogVisible(false)} textColor="#FF5252">Cancel</Button>
              <Button onPress={handleDeleteItem} textColor="#FF5252">Delete</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </View>
      <View style={styles.bottomNavContainer}>
        <BottomNavBar currentScreen="StoreManagement" />
      </View>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF3F3',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBar: {
    borderRadius: 8,
    elevation: 2,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#FF6F61',
    width: '100%',
    paddingVertical: 60,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
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
  card: {
    marginBottom: 16,
    elevation: 4,
    borderRadius: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    color: '#FF6F61',
    fontWeight: 'bold',
  },
  imageContainer: {
    position: 'relative',
    width: 60,
    height: 60,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
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
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fcd4d2',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
    marginRight: 20,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  stockChip: {
    height: 30,
  },
  inStock: {
    backgroundColor: '#E8F5E9',
  },
  outOfStock: {
    backgroundColor: '#FFEBEE',
  },
  cardActions: {
    padding: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingRight: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6F61',
    height: 40,
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 12,
    marginHorizontal: 0,
    color: '#FF6F61',
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#FF6F61',
    borderColor: '#FF6F61',
  },
  primaryButtonLabel: {
    fontSize: 12,
    marginHorizontal: 0,
    color: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
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
    marginBottom: 85,
    right: 10,
    bottom: 10,
    backgroundColor: '#FF6F61',
    borderRadius: 8,
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 40,
  },
  emptyImage: {
    width: 200,
    height: 200,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
});
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Modal } from 'react-native';
import { IconButton, Button, TextInput, Checkbox } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { supabase } from '../../supabaseClient'; // Adjust the path as necessary

type ListViewScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ListView'>;
type ListViewScreenRouteProp = RouteProp<RootStackParamList, 'ListView'>;

// Define an interface for item structure with name, quantity, and store information
interface ListItem {
  id: number;
  name: string;
  quantity: number;
  is_checked: boolean;
  store_name?: string;
  price?: number;
  distance?: number | null;
}

const ListViewScreen = () => {
  const navigation = useNavigation<ListViewScreenNavigationProp>();
  const route = useRoute<ListViewScreenRouteProp>();
  const { listId, listName } = route.params || { listId: null, listName: 'Default List' };
  const [items, setItems] = useState<ListItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('1'); // Default quantity is 1
  const [isAdding, setIsAdding] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // Track authentication status
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState({ index: -1, text: '', quantity: '1' });
  const [totalPrice, setTotalPrice] = useState<number>(0); // State to store the total price

  // Check user authentication status when component mounts
  useEffect(() => {
    const checkAuthStatus = async () => {
      const { data: userResponse, error: userError } = await supabase.auth.getUser();
      setIsLoggedIn(!userError && userResponse?.user ? true : false);
    };
    
    checkAuthStatus();
  }, []);

  // Define fetchItems function outside of useEffect for reuse
  const fetchItems = async () => {
    if (!listId) return;
    
    const { data, error } = await supabase
      .from('items') // Assuming you have an 'items' table
      .select('id, name, quantity, is_checked, store_name, price, distance')
      .eq('list_id', listId);

    if (error) {
      console.error(error);
    } else {
      // Transform the data to match our ListItem interface
      const formattedItems = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity || 1, // Default to 1 if quantity is not present
        is_checked: item.is_checked || false,
        store_name: item.store_name || null,
        price: item.price || null,
        distance: item.distance || null
      }));
      setItems(formattedItems);
    }
  };

  // Initial fetch when component mounts
  useEffect(() => {
    if (listId) {
      fetchItems();
    }
  }, [listId]);
  
  // Refresh items when screen comes into focus (e.g., returning from PickItem screen)
  useFocusEffect(
    React.useCallback(() => {
      if (listId) {
        // Fetch items to get the latest data including store information
        fetchItems();
      }
      return () => {}; // Cleanup function
    }, [listId])
  );

  const editItem = (index: number) => {
    const item = items[index];
    setEditingItem({ 
      index, 
      text: item.name,
      quantity: item.quantity.toString()
    });
    setEditModalVisible(true);
  };

  const saveEditedItem = async () => {
    if (editingItem.text.trim() && editingItem.index !== -1) {
      const quantity = parseInt(editingItem.quantity) || 1;
      
      // Update the item in the database
      const { error } = await supabase
        .from('items')
        .update({ 
          name: editingItem.text.trim(),
          quantity: quantity
        })
        .eq('id', items[editingItem.index].id);

      if (error) {
        console.error('Error updating item:', error);
        return;
      }

      // Update the local state
      const updatedItems = [...items];
      updatedItems[editingItem.index] = {
        ...updatedItems[editingItem.index],
        name: editingItem.text.trim(),
        quantity: quantity
      };
      setItems(updatedItems);
      setEditModalVisible(false);
      setEditingItem({ index: -1, text: '', quantity: '1' });
    }
  };

  const toggleItemCheck = async (index: number) => {
    const item = items[index];
    const newCheckedStatus = !item.is_checked;
    
    // Save the checked status to the database if user is logged in
    if (isLoggedIn) {
      const { error } = await supabase
        .from('items')
        .update({ is_checked: newCheckedStatus })
        .eq('id', item.id);
      
      if (error) {
        console.error('Error updating item check status:', error);
        return;
      }
    }
    
    // Update local state
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      is_checked: newCheckedStatus
    };
    setItems(updatedItems);
  };

  const deleteItem = async (index: number) => {
    const itemId = items[index].id;
    
    // Delete the item from the database
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', itemId);
    
    if (error) {
      console.error('Error deleting item:', error);
      return;
    }
    
    // Update local state
    setItems(items.filter((_, i) => i !== index));
  };

  const unpickItem = async (index: number) => {
    const item = items[index];
    
    // Only proceed if the item has store information
    if (!item.store_name && !item.price && item.distance === null) {
      return;
    }
    
    // Update the item in the database to remove store-specific information
    const { error } = await supabase
      .from('items')
      .update({ 
        store_name: null,
        price: null,
        distance: null
      })
      .eq('id', item.id);
    
    if (error) {
      console.error('Error unpicking item:', error);
      return;
    }
    
    // Update local state
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      store_name: null,
      price: null,
      distance: null
    };
    setItems(updatedItems);
  };

  const addItem = async () => {
    if (newItem.trim() && !isAdding) {
      setIsAdding(true);
      
      // Convert quantity to number, default to 1 if invalid
      const quantity = parseInt(newItemQuantity) || 1;
      
      // Insert the new item into the database
      const { data, error } = await supabase
        .from('items')
        .insert([{ 
          name: newItem.trim(), 
          list_id: listId,
          quantity: quantity
        }])
        .select();

      if (error) {
        console.error('Error adding item:', error);
        setIsAdding(false);
        return;
      }

      // Update the local state with the new item
      if (data && data.length > 0) {
        setItems([...items, {
          id: data[0].id,
          name: data[0].name,
          quantity: data[0].quantity,
          is_checked: false
        }]);
      }
      
      setNewItem('');
      setNewItemQuantity('1');
      setModalVisible(false);
      setIsAdding(false);
    }
  };

  // Function to validate quantity input
  const isQuantityValid = (quantity: string) => {
    const parsedQuantity = parseInt(quantity);
    return !isNaN(parsedQuantity) && parsedQuantity > 0;
  };
  
  // Format distance to be user-friendly (show in km or m)
  const formatDistance = (distance: number | null) => {
    if (distance === null || distance === undefined) return 'Unknown';
    
    // Convert to number if it's a string or other type
    const distanceNum = Number(distance);
    
    // Check if conversion resulted in a valid number
    if (isNaN(distanceNum)) return 'Unknown';
  
    if (distanceNum < 0.1) {
      // If less than 100m, show in meters
      return `${Math.round(distanceNum * 1000)}m`;
    } else if (distanceNum < 1) {
      // If less than 1km, show in meters
      return `${Math.round(distanceNum * 1000)}m`;
    } else {
      // Otherwise show in kilometers with one decimal
      return `${distanceNum.toFixed(1)}km`;
    }
  };

  // Calculate total price of all items in the list
  // Only include unchecked items in the total price calculation
  const calculateTotalPrice = () => {
    let total = 0;
    items.forEach(item => {
      if (item.price && !item.is_checked) {
        total += item.price * item.quantity;
      }
    });
    return total;
  };
  
  // Update total price whenever items change
  useEffect(() => {
    setTotalPrice(calculateTotalPrice());
  }, [items]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{listName}</Text>
      </View>
      {!isLoggedIn && (
        <Text style={styles.loginPrompt}>Login to enable all features</Text>
      )}
      {isLoggedIn && <View style={styles.loggedInSpacer} />}
      <Button
        mode="contained"
        style={styles.searchButton}
        onPress={() => {
          navigation.navigate('SearchByImage', { listId, listName });
        }}
      >
        Search by Image
      </Button>
      <FlatList
        data={items}
        renderItem={({ item, index }) => (
          <View style={styles.itemContainer}>
            {/* Top Section */}
            <View style={styles.topSection}>
              <View style={styles.itemLeftSection}>
                <View style={styles.checkboxContainer}>
                  <Checkbox
                    status={item.is_checked ? 'checked' : 'unchecked'}
                    onPress={() => toggleItemCheck(index)}
                    color="#FF6F61"
                  />
                </View>
                <View style={styles.itemDetails}>
                  <Text style={[styles.itemText, item.is_checked && styles.checkedItemText]}>{item.name}</Text>
                </View>
              </View>
              <View style={styles.iconContainer}>
                <View style={styles.iconWrapper}>
                  <IconButton
                    icon="pencil"
                    size={20}
                    onPress={() => editItem(index)}
                    iconColor="#FF6F61"
                  />
                </View>
                <View style={styles.iconWrapper}>
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => deleteItem(index)}
                    iconColor="#FF6F61"
                  />
                </View>
                {(item.store_name || item.price || item.distance !== null) && (
                  <View style={styles.iconWrapper}>
                    <IconButton
                      icon="cart-remove"
                      size={20}
                      onPress={() => unpickItem(index)}
                      iconColor="#FF6F61"
                    />
                  </View>
                )}
              </View>
            </View>
            
            {/* Divider */}
            <View style={styles.divider} />
            
            {/* Bottom Section */}
            <View style={styles.bottomItemSection}>
              <View style={styles.itemInfoSection}>
                <View style={styles.leftInfoContainer}>
                  <Text style={styles.quantityText}>Qty: {item.quantity}</Text>
                  {item.price && (
                    <Text style={styles.priceText}>Price: Rs. {item.price.toFixed(2)}</Text>
                  )}
                </View>
                <View style={styles.storeInfoContainer}>
                  {item.store_name && (
                    <Text style={styles.storeInfoText}>Store: {item.store_name}</Text>
                  )}
                  {item.distance !== null && item.distance !== undefined && (
                    <Text style={styles.distanceText}>Distance: {formatDistance(item.distance)}</Text>
                  )}
                </View>
              </View>
              <Button
                mode="text"
                onPress={() => {
                  navigation.navigate('PickItem', { 
                    itemName: item.name,
                    listId: listId,
                    listName: listName
                  });
                }}
                style={styles.viewShopsButton}
                textColor="#FF6F61"
              >
                View Items
              </Button>
            </View>
          </View>
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
      />
      {/* Total Price Section */}
      <View style={styles.totalPriceContainer}>
        <Text style={styles.totalPriceLabel}>Total Price:</Text>
        <Text style={styles.totalPriceValue}>Rs. {totalPrice.toFixed(2)}</Text>
      </View>
      
      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {!isLoggedIn && (
          <Button
            mode="contained"
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
          >
            Login
          </Button>
        )}
        <View style={styles.bottomButtons}>
          <Button
            mode="contained"
            style={styles.button}
            onPress={() => setModalVisible(true)}
          >
            Add New Item
          </Button>
          <Button
            mode="contained"
            style={styles.button}
            onPress={() => navigation.navigate('ViewParking')}
          >
            View Parkings
          </Button>
        </View>
      </View>

      {/* Modal for Adding New Item */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Item</Text>
            <TextInput
              placeholder="Item Name"
              value={newItem}
              onChangeText={setNewItem}
              style={styles.textInput}
              mode="outlined"
              outlineColor="#b5b1b1"
              activeOutlineColor="#FF6F61"
            />
            <TextInput
              placeholder="Quantity"
              value={newItemQuantity}
              onChangeText={setNewItemQuantity}
              keyboardType="numeric"
              style={styles.textInput}
              mode="outlined"
              outlineColor="#b5b1b1"
              activeOutlineColor="#FF6F61"
              error={!isQuantityValid(newItemQuantity) && newItemQuantity !== ''}
            />
            {!isQuantityValid(newItemQuantity) && newItemQuantity !== '' && (
              <Text style={styles.errorText}>Quantity must be a positive number</Text>
            )}
            <Button mode="contained" onPress={addItem} style={styles.modalButton} disabled={!newItem.trim() || !isQuantityValid(newItemQuantity)}>
              Add Item
            </Button>
            <Button mode="contained" onPress={() => setModalVisible(false)} style={styles.modalButton}>
              Cancel
            </Button>
          </View>
        </View>
      </Modal>
      {/* Modal for Editing Item */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Item</Text>
            <TextInput
              placeholder="Item Name"
              value={editingItem.text}
              onChangeText={(text) => setEditingItem({ ...editingItem, text })}
              style={styles.textInput}
              mode="outlined"
              outlineColor="#e0e0e0"
              activeOutlineColor="#4169e1"
            />
            <TextInput
              placeholder="Quantity"
              value={editingItem.quantity}
              onChangeText={(quantity) => setEditingItem({ ...editingItem, quantity })}
              keyboardType="numeric"
              style={styles.textInput}
              mode="outlined"
              outlineColor="#e0e0e0"
              activeOutlineColor="#4169e1"
              error={!isQuantityValid(editingItem.quantity) && editingItem.quantity !== ''}
            />
            {!isQuantityValid(editingItem.quantity) && editingItem.quantity !== '' && (
              <Text style={styles.errorText}>Quantity must be a positive number</Text>
            )}
            <Button 
              mode="contained" 
              onPress={saveEditedItem} 
              style={styles.modalButton}
              disabled={!editingItem.text.trim() || !isQuantityValid(editingItem.quantity)}
            >
              Save Changes
            </Button>
            <Button mode="contained" onPress={() => setEditModalVisible(false)} style={styles.modalButton}>
              Cancel
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF3F3',
  },
  totalPriceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  totalPriceLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalPriceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6F61',
  },
  header: {
    backgroundColor: '#FF6F61',
    width: '100%',
    paddingVertical: 60,
    marginBottom: -20,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  loginPrompt: {
    textAlign: 'center',
    marginVertical: 10,
    color: '#FF6F61',
    fontWeight: 'bold',
  },
  searchButton: {
    backgroundColor: '#FF6F61',
    marginHorizontal: 20,
    marginBottom: 10,
    marginTop: 10,
    height: 45,
    width: '90%',
    justifyContent: 'center',
    borderRadius: 8,
    elevation: 3,
  },
  listContent: {
    padding: 12,
    paddingBottom: 80, // Add extra padding at the bottom for better scrolling experience
  },
  itemContainer: {
    flexDirection: 'column',
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  topSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingBottom: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    width: '100%',
    marginVertical: 8,
  },
  bottomItemSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingTop: 8,
  },
  itemInfoSection: {
    flex: 1,
  },
  itemLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkboxContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0EF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 8,
    paddingRight: 8,
  },
  itemInfoSection: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  leftInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  storeInfoContainer: {
    alignItems: 'flex-start',
    marginTop: 4,
  },
  itemText: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 6,
    color: '#333',
  },
  quantityText: {
    fontSize: 15,
    color: '#555',
    marginTop: 4,
    fontWeight: '500',
  },
  storeInfoText: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 2,
    fontWeight: '500',
    textAlign: 'left',
  },
  priceText: {
    fontSize: 14,
    color: '#FF6F61',
    marginTop: 4,
    marginRight: 10,
    marginLeft: 10,
    fontWeight: 'bold',
  },
  distanceText: {
    fontSize: 14,
    color: '#2196F3',
    marginTop: 2,
    fontWeight: '500',
    textAlign: 'left',
  },
  checkedItemText: {
    textDecorationLine: 'line-through',
    color: '#aaa',
    fontStyle: 'italic',
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF0EF',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  viewShopsButton: {
    marginLeft: 10,
    borderColor: '#FF6F61',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 0,
    height: 36,
    color: '#FF6F61',
    justifyContent: 'center',
  },
  bottomSection: {
    margin: 20,
  },
  loginButton: {
    backgroundColor: '#FF6F61',
    marginBottom: 10,
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    backgroundColor: '#FF6F61',
    marginHorizontal: 5,
    borderRadius: 8,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 20,
  },
  textInput: {
    width: '100%',
    marginVertical: 8,
    backgroundColor: '#fff',
  },
  modalButton: {
    width: '40%',
    marginVertical: 8,
    paddingVertical: 2,
    justifyContent: 'center',
    backgroundColor: '#FF6F61',
    borderRadius: 8,
  },
  loggedInSpacer: {
    height: 30,
  },
  errorText: {
    color: '#B00020',
    marginBottom: 10,
    fontSize: 12,
  }
});

export default ListViewScreen;

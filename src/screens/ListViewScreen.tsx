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
          // Handle search by image logic
        }}
      >
        Search by Image
      </Button>
      <FlatList
        data={items}
        renderItem={({ item, index }) => (
          <View style={styles.itemContainer}>
            <View style={styles.itemLeftSection}>
              <Checkbox
                status={item.is_checked ? 'checked' : 'unchecked'}
                onPress={() => toggleItemCheck(index)}
                color="#FF6F61"
              />
              <View style={styles.itemDetails}>
                <Text style={[styles.itemText, item.is_checked && styles.checkedItemText]}>{item.name}</Text>
                <Text style={styles.quantityText}>Qty: {item.quantity}</Text>
                {item.store_name && (
                  <Text style={styles.storeInfoText}>Store: {item.store_name}</Text>
                )}
                {item.price && (
                  <Text style={styles.priceText}>Price: Rs. {item.price.toFixed(2)}</Text>
                )}
                {item.distance !== null && item.distance !== undefined && (
                  <Text style={styles.distanceText}>Distance: {formatDistance(item.distance)}</Text>
                )}
              </View>
            </View>
            <View style={styles.iconContainer}>
              <IconButton
                icon="pencil"
                size={20}
                onPress={() => editItem(index)}
              />
              <IconButton
                icon="delete"
                size={20}
                onPress={() => deleteItem(index)}
              />
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
              >
                View Items
              </Button>
            </View>
          </View>
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
      />
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
              label="Item Name"
              value={newItem}
              onChangeText={setNewItem}
              style={styles.textInput}
            />
            <TextInput
              label="Quantity"
              value={newItemQuantity}
              onChangeText={setNewItemQuantity}
              keyboardType="numeric"
              style={styles.textInput}
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
              label="Item Name"
              value={editingItem.text}
              onChangeText={(text) => setEditingItem({ ...editingItem, text })}
              style={styles.textInput}
            />
            <TextInput
              label="Quantity"
              value={editingItem.quantity}
              onChangeText={(quantity) => setEditingItem({ ...editingItem, quantity })}
              keyboardType="numeric"
              style={styles.textInput}
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
  header: {
    backgroundColor: '#FF6F61',
    width: '100%',
    paddingVertical: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
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
    marginHorizontal: 5,
    marginBottom: 20,
    height: 50,
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    marginHorizontal: 16,
  },
  itemLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 10,
  },
  itemText: {
    fontSize: 16,
  },
  quantityText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  storeInfoText: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
  priceText: {
    fontSize: 12,
    color: '#FF6F61',
    marginTop: 2,
    fontWeight: 'bold',
  },
  distanceText: {
    fontSize: 12,
    color: '#2196F3',
    marginTop: 2,
  },
  checkedItemText: {
    textDecorationLine: 'line-through',
    color: '#888',
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewShopsButton: {
    marginLeft: 10,
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
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    marginBottom: 20,
  },
  textInput: {
    width: '100%',
    marginBottom: 20,
  },
  modalButton: {
    marginVertical: 5,
    backgroundColor: '#FF6F61'
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

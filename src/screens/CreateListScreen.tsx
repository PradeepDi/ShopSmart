import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, ActivityIndicator, Modal } from 'react-native';
import { TextInput, Button, IconButton, Chip, HelperText } from 'react-native-paper';
import ScrollPicker from 'react-native-wheel-scrollview-picker';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { supabase } from '../../supabaseClient';
import BottomNavBar from '../components/BottomNavBar';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type CreateListScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateList'>;

// Define an interface for item structure with name and quantity
interface ListItem {
  name: string;
  quantity: number;
}

const CreateListScreen = () => {
  const navigation = useNavigation<CreateListScreenNavigationProp>();
  const [listName, setListName] = useState('');
  const [items, setItems] = useState<ListItem[]>([]);
  const [itemName, setItemName] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1'); // Default quantity is 1
  const [isCreating, setIsCreating] = useState(false); // Guard to prevent duplicate submissions
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null means loading state
  const [quantityPickerVisible, setQuantityPickerVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(-1);
  const [editingItemQuantity, setEditingItemQuantity] = useState('1');

  const addItem = () => {
    if (itemName.trim()) {
      // Convert quantity to number, default to 1 if invalid
      const quantity = parseInt(itemQuantity) || 1;
      
      // Add new item with name and quantity
      setItems([...items, { name: itemName.trim(), quantity }]);
      
      // Reset input fields
      setItemName('');
      setItemQuantity('1');
    }
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };
  
  const editItem = (index: number) => {
    setEditingItemIndex(index);
    setEditingItemQuantity(items[index].quantity.toString());
    setEditModalVisible(true);
  };
  
  const saveEditedItem = () => {
    if (editingItemIndex !== -1) {
      const quantity = parseInt(editingItemQuantity) || 1;
      
      // Update the local state
      const updatedItems = [...items];
      updatedItems[editingItemIndex] = {
        ...updatedItems[editingItemIndex],
        quantity: quantity
      };
      setItems(updatedItems);
      setEditModalVisible(false);
      setEditingItemIndex(-1);
      setEditingItemQuantity('1');
    }
  };
  
  // Function to validate quantity input for both add and edit
  const isQuantityValid = (value: string = itemQuantity) => {
    const quantity = parseInt(value);
    return !isNaN(quantity) && quantity > 0;
  };

  // Check user authentication status when component mounts
  useEffect(() => {
    const checkAuthStatus = async () => {
      const { data: userResponse, error: userError } = await supabase.auth.getUser();
      setIsLoggedIn(!userError && userResponse?.user ? true : false);
    };
    
    checkAuthStatus();
  }, []);

  const createList = async () => {
    // Prevent duplicate submissions
    if (isCreating) return;
    setIsCreating(true);

    // Check for basic validation first
    if (!listName.trim() || items.length === 0) {
      Alert.alert('Incomplete Input', 'Please enter a list name and add at least one item.');
      setIsCreating(false);
      return;
    }

    // Try to get user information
    const { data: userResponse, error: userError } = await supabase.auth.getUser();
    const isLoggedIn = !userError && userResponse?.user;

    // Save the list to the database (with or without user ID)
    const listPayload = isLoggedIn 
      ? { name: listName, user_id: userResponse.user.id } 
      : { name: listName, is_anonymous: true };

    const { data: listData, error: listError } = await supabase
      .from('lists')
      .insert([listPayload])
      .select();

    if (listError || !listData) {
      console.error('Insert Error:', listError);
      Alert.alert('Error', listError?.message || 'An unknown error occurred.');
      setIsCreating(false);
      return;
    }

    const listId = listData[0].id;

    // Save items to the database with the list ID and quantity
    const itemInserts = items.map(item => ({ 
      name: item.name, 
      quantity: item.quantity, 
      list_id: listId 
    }));
    const { error: itemsError } = await supabase
      .from('items')
      .insert(itemInserts);

    if (itemsError) {
      console.error('Items Insert Error:', itemsError);
      Alert.alert('Error', itemsError.message || 'An unknown error occurred.');
    } else {
      // Navigate based on user authentication status
      if (isLoggedIn) {
        navigation.navigate('Dashboard');
      } else {
        // For non-logged in users, navigate to the ListView screen with the new list
        navigation.navigate('ListView', { 
          listId: listData[0].id, 
          listName: listName 
        });
      }
    }
    setIsCreating(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create List</Text>
      </View>
      <View style={styles.content}>
        {isLoggedIn === null ? (
          <ActivityIndicator size="large" color="#FF6F61" style={styles.loader} />
        ) : (
          <View style={styles.authStatusContainer}>
            <Chip 
              icon={isLoggedIn ? "account-check" : "account-question"}
              mode="outlined" 
              style={[styles.authChip, isLoggedIn ? styles.loggedInChip : styles.anonymousChip]}
            >
              {isLoggedIn ? "Logged In" : "Guest Mode"}
            </Chip>
            {!isLoggedIn && (
              <Text style={styles.guestMessage}>
                You're creating a list as a guest.
              </Text>
            )}
          </View>
        )}
        <TextInput
          placeholder="List Name"
          value={listName}
          onChangeText={setListName}
          style={styles.input}
          mode="outlined"
          outlineColor="#b5b1b1"
          activeOutlineColor="#FF6F61"
        />
        <View style={styles.inputRow}>
          <TextInput
            placeholder="Add Item"
            value={itemName}
            onChangeText={setItemName}
            style={styles.itemNameInput}
            mode="outlined"
            outlineColor="#b5b1b1"
            activeOutlineColor="#FF6F61"
          />
          <TextInput
            placeholder="Qty"
            value={itemQuantity}
            onPress={() => setQuantityPickerVisible(true)}
            showSoftInputOnFocus={false}
            style={styles.quantityInput}
            mode="outlined"
            outlineColor="#b5b1b1"
            activeOutlineColor="#FF6F61"
            error={!isQuantityValid() && itemQuantity !== ''}
          />
          <IconButton
            mode="contained"
            icon="plus"
            size={26}
            onPress={addItem}
            disabled={!itemName.trim() || !isQuantityValid()}
            style={styles.addButton}
            iconColor="white"
          />
        </View>
        {!isQuantityValid() && itemQuantity !== '' && (
          <HelperText type="error" style={styles.errorText}>
            Quantity must be a positive number
          </HelperText>
        )}
        <FlatList
          data={items}
          renderItem={({ item, index }) => (
            <View style={styles.itemContainer}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemText}>{item.name}</Text>
                <Text style={styles.quantityText}>Qty: {item.quantity}</Text>
              </View>
              <View style={styles.itemActions}>
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
                    onPress={() => removeItem(index)}
                    iconColor="#FF6F61"
                  />
                </View>
              </View>
            </View>
          )}
          keyExtractor={(item, index) => index.toString()}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
        {!isLoggedIn && (
          <Text
            style={styles.loginText}
          >
            Login to save lists to your account
          </Text>
        )}
        <Button
          mode="contained"
          style={styles.button}
          onPress={createList}
          disabled={isCreating} // Optionally disable the button while processing
          loading={isCreating}
        >
          {isCreating ? 'Creating...' : 'Create List'}
        </Button>
      </View>
        <View style={styles.bottomNavContainer}>
          <BottomNavBar currentScreen="CreateList" isLoggedIn={isLoggedIn} />
        </View>
        
        {/* Quantity Picker Modal */}
        <Modal
          visible={quantityPickerVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setQuantityPickerVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Quantity</Text>
              <View style={styles.pickerContainer}>
                <ScrollPicker
                  dataSource={Array.from({length: 99}, (_, i) => (i + 1).toString())}
                  selectedIndex={parseInt(itemQuantity) - 1 || 0}
                  renderItem={(data, index, isSelected) => (
                    <Text style={[styles.pickerItemText, isSelected && styles.selectedItemText]}>{data}</Text>
                  )}
                  onValueChange={(data) => {
                    setItemQuantity(data);
                  }}
                  wrapperHeight={150}
                  wrapperWidth={150}
                  wrapperBackground={'#FFFFFF'}
                  itemHeight={50}
                  highlightColor={'#FF6F61'}
                  highlightBorderWidth={1}
                  activeItemColor={'#FF6F61'}
                  itemColor={'#999'}
                />
              </View>
              <Button 
                mode="contained" 
                onPress={() => setQuantityPickerVisible(false)}
                style={styles.doneButton}
              >
                Done
              </Button>
            </View>
          </View>
        </Modal>

        {/* Edit Item Quantity Modal */}
        <Modal
          visible={editModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Quantity</Text>
              <View style={styles.pickerContainer}>
                <ScrollPicker
                  dataSource={Array.from({length: 99}, (_, i) => (i + 1).toString())}
                  selectedIndex={parseInt(editingItemQuantity) - 1 || 0}
                  renderItem={(data, index, isSelected) => (
                    <Text style={[styles.pickerItemText, isSelected && styles.selectedItemText]}>{data}</Text>
                  )}
                  onValueChange={(data) => {
                    setEditingItemQuantity(data);
                  }}
                  wrapperHeight={150}
                  wrapperWidth={150}
                  wrapperBackground={'#FFFFFF'}
                  itemHeight={50}
                  highlightColor={'#FF6F61'}
                  highlightBorderWidth={1}
                  activeItemColor={'#FF6F61'}
                  itemColor={'#999'}
                />
              </View>
              <Button 
                mode="contained" 
                onPress={saveEditedItem}
                style={styles.doneButton}
              >
                Save
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
  loader: {
    marginVertical: 20,
  },
  authStatusContainer: {
    width: '80%',
    alignItems: 'center',
    marginVertical: 10,
  },
  authChip: {
    marginBottom: 10,
  },
  loggedInChip: {
    backgroundColor: '#E8F5E9',
  },
  anonymousChip: {
    backgroundColor: '#FFF8E1',
  },
  guestMessage: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 10,
    fontSize: 12,
  },
  loginText: {
    marginBottom: 10,
    marginTop: 5,
    color: '#FF6F61',
  },
  header: {
    backgroundColor: '#FF6F61',
    width: '100%',
    paddingVertical: 60,
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  input: {
    width: '80%',
    marginVertical: 8,
    backgroundColor: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    width: '80%',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  itemNameInput: {
    flex: 3,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  quantityInput: {
    flex: 1,
    marginRight: 8,
    backgroundColor: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '70%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  pickerContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
    height: 150,
    overflow: 'hidden',
  },
  pickerItemText: {
    fontSize: 24,
    color: '#333',
  },
  selectedItemText: {
    color: '#FF6F61',
    fontWeight: 'bold',
  },
  doneButton: {
    width: '50%',
    backgroundColor: '#FF6F61',
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: '#FF6F61',
    borderRadius: 4,
    margin: 0,
  },
  errorText: {
    width: '80%',
    marginTop: -5,
  },
  list: {
    width: '80%',
  },
  listContent: {
    alignItems: 'center',
  },
  button: {
    width: '100%',
    marginVertical: 15,
    paddingVertical: 5,
    marginBottom: 65,
    justifyContent: 'center',
    backgroundColor: '#FF6F61',
    borderRadius: 8,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    width: '100%',
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#FFF0EF',
    margin: 0,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f7d9d7',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
  itemText: {
    fontSize: 16,
    flex: 3,
  },
  quantityText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    flex: 1,
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});

export default CreateListScreen;

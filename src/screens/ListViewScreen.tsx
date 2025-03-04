import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Modal } from 'react-native';
import { IconButton, Button, TextInput, Checkbox } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { supabase } from '../../supabaseClient'; // Adjust the path as necessary

type ListViewScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ListView'>;
type ListViewScreenRouteProp = RouteProp<RootStackParamList, 'ListView'>;

const ListViewScreen = () => {
  const navigation = useNavigation<ListViewScreenNavigationProp>();
  const route = useRoute<ListViewScreenRouteProp>();
  const { listId, listName } = route.params || { listId: null, listName: 'Default List' };
  const [items, setItems] = useState<string[]>([]);
  const [checkedItems, setCheckedItems] = useState<boolean[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // Track authentication status
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState({ index: -1, text: '' });

  // Check user authentication status when component mounts
  useEffect(() => {
    const checkAuthStatus = async () => {
      const { data: userResponse, error: userError } = await supabase.auth.getUser();
      setIsLoggedIn(!userError && userResponse?.user ? true : false);
    };
    
    checkAuthStatus();
  }, []);

  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('items') // Assuming you have an 'items' table
        .select('name')
        .eq('list_id', listId);

      if (error) {
        console.error(error);
      } else {
        const itemNames = data.map((item: { name: string }) => item.name);
        setItems(itemNames);
        setCheckedItems(new Array(itemNames.length).fill(false));
      }
    };

    if (listId) {
      fetchItems();
    }
  }, [listId]);

  const editItem = (index: number) => {
    setEditingItem({ index, text: items[index] });
    setEditModalVisible(true);
  };

  const saveEditedItem = async () => {
    if (editingItem.text.trim() && editingItem.index !== -1) {
      // Update the item in the database
      const { data, error } = await supabase
        .from('items')
        .update({ name: editingItem.text.trim() })
        .eq('list_id', listId)
        .eq('name', items[editingItem.index])
        .select();

      if (error) {
        console.error('Error updating item:', error);
        return;
      }

      // Update the local state
      const updatedItems = [...items];
      updatedItems[editingItem.index] = editingItem.text.trim();
      setItems(updatedItems);
      setEditModalVisible(false);
      setEditingItem({ index: -1, text: '' });
    }
  };

  const toggleItemCheck = (index: number) => {
    const newCheckedItems = [...checkedItems];
    newCheckedItems[index] = !newCheckedItems[index];
    setCheckedItems(newCheckedItems);
  };

  const deleteItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
    setCheckedItems(checkedItems.filter((_, i) => i !== index));
  };

  const addItem = async () => {
    if (newItem.trim() && !isAdding) {
      setIsAdding(true);
      // Insert the new item into the database
      const { data, error } = await supabase
        .from('items')
        .insert([{ name: newItem.trim(), list_id: listId }])
        .select();

      if (error) {
        console.error('Error adding item:', error);
        setIsAdding(false);
        return;
      }

      // Update the local state with the new item
      setItems([...items, newItem.trim()]);
      setCheckedItems([...checkedItems, false]);
      setNewItem('');
      setModalVisible(false);
      setIsAdding(false);
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
                status={checkedItems[index] ? 'checked' : 'unchecked'}
                onPress={() => toggleItemCheck(index)}
                color="#FF6F61"
              />
              <Text style={[styles.itemText, checkedItems[index] && styles.checkedItemText]}>{item}</Text>
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
                  // Handle view shops logic
                }}
                style={styles.viewShopsButton}
              >
                View Shops
              </Button>
            </View>
          </View>
        )}
        keyExtractor={(item, index) => index.toString()}
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
            onPress={() => {
              // Handle view parking location logic
            }}
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
            <Button mode="contained" onPress={addItem} style={styles.modalButton}>
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
            <Button mode="contained" onPress={saveEditedItem} style={styles.modalButton}>
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
  itemText: {
    fontSize: 16,
    marginLeft: 10,
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
});

export default ListViewScreen;

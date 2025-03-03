import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Modal } from 'react-native';
import { IconButton, Button, TextInput } from 'react-native-paper';
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
  const [modalVisible, setModalVisible] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('items') // Assuming you have an 'items' table
        .select('name')
        .eq('list_id', listId);

      if (error) {
        console.error(error);
      } else {
        setItems(data.map((item: { name: string }) => item.name));
      }
    };

    if (listId) {
      fetchItems();
    }
  }, [listId]);

  const editItem = (index: number) => {
    // Handle edit logic
  };

  const deleteItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
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
      <Text style={styles.loginPrompt}>Login to enable all features</Text>
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
            <Text style={styles.itemText}>{item}</Text>
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
        <Button
          mode="contained"
          style={styles.loginButton}
          onPress={() => navigation.navigate('Login')}
        >
          Login
        </Button>
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
  itemText: {
    fontSize: 16,
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
});

export default ListViewScreen;

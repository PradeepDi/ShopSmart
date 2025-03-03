import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Alert } from 'react-native';
import { TextInput, Button, IconButton } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { supabase } from '../../supabaseClient';

type CreateListScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateList'>;

const CreateListScreen = () => {
  const navigation = useNavigation<CreateListScreenNavigationProp>();
  const [listName, setListName] = useState('');
  const [items, setItems] = useState<string[]>([]);
  const [itemName, setItemName] = useState('');
  const [isCreating, setIsCreating] = useState(false); // Guard to prevent duplicate submissions

  const addItem = () => {
    if (itemName.trim()) {
      setItems([...items, itemName]);
      setItemName('');
    }
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const createList = async () => {
    // Prevent duplicate submissions
    if (isCreating) return;
    setIsCreating(true);

    const { data: userResponse, error: userError } = await supabase.auth.getUser();

    if (userError || !userResponse?.user) {
      Alert.alert('Error', 'Unable to retrieve user information.');
      setIsCreating(false);
      return;
    }

    const user = userResponse.user;

    if (!listName.trim() || items.length === 0) {
      Alert.alert('Incomplete Input', 'Please enter a list name and add at least one item.');
      setIsCreating(false);
      return;
    }

    // Save the list to the database with the user ID
    const { data: listData, error: listError } = await supabase
      .from('lists')
      .insert([{ name: listName, user_id: user.id }])
      .select();

    if (listError || !listData) {
      console.error('Insert Error:', listError);
      Alert.alert('Error', listError?.message || 'An unknown error occurred.');
      setIsCreating(false);
      return;
    }

    const listId = listData[0].id;

    // Save items to the database with the list ID
    const itemInserts = items.map(item => ({ name: item, list_id: listId }));
    const { error: itemsError } = await supabase
      .from('items')
      .insert(itemInserts);

    if (itemsError) {
      console.error('Items Insert Error:', itemsError);
      Alert.alert('Error', itemsError.message || 'An unknown error occurred.');
    } else {
      navigation.navigate('Dashboard');
    }
    setIsCreating(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Create List</Text>
      </View>
      <View style={styles.content}>
        <TextInput
          label="List Name"
          mode="outlined"
          value={listName}
          onChangeText={setListName}
          style={styles.input}
        />
        <TextInput
          label="Add Item"
          mode="outlined"
          value={itemName}
          onChangeText={setItemName}
          style={styles.input}
          right={<TextInput.Icon icon="plus" onPress={addItem} />}
        />
        <FlatList
          data={items}
          renderItem={({ item, index }) => (
            <View style={styles.itemContainer}>
              <Text style={styles.itemText}>{item}</Text>
              <IconButton
                icon="delete"
                size={20}
                onPress={() => removeItem(index)}
              />
            </View>
          )}
          keyExtractor={(item, index) => index.toString()}
          style={styles.list}
          contentContainerStyle={styles.listContent}
        />
        <Button
          mode="contained"
          style={styles.button}
          onPress={createList}
          disabled={isCreating} // Optionally disable the button while processing
        >
          Create List
        </Button>
      </View>
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
  content: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  input: {
    width: '80%',
    marginVertical: 10,
  },
  list: {
    width: '80%',
  },
  listContent: {
    alignItems: 'center',
  },
  button: {
    marginTop: 20,
    backgroundColor: '#FF6F61',
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
  itemText: {
    fontSize: 16,
  },
});

export default CreateListScreen;

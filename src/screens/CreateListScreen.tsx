import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, Alert, ActivityIndicator } from 'react-native';
import { TextInput, Button, IconButton, Chip } from 'react-native-paper';
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
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null); // null means loading state

  const addItem = () => {
    if (itemName.trim()) {
      setItems([...items, itemName]);
      setItemName('');
    }
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
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

    // Save items to the database with the list ID
    const itemInserts = items.map(item => ({ name: item, list_id: listId }));
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
                You're creating a list as a guest. You can still access this list later with the link provided after creation.
              </Text>
            )}
          </View>
        )}
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
          loading={isCreating}
        >
          {isCreating ? 'Creating...' : 'Create List'}
        </Button>
        {!isLoggedIn && (
          <Button
            mode="text"
            onPress={() => navigation.navigate('Login')}
            style={styles.loginButton}
            textColor= "#FF6F61"
          >
            Login to save lists to your account
          </Button>
        )}
      </View>
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
  loginButton: {
    marginTop: 10,
    color: '#FF6F61',
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

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image } from 'react-native';
import { Button, IconButton } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../supabaseClient'; // Adjust the path as necessary
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type DashboardScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Dashboard'>;

const DashboardScreen = () => {
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const [lists, setLists] = useState<{ id: string; name: string }[]>([]);
  const [profileImage, setProfileImage] = useState(require('../../assets/profile.png'));
  const [isProfileImageUrl, setIsProfileImageUrl] = useState(false);

  useEffect(() => {
    fetchLists();
    fetchUserProfile();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchLists();
      fetchUserProfile();
      return () => {};
    }, [])
  );

  const fetchUserProfile = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData?.user) {
        console.error('Error fetching user:', userError);
        return;
      }

      const userId = userData.user.id;

      // Fetch user profile information from the database
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', userId);

      if (error) {
        console.error('Error fetching profile:', error);
      } else if (data && data.length === 1) {
        if (data[0].avatar_url && data[0].avatar_url.trim() !== '') {
          setProfileImage(data[0].avatar_url);
          setIsProfileImageUrl(true);
        } else {
          setProfileImage(require('../../assets/profile.png'));
          setIsProfileImageUrl(false);
        }
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  const fetchLists = async () => {
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error(userError);
      return;
    }

    if (userData?.user) {
      const { data, error } = await supabase
        .from('lists') // Assuming you have a 'lists' table
        .select('id, name')
        .eq('user_id', userData.user.id); // Filter by the current user's ID

      if (error) {
        console.error(error);
      } else {
        setLists(data);
      }
    }
  };

  const deleteList = async (listId: string) => {
    const { error } = await supabase
      .from('lists')
      .delete()
      .eq('id', listId);

    if (error) {
      Alert.alert('Error', error.message || 'An unknown error occurred.');
    } else {
      setLists(lists.filter(list => list.id !== listId));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <TouchableOpacity
          style={styles.profileIconContainer}
          onPress={() => navigation.navigate('Profile')} // Navigate to Profile screen
        >
          <Image
            source={isProfileImageUrl ? { uri: profileImage } : profileImage}
            style={styles.profileIcon}
          />
        </TouchableOpacity>
      </View>
      <FlatList
        data={lists}
        renderItem={({ item }) => (
          <View style={styles.listItem}>
            <TouchableOpacity
              style={styles.listTextContainer}
              onPress={() => navigation.navigate('ListView', { listId: item.id, listName: item.name })}
            >
              <Text style={styles.listText}>{item.name}</Text>
            </TouchableOpacity>
            <IconButton
              icon="delete"
              size={20}
              onPress={() => deleteList(item.id)}
            />
          </View>
        )}
        keyExtractor={(item) => item.id.toString()}
      />
      <View style={styles.buttonContainer}>
        <Button
          mode="contained"
          onPress={() => navigation.navigate('CreateList')}
          style={styles.button}
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
    padding: 16,
    backgroundColor: '#FAF3F3',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileIconContainer: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  profileIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
  },
  listTextContainer: {
    flex: 1,
  },
  listText: {
    fontSize: 18,
  },
  buttonContainer: {
    marginTop: 'auto',
    padding: 16,
  },
  button: {
    backgroundColor: '#FF6F61',
  },
});

export default DashboardScreen;
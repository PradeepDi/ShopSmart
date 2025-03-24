import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image } from 'react-native';
import { Button, IconButton, Badge } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../supabaseClient'; 
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

type DashboardScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Dashboard'>;

const DashboardScreen = () => {
  const navigation = useNavigation<DashboardScreenNavigationProp>();
  const [lists, setLists] = useState<{ id: string; name: string; item_count?: number }[]>([]);
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
      // First get the lists
      const { data: listsData, error: listsError } = await supabase
        .from('lists')
        .select('id, name')
        .eq('user_id', userData.user.id);

      if (listsError) {
        console.error(listsError);
        return;
      }
      
      // For each list, count the items
      const listsWithCounts = await Promise.all(listsData.map(async (list) => {
        const { count, error: countError } = await supabase
          .from('items')
          .select('id', { count: 'exact', head: true })
          .eq('list_id', list.id);
          
        return {
          ...list,
          item_count: count || 0
        };
      }));
      
      setLists(listsWithCounts);
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
        <Text style={styles.title}>ShopSmart</Text>
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
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => navigation.navigate('ListView', { listId: parseInt(item.id), listName: item.name })}
            activeOpacity={0.7}
          >
            <View style={styles.listItemContent}>
              <View style={styles.listIconContainer}>
                <MaterialCommunityIcons name="format-list-bulleted" size={24} color="#FF6F61" />
              </View>
              <View style={styles.listTextContainer}>
                <Text style={styles.listText}>{item.name}</Text>
                <Text style={styles.listItemCount}>{item.item_count || 0} items</Text>
              </View>
              <View style={styles.listActions}>
                <IconButton
                  icon="delete"
                  iconColor="#FF6F61"
                  size={20}
                  onPress={(e) => {
                    e.stopPropagation();
                    deleteList(item.id);
                  }}
                  style={styles.deleteButton}
                />
              </View>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
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
    backgroundColor: '#FAF3F3',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FF6F61',
    width: '100%',
    paddingVertical: 60,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileIconContainer: {
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileIcon: {
    width: 50,
    height: 50,
    borderRadius: 50,
  },
  listContent: {
    padding: 12,
    paddingBottom: 80, // Add extra padding at the bottom for better scrolling experience
  },
  listItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  listIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0EF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  listText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  listItemCount: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  listActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    margin: 0,
    backgroundColor: '#FFF0EF',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#FAF3F3',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  button: {
    backgroundColor: '#FF6F61',
    borderRadius: 8,
    paddingVertical: 4,
    width: '100%',
    alignSelf: 'center',
    marginBottom: 18,
  },
});

export default DashboardScreen;
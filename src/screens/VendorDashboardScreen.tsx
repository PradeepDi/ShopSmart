import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Image } from 'react-native';
import { Button, FAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { supabase } from '../../supabaseClient';
import { useCallback } from 'react';
import { RootStackParamList } from '../navigation/AppNavigator';
import BottomNavBar from '../components/BottomNavBar';

interface Store {
  id: string;
  name: string;
  address: string;
  contact: string;
  map_link: string;
  latitude?: number;
  longitude?: number;
}

type VendorDashboardScreenNavigationProp = StackNavigationProp<RootStackParamList, 'VendorDashboard'>;

export const VendorDashboardScreen = () => {
  const navigation = useNavigation<VendorDashboardScreenNavigationProp>();
  const [stores, setStores] = useState<Store[]>([]);
  const [profileImage, setProfileImage] = useState(require('../../assets/profile.png'));
  const [isProfileImageUrl, setIsProfileImageUrl] = useState(false);

  useEffect(() => {
    fetchStores();
    fetchUserProfile();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStores();
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

  const fetchStores = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data: storeData, error } = await supabase
        .from('shops')
        .select('*')
        .eq('vendor_id', userData.user?.id);

      if (error) throw error;
      setStores(storeData || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const handleAddStore = () => {
    navigation.navigate('StoreCreation');
  };

  const handleStorePress = (store: Store) => {
    navigation.navigate('StoreManagement', { storeId: store.id });
  };

  const handleEditStore = (store: Store, event: any) => {
    // Prevent the card's onPress from triggering
    event.stopPropagation();
    
    // Navigate to the edit screen with store details
    navigation.navigate('StoreEdit', { 
      storeId: store.id,
      storeName: store.name,
      storeAddress: store.address,
      storeContact: store.contact,
      storeCoordinates: store.latitude && store.longitude ? `${store.latitude}, ${store.longitude}` : ''
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ShopSmart Vendor</Text>
        <TouchableOpacity
          style={styles.profileIconContainer}
          onPress={() => navigation.navigate('Profile')}
        >
          <Image
            source={isProfileImageUrl ? { uri: profileImage } : profileImage}
            style={styles.profileIcon}
          />
        </TouchableOpacity>
      </View>
      {stores.length > 0 ? (
        <ScrollView style={styles.storeList} contentContainerStyle={{ paddingBottom: 80 }}>
          {stores.map((store) => (
            <TouchableOpacity
              key={store.id}
              style={styles.storeCard}
              onPress={() => handleStorePress(store)}
              activeOpacity={0.7}
            >
              <View style={styles.storeItemContent}>
                <View style={styles.storeIconContainer}>
                  <MaterialCommunityIcons name="store" size={24} color="#FF6F61" />
                </View>
                <View style={styles.storeTextContainer}>
                  <Text style={styles.storeText}>{store.name}</Text>
                  <Text style={styles.storeAddress}>{store.address}</Text>
                  <Text style={styles.storeContact}>Contact: {store.contact}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.editIconContainer}
                  onPress={(event) => handleEditStore(store, event)}
                >
                  <MaterialCommunityIcons name="pencil" size={24} color="#FF6F61" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <Image 
            source={require('../../assets/shop-icon.png')} 
            style={styles.emptyImage} 
            resizeMode="contain"
          />
          <Text style={styles.emptyText}>No stores yet</Text>
          <Text style={styles.emptySubText}>Add store to get started</Text>
        </View>
      )}
      <FAB
        style={styles.fab}
        color='white'
        icon="plus"
        label="Add Store"
        onPress={handleAddStore}
      />
      <View style={styles.bottomNavContainer}>
        <BottomNavBar currentScreen="VendorDashboard" />
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
  storeList: {
    flex: 1,
    padding: 12,
  },
  storeCard: {
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
  storeItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  storeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0EF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  storeTextContainer: {
    flex: 1,
    paddingRight: 8,
  },
  storeText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  storeAddress: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
    marginBottom: 2,
  },
  storeContact: {
    fontSize: 14,
    color: '#666',
    fontWeight: '400',
  },
  editIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0EF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    marginBottom: 85,
    right: 10,
    bottom: 10,
    backgroundColor: '#FF6F61',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
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
    marginTop: -40, // Adjust to center content better with header
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
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image } from 'react-native';
import { Button, Card, Divider, Chip, Searchbar } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { supabase } from '../../supabaseClient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

type PickItemScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PickItem'>;
type PickItemScreenRouteProp = RouteProp<RootStackParamList, 'PickItem'>;

// Define interfaces for the data structure
interface ShopItem {
  id: string;
  name: string;
  price: number;
  stock_status: boolean;
  description?: string;
  image_url?: string;
  store_id: string;
  store_name?: string;
  store_location?: string;
  store_latitude?: number;
  store_longitude?: number;
  distance?: number;
  distanceLoading?: boolean;
}

const PickItemScreen = () => {
  const navigation = useNavigation<PickItemScreenNavigationProp>();
  const route = useRoute<PickItemScreenRouteProp>();
  const { itemName } = route.params;
  
  const [items, setItems] = useState<ShopItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ShopItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const locationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const distanceCache = useRef<Map<string, number | null>>(new Map());

  useEffect(() => {
    // Start fetching items immediately without waiting for location
    fetchItemsFromShops();
    
    // Get location permission and location in parallel
    (async () => {
      await getLocationPermission();
    })();
    
    // Cleanup function to clear any pending timeouts
    return () => {
      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current);
      }
    };
  }, []);
  
  // Filter items when search query changes or items are updated
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredItems(items);
    } else {
      const query = searchQuery.toLowerCase().trim();
      const filtered = items.filter(item => 
        item.name.toLowerCase().includes(query) || 
        (item.store_name && item.store_name.toLowerCase().includes(query))
      );
      setFilteredItems(filtered);
    }
  }, [searchQuery, items]);
  
  // Add a separate useEffect to update distances when userLocation is set
  useEffect(() => {
    if (userLocation && items.length > 0) {
      updateItemDistances();
    }
  }, [userLocation, items.length]);
  
  const getLocationPermission = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        console.log('Location permission denied');
        setLocationPermission(false);
        setLocationLoading(false);
        return;
      }
      
      setLocationPermission(true);
      await getCurrentLocation();
    } catch (error) {
      console.error('Error requesting location permission:', error);
      setLocationPermission(false);
      setLocationLoading(false);
    }
  };
  
  const getCurrentLocation = async () => {
    try {
      // Set a timeout to prevent hanging on location requests
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High, // Use higher accuracy
        mayShowUserSettingsDialog: true, // Prompt user to enable better accuracy if needed
      });
      
      // Create a timeout promise
      const timeoutPromise = new Promise<null>((_, reject) => {
        locationTimeoutRef.current = setTimeout(() => {
          reject(new Error('Location request timed out'));
        }, 10000); // 10 second timeout
      });
      
      // Race between location request and timeout
      const location = await Promise.race([locationPromise, timeoutPromise]);
      
      // Clear the timeout if location was fetched successfully
      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current);
        locationTimeoutRef.current = null;
      }
      
      if (location) {
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    } catch (error) {
      console.error('Error getting current location:', error);
    } finally {
      setLocationLoading(false);
    }
  };
  
  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2); 
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    const distance = R * c; // Distance in km
    return distance;
  };
  
  const deg2rad = (deg: number) => {
    return deg * (Math.PI/180);
  };
  
  // Format distance to be user-friendly (show in km or m)
  const formatDistance = (distance: number | null, isLoading: boolean = false) => {
    if (isLoading) return 'Calculating...';
    if (distance === null) return 'Unknown';
    
    if (distance < 0.1) {
      // If less than 100m, show in meters
      return `${Math.round(distance * 1000)}m`;
    } else if (distance < 1) {
      // If less than 1km, show in meters
      return `${Math.round(distance * 1000)}m`;
    } else {
      // Otherwise show in kilometers with one decimal
      return `${distance.toFixed(1)}km`;
    }
  };
  
  // Update distances for all items when user location changes
  const updateItemDistances = () => {
    if (!userLocation) return;
    
    setItems(currentItems => {
      return currentItems.map(item => {
        // Skip if store doesn't have coordinates
        if (!item.store_latitude || !item.store_longitude) {
          return { ...item, distance: null, distanceLoading: false };
        }
        
        // Create a cache key for this location pair
        const cacheKey = `${userLocation.latitude},${userLocation.longitude}-${item.store_latitude},${item.store_longitude}`;
        
        // Check if we have a cached distance
        if (distanceCache.current.has(cacheKey)) {
          return { 
            ...item, 
            distance: distanceCache.current.get(cacheKey) || null,
            distanceLoading: false 
          };
        }
        
        // Calculate distance
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          item.store_latitude,
          item.store_longitude
        );
        
        // Cache the result
        distanceCache.current.set(cacheKey, distance);
        
        return { ...item, distance, distanceLoading: false };
      });
    });
  };

  const fetchItemsFromShops = async () => {
    try {
      setLoading(true);
      setError(null);
  
      // Query inventory items that match the item name
      const { data: inventoryItems, error: inventoryError } = await supabase
        .from('inventory_items')
        .select(`
          id,
          name,
          price,
          stock_status,
          description,
          image_url,
          shop_id,
          shops(id, name, address, latitude, longitude)
        `)
        .ilike('name', `%${itemName}%`);
  
      if (inventoryError) {
        throw inventoryError;
      }
  
      if (inventoryItems && inventoryItems.length > 0) {
        // Transform the data to include store information
        const formattedItems = inventoryItems.map((item: any) => {
          // Set initial distance loading state
          const needsDistanceCalculation = 
            item.shops && 
            typeof item.shops === 'object' && 
            item.shops.latitude && 
            item.shops.longitude;
          
          // Calculate distance if user location is already available
          let distance = null;
          let distanceLoading = false;
          
          if (userLocation && needsDistanceCalculation) {
            // Create a cache key for this location pair
            const cacheKey = `${userLocation.latitude},${userLocation.longitude}-${item.shops.latitude},${item.shops.longitude}`;
            
            // Check if we have a cached distance
            if (distanceCache.current.has(cacheKey)) {
              distance = distanceCache.current.get(cacheKey);
              distanceLoading = false;
            } else {
              // Calculate distance
              distance = calculateDistance(
                userLocation.latitude, 
                userLocation.longitude, // Complete the line here
                item.shops.latitude,
                item.shops.longitude
              );
            }
          }
  
          return {
            ...item,
            store_name: item.shops.name,
            store_location: item.shops.address,
            store_latitude: item.shops.latitude,
            store_longitude: item.shops.longitude,
            distance,
            distanceLoading
          };
        });
  
        setItems(formattedItems);
        setFilteredItems(formattedItems);
      } else {
        // No items found
        setItems([]);
        setFilteredItems([]);
      }
    } catch (err) {
      console.error('Error fetching items:', err);
      setError('Failed to load items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const pickItem = async (item: ShopItem) => {
    try {
      // Get the list ID from route params if available, otherwise use a default list
      const { listId, itemName } = route.params as any || { listId: null, itemName: null };
      
      if (!listId) {
        console.error('No list ID provided');
        // You could navigate to list selection screen or create a new list here
        return;
      }
      
      // Format the distance for storage if available
      const formattedDistance = item.distance !== null && item.distance !== undefined 
        ? item.distance 
        : null;
      
      // First check if this item already exists in the list
      const { data: existingItems, error: queryError } = await supabase
        .from('items')
        .select('id, name, quantity')
        .eq('list_id', listId)
        .eq('name', itemName);
      
      if (queryError) {
        console.error('Error checking for existing item:', queryError);
        return;
      }
      
      let resultData;
      
      if (existingItems && existingItems.length > 0) {
        // Item already exists, update it with the new store information
        const existingItem = existingItems[0];
        
        const { data, error } = await supabase
          .from('items')
          .update({ 
            name: item.name, // Update with the specific product name from the shop
            store_name: item.store_name,
            price: item.price,
            distance: formattedDistance
          })
          .eq('id', existingItem.id)
          .select();
        
        if (error) {
          console.error('Error updating item in list:', error);
          return;
        }
        
        resultData = data;
      } else {
        // Item doesn't exist, add it as a new item
        const { data, error } = await supabase
          .from('items')
          .insert([{ 
            name: item.name, 
            list_id: listId,
            quantity: 1, // Default quantity
            store_name: item.store_name,
            price: item.price,
            distance: formattedDistance
          }])
          .select();
        
        if (error) {
          console.error('Error adding item to list:', error);
          return;
        }
        
        resultData = data;
      }
      
      // Navigate back to the ListView screen
      navigation.navigate('ListView', { 
        listId: listId,
        listName: route.params.listName || 'My List'
      });
      
    } catch (err) {
      console.error('Error in pickItem:', err);
    }
  };
  
  const viewItemDetails = (item: ShopItem) => {
    navigation.navigate('ViewItem', {
      item: {
        id: item.id,
        item_name: item.name,
        price: item.price,
        stock_status: item.stock_status,
        description: item.description,
        image_url: item.image_url
      },
      fromPickItem: true
    });
  };

  const renderItem = ({ item }: { item: ShopItem }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.price}>Rs. {item.price.toFixed(2)}</Text>
          </View>
          <View style={styles.imageContainer}>
            {item.image_url ? (
              <Image 
                source={{ uri: item.image_url }} 
                style={styles.itemImage}
                resizeMode="cover"
              />
            ) : (
              <Image 
                source={require('../../assets/product-default.png')} 
                style={styles.itemImage} 
                resizeMode="cover"
              />
            )}
          </View>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.storeInfo}>
          <View style={styles.storeNameContainer}>
            <Text style={styles.storeName}>Store: {item.store_name || 'Unknown'}</Text>
            <View style={styles.distanceBadge}>
              <Text style={styles.distanceText}>
                <MaterialCommunityIcons name="map-marker-distance" size={14} color="#fff" />
                {' '}{formatDistance(item.distance, item.distanceLoading)}
                {item.distanceLoading && (
                  <ActivityIndicator size="small" color="#fff" style={{marginLeft: 4}} />
                )}
              </Text>
            </View>
          </View>
          <Text style={styles.storeLocation}>Location: {item.store_location || 'Not specified'}</Text>
        </View>
        
        <View style={styles.stockContainer}>
          <Chip 
            icon={item.stock_status ? "check-circle" : "alert-circle"}
            style={[styles.stockChip, item.stock_status ? styles.inStock : styles.outOfStock]}
          >
            {item.stock_status ? 'In Stock' : 'Out of Stock'}
          </Chip>
        </View>
      </Card.Content>
      <Card.Actions style={styles.cardActions}>
        <View style={styles.buttonContainer}>
          <Button 
            mode="outlined" 
            onPress={() => {
              // Navigate to ViewLocation with store details
              // The ViewLocationScreen will automatically display this store
              // without requiring the user to click the Search Store button
              navigation.navigate('ViewLocation', {
                storeName: item.store_name,
                storeLatitude: item.store_latitude,
                storeLongitude: item.store_longitude
              });
            }} 
            style={styles.actionButton}
            labelStyle={styles.buttonLabel}
            icon={({size, color}) => (
              <MaterialCommunityIcons name="map-marker" size={size} color={color} style={{marginRight: 20}} />
            )}
          >
            View Location
          </Button>
          <Button 
            mode="outlined" 
            onPress={() => viewItemDetails(item)} 
            style={styles.actionButton}
            labelStyle={styles.buttonLabel}
            icon={({size, color}) => (
              <MaterialCommunityIcons name="information-outline" size={size} color={color} style={{marginRight: 20}} />
            )}
          >
            View Details
          </Button>
          <Button 
            mode="contained" 
            onPress={() => pickItem(item)} 
            style={[styles.actionButton, styles.primaryButton]}
            labelStyle={styles.primaryButtonLabel}
            icon={({size, color}) => (
              <MaterialCommunityIcons name="cart-plus" size={size} color={color} style={{marginRight: 20}} />
            )}
          >
            Pick Item
          </Button>
        </View>
      </Card.Actions>
    </Card>
  );

  const onChangeSearch = (query: string) => {
    setSearchQuery(query);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Available Items: {itemName}</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search items or stores"
          onChangeText={onChangeSearch}
          value={searchQuery}
          style={styles.searchBar}
          iconColor="#FF6F61"
          inputStyle={styles.searchInput}
        />
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6F61" />
          <Text style={styles.loadingText}>Loading items...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button mode="contained" onPress={fetchItemsFromShops} style={styles.retryButton}>
            Retry
          </Button>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No items found matching "{itemName}"</Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
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
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: 0,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FAF3F3',
  },
  searchBar: {
    borderRadius: 8,
    elevation: 2,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    fontSize: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 4,
    borderRadius: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    color: '#FF6F61',
    fontWeight: 'bold',
  },
  imageContainer: {
    position: 'relative',
    width: 60,
    height: 60,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  distanceBadge: {
    backgroundColor: '#FF6F61',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    elevation: 2,
    marginLeft: 8,
  },
  distanceText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 8,
  },
  storeInfo: {
    marginBottom: 8,
  },
  storeNameContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  storeName: {
    fontSize: 14,
    fontWeight: '500',
  },
  storeLocation: {
    fontSize: 14,
    color: '#666',
  },
  stockContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  stockChip: {
    height: 30,
  },
  inStock: {
    backgroundColor: '#E8F5E9',
  },
  outOfStock: {
    backgroundColor: '#FFEBEE',
  },
  cardActions: {
    padding: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
    paddingRight: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6F61',
    height: 40,
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 12,
    marginHorizontal: 0,
    color: '#FF6F61',
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#FF6F61',
    borderColor: '#FF6F61',
  },
  primaryButtonLabel: {
    fontSize: 12,
    marginHorizontal: 0,
    color: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
  },
  marginLeft: 'auto',
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#B00020',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FF6F61',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default PickItemScreen;
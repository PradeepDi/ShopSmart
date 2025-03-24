import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Platform, TextInput } from 'react-native';
import { Button, IconButton } from 'react-native-paper';
import MapView, { Marker, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../supabaseClient';
import { config } from '../config';
import { GOOGLE_MAPS_API_KEY } from '@env';

type ViewLocationScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ViewLocation'>;
type ViewLocationScreenRouteProp = RouteProp<RootStackParamList, 'ViewLocation'>;

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface StoreLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  vicinity?: string;
  rating?: number;
}

interface RouteParams {
  storeName?: string;
  storeLatitude?: number;
  storeLongitude?: number;
}

const ViewLocationScreen = () => {
  const navigation = useNavigation<ViewLocationScreenNavigationProp>();
  const route = useRoute<ViewLocationScreenRouteProp>();
  const { storeName, storeLatitude, storeLongitude } = route.params || {};
  
  const [location, setLocation] = useState<LocationData | null>(null);
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const locationSubscription = useRef<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeLocations, setStoreLocations] = useState<StoreLocation[]>([]);
  const [searchingStores, setSearchingStores] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(storeName || '');
  const [selectedStore, setSelectedStore] = useState<StoreLocation | null>(null);

  useEffect(() => {
    // If store coordinates were passed, prioritize showing store location
    if (storeLatitude && storeLongitude) {
      // Skip getting user location permission if already have store coordinates
      setLoading(false);
      // Set the location directly to the store coordinates
      setLocation({
        latitude: storeLatitude,
        longitude: storeLongitude
      });
    }
    
    // Always get user location permission for distance calculation
    (async () => {
      await getLocationPermission();
    })();
    
    // Cleanup function to remove location subscription
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    // If store coordinates were passed in the route params, use them for search
    if (storeLatitude && storeLongitude) {
      // If have coordinates, will search by location
      searchStoresByCoordinates(storeLatitude, storeLongitude);
      // Also set the store name as search query if available
      if (storeName) {
        setSearchQuery(storeName);
      }
    } else if (storeName) {
      // If only store name was passed, set it as the search query
      setSearchQuery(storeName);
      // Automatically search when a store name is provided
      searchStoresByName();
    }
  }, []);

  const getLocationPermission = async () => {
    setLoading(true);
    setErrorMsg(null);
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        setLoading(false);
        return;
      }
      
      // Get initial location
      await getCurrentLocation();
      
      // Start watching position for real-time updates
      startLocationTracking();
    } catch (error) {
      setErrorMsg('Error requesting location permission');
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      
      const locationData = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      };
      
      // Update user location
      setUserLocation(locationData);
      
      // If don't have store coordinates, also set as main location for map
      if (!storeLatitude || !storeLongitude) {
        setLocation(locationData);
      }
    } catch (error) {
      setErrorMsg('Error getting current location');
    } finally {
      setLoading(false);
    }
  };
  
  // Start continuous location tracking
  const startLocationTracking = async () => {
    try {
      // Remove any existing subscription
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      
      // Start watching position
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          distanceInterval: 10, // Update if user moves more than 10 meters
          timeInterval: 5000,   // Or update every 5 seconds
        },
        (newLocation) => {
          const locationData = {
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            accuracy: newLocation.coords.accuracy,
          };
          
          // Update user location
          setUserLocation(locationData);
          
          // If don't have store coordinates, also update main location for map
          if (!storeLatitude || !storeLongitude) {
            setLocation(locationData);
          }
        }
      );
    } catch (error) {
      console.error('Error watching position:', error);
    }
  };

  const refreshLocation = () => {
    setLoading(true);
    // Get current location and update the map to center on user's location
    getCurrentLocation().then(() => {
      // If have user location, update the main location for the map
      if (userLocation) {
        setLocation(userLocation);
      }
    });
    startLocationTracking();
  };

  // Search for stores using coordinates
  const searchStoresByCoordinates = async (latitude: number, longitude: number) => {
    try {
      setSearchingStores(true);
      setSearchError(null);

      // First try to find a store in the database with these coordinates
      const { data, error } = await supabase
        .from('shops')
        .select('id, name, address, latitude, longitude')
        .eq('latitude', latitude)
        .eq('longitude', longitude)
        .limit(1);

      let storeResult;

      // If found a store with exact coordinates in the database
      if (!error && data && data.length > 0) {
        const store = data[0];
        storeResult = {
          id: store.id,
          name: store.name || searchQuery || 'Store Location',
          latitude: latitude,
          longitude: longitude,
          address: store.address || 'No address available'
        };
      } else {
        // If no exact match, try to find the closest store
        const { data: allStores, error: storesError } = await supabase
          .from('shops')
          .select('id, name, address, latitude, longitude');

        if (!storesError && allStores && allStores.length > 0) {
          // Find the closest store based on coordinates
          let closestStore = null;
          let minDistance = Number.MAX_VALUE;

          for (const store of allStores) {
            if (store.latitude && store.longitude) {
              const distance = calculateDistance(
                latitude, longitude,
                store.latitude, store.longitude
              );

              if (distance < minDistance) {
                minDistance = distance;
                closestStore = store;
              }
            }
          }

          if (closestStore && minDistance < 1) { // Within 1km
            storeResult = {
              id: closestStore.id,
              name: searchQuery || closestStore.name || 'Store Location',
              latitude: latitude,
              longitude: longitude,
              address: closestStore.address || 'No address available'
            };
          } else {
            // No nearby store found
            storeResult = {
              id: 'store-1',
              name: searchQuery || 'Store Location',
              latitude: latitude,
              longitude: longitude,
              address: 'No address available for these coordinates'
            };
          }
        } else {
          // No stores in database or error
          storeResult = {
            id: 'store-1',
            name: searchQuery || 'Store Location',
            latitude: latitude,
            longitude: longitude,
            address: 'No address available for these coordinates'
          };
        }
      }

      // Set the store as the only result and select it
      setStoreLocations([storeResult]);
      setSelectedStore(storeResult);
      
      // Center the map on the provided coordinates
      setLocation({
        latitude: latitude,
        longitude: longitude
      });
    } catch (error) {
      console.error('Error setting store location:', error);
      setSearchError('Failed to set store location');
      setStoreLocations([]);
    } finally {
      setSearchingStores(false);
    }
  };

  // Helper function to calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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
  const formatDistance = (distance: number) => {
    if (distance < 0.1) {
      // If less than 100m, show in meters
      return `${Math.round(distance * 1000)}m`;
    } else if (distance < 1) {
      // If less than 1km, show in meters with one decimal
      return `${Math.round(distance * 1000)}m`;
    } else {
      // Otherwise show in kilometers with one decimal
      return `${distance.toFixed(1)}km`;
    }
  };

  // Search for stores using Google Places API
  const searchStoresByName = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a store name to search');
      return;
    }

    try {
      setSearchingStores(true);
      setSearchError(null);

      // First try to search in the database
      const { data, error } = await supabase
        .from('shops')
        .select('id, name, address, latitude, longitude')
        .ilike('name', `%${searchQuery}%`)
        .limit(1); // Only get the first matching store

      // If have a result from the database, use it
      if (!error && data && data.length > 0) {
        const store = data[0];
        const storeResult = {
          id: store.id,
          name: store.name,
          latitude: store.latitude || 0,
          longitude: store.longitude || 0,
          address: store.address
        };

        setStoreLocations([storeResult]); // Only set the single store
        setSelectedStore(storeResult); // Automatically select it
        
        // Center the map on the store
        if (storeResult.latitude && storeResult.longitude) {
          setLocation({
            latitude: storeResult.latitude,
            longitude: storeResult.longitude
          });
        }
      } else {
        // If no results in database or there was an error, use Google Places API
        const apiKey = GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          throw new Error('Google Maps API key is not configured');
        }

        // Use current location as the center for the search if available
        const locationParam = location ? 
          `location=${location.latitude},${location.longitude}&radius=9000&` : '';

        // Construct the URL for the Google Places API request
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?${locationParam}query=${encodeURIComponent(searchQuery)}&type=store&key=${GOOGLE_MAPS_API_KEY}`;
        
        // Make the API request
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status !== 'OK') {
          console.error(`Places API error: ${data.status}`, data.error_message);
          throw new Error(`Places API error: ${data.status}${data.error_message ? ` - ${data.error_message}` : ''}`);
        }
        
        // Get only the first result from the API
        if (data.results && data.results.length > 0) {
          const place = data.results[0];
          const storeResult = {
            id: place.place_id || 'store-1',
            name: place.name,
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
            address: place.formatted_address,
            vicinity: place.vicinity,
            rating: place.rating
          };
          
          setStoreLocations([storeResult]); // Only set the single store
          setSelectedStore(storeResult); // Automatically select it
          
          // Center the map on the store
          setLocation({
            latitude: storeResult.latitude,
            longitude: storeResult.longitude
          });
        } else {
          setSearchError(`No stores found matching "${searchQuery}"`);
          setStoreLocations([]);
        }
      }
    } catch (error) {
      console.error('Error searching for stores:', error);
      setSearchError('Failed to search for stores');
      setStoreLocations([]);
    } finally {
      setSearchingStores(false);
    }
  };

  const selectStore = (store: StoreLocation) => {
    setSelectedStore(store);
    
    // Center the map on the selected store
    if (store.latitude && store.longitude) {
      setLocation({
        latitude: store.latitude,
        longitude: store.longitude
      });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{storeName ? `${storeName} Location` : 'Shop Search'}</Text>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6F61" />
          <Text style={styles.loadingText}>Getting your location...</Text>
        </View>
      ) : errorMsg ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <Button 
            mode="contained" 
            onPress={getLocationPermission} 
            style={styles.retryButton}
          >
            Retry
          </Button>
        </View>
      ) : (
        <View style={styles.mapContainer}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a store..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <IconButton
              icon="magnify"
              size={24}
              onPress={searchStoresByName}
              disabled={searchingStores}
            />
          </View>
          
          {location && (
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              region={{
                latitude: location.latitude,
                longitude: location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              customMapStyle={[
                {
                  "featureType": "poi.business",
                  "stylers": [
                    {
                      "visibility": "on"
                    }
                  ]
                },
                {
                  "featureType": "poi.park",
                  "elementType": "labels.text",
                  "stylers": [
                    {
                      "visibility": "on"
                    }
                  ]
                }
              ]}
              showsUserLocation={true}
              showsMyLocationButton={true}
              showsCompass={true}
              showsTraffic={true}
            >
              {/* User's current location marker */}
              <Marker
                coordinate={{
                  latitude: location.latitude,
                  longitude: location.longitude,
                }}
                title="Your Location"
                description="You are here"
                pinColor="blue"
              />
              
              {/* Store location markers */}
              {storeLocations.map((store) => (
                <Marker
                  key={store.id}
                  coordinate={{
                    latitude: store.latitude,
                    longitude: store.longitude,
                  }}
                  title={store.name}
                  description={store.address || store.vicinity}
                  onPress={() => selectStore(store)}
                >
                  <MaterialCommunityIcons name="store" size={30} color="#FF6F61" />
                  <Callout tooltip>
                    <View style={styles.calloutContainer}>
                      <Text style={styles.calloutTitle}>{store.name}</Text>
                      {store.address && (
                        <Text style={styles.calloutText}>{store.address}</Text>
                      )}
                      {!store.address && store.vicinity && (
                        <Text style={styles.calloutText}>{store.vicinity}</Text>
                      )}
                      {store.rating && (
                        <Text style={styles.calloutText}>Rating: {store.rating} ⭐</Text>
                      )}
                    </View>
                  </Callout>
                </Marker>
              ))}
            </MapView>
          )}
          
          {selectedStore && (
            <View style={styles.infoContainer}>
              <Text style={styles.storeTitle}>{selectedStore.name}</Text>
              {selectedStore.address && (
                <Text style={styles.infoText}>Address: {selectedStore.address}</Text>
              )}
              {!selectedStore.address && selectedStore.vicinity && (
                <Text style={styles.infoText}>Vicinity: {selectedStore.vicinity}</Text>
              )}
              {selectedStore.rating && (
                <Text style={styles.infoText}>Rating: {selectedStore.rating} ⭐</Text>
              )}
              {/* Display distance from current location to store */}
              {userLocation && (
                <Text style={styles.infoText}>
                  Distance: {formatDistance(calculateDistance(
                    userLocation.latitude, 
                    userLocation.longitude, 
                    selectedStore.latitude, 
                    selectedStore.longitude
                  ))}
                </Text>
              )}
            </View>
          )}
          
          {searchingStores && (
            <View style={styles.searchingContainer}>
              <ActivityIndicator size="small" color="#FF6F61" />
              <Text style={styles.searchingText}>Searching for stores...</Text>
            </View>
          )}
          
          {searchError && (
            <Text style={styles.errorText}>{searchError}</Text>
          )}
          
          <Button 
            mode="contained" 
            onPress={() => {
              // If have coordinates from route params, use them for search
              if (storeLatitude && storeLongitude) {
                searchStoresByCoordinates(storeLatitude, storeLongitude);
              } else {
                // Otherwise use the name-based search
                searchStoresByName();
              }
            }} 
            style={styles.searchButton}
            icon="store-search"
            loading={searchingStores}
            disabled={searchingStores || (!searchQuery.trim() && !storeLatitude && !storeLongitude)}
          >
            Search Store
          </Button>
          
          <Button 
            mode="contained" 
            onPress={refreshLocation} 
            style={styles.refreshButton}
            icon={storeLatitude && storeLongitude ? "crosshairs-gps" : "refresh"}
          >
            {storeLatitude && storeLongitude ? "View Current Location" : "Refresh Location"}
          </Button>
        </View>
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
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  mapContainer: {
    flex: 1,
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 16,
  },
  map: {
    width: '100%',
    height: '60%',
    borderRadius: 10,
  },
  infoContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginVertical: 16,
    elevation: 3,
  },
  storeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  infoText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
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
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#B00020',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF6F61',
  },
  refreshButton: {
    backgroundColor: '#FF6F61',
    marginTop: 10,
    borderRadius: 8,
  },
  searchButton: {
    backgroundColor: '#4CAF50',
    marginTop: 10,
    borderRadius: 8,
  },
  searchingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  searchingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  calloutContainer: {
    width: 200,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    elevation: 5,
  },
  calloutTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 5,
  },
  calloutText: {
    fontSize: 14,
    color: '#666',
  },
});

export default ViewLocationScreen;
import React, { useState, useEffect } from 'react';
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
}

const ViewLocationScreen = () => {
  const navigation = useNavigation<ViewLocationScreenNavigationProp>();
  const route = useRoute<ViewLocationScreenRouteProp>();
  const { storeName } = route.params || {};
  
  const [location, setLocation] = useState<LocationData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [storeLocations, setStoreLocations] = useState<StoreLocation[]>([]);
  const [searchingStores, setSearchingStores] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState(storeName || '');
  const [selectedStore, setSelectedStore] = useState<StoreLocation | null>(null);

  useEffect(() => {
    (async () => {
      await getLocationPermission();
    })();
  }, []);

  useEffect(() => {
    // If a store name was passed in the route params, set it as the search query
    if (storeName) {
      setSearchQuery(storeName);
      // Automatically search when a store name is provided
      searchStoresByName();
    }
  }, [storeName]);

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
      
      await getCurrentLocation();
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
      
      setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
      });
    } catch (error) {
      setErrorMsg('Error getting current location');
    } finally {
      setLoading(false);
    }
  };

  const refreshLocation = () => {
    setLoading(true);
    getCurrentLocation();
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
        .ilike('name', `%${searchQuery}%`);

      // If we have results from the database, use them
      if (!error && data && data.length > 0) {
        const storeResults = data.map((store: any) => ({
          id: store.id,
          name: store.name,
          latitude: store.latitude || 0,
          longitude: store.longitude || 0,
          address: store.address
        }));

        setStoreLocations(storeResults);
        setSelectedStore(null);
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
        
        // Transform the API response into our StoreLocation format
        const storeResults = data.results.map((place: any, index: number) => ({
          id: place.place_id || `store-${index}`,
          name: place.name,
          latitude: place.geometry.location.lat,
          longitude: place.geometry.location.lng,
          address: place.formatted_address,
          vicinity: place.vicinity,
          rating: place.rating
        }));
        
        if (storeResults.length === 0) {
          setSearchError(`No stores found matching "${searchQuery}"`);
        } else {
          setStoreLocations(storeResults);
          setSelectedStore(null);
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
        <Text style={styles.title}>Shop Search</Text>
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
              {location && (
                <>
                  <Text style={styles.infoText}>Latitude: {selectedStore.latitude.toFixed(6)}</Text>
                  <Text style={styles.infoText}>Longitude: {selectedStore.longitude.toFixed(6)}</Text>
                </>
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
            onPress={searchStoresByName} 
            style={styles.searchButton}
            icon="store-search"
            loading={searchingStores}
            disabled={searchingStores || !searchQuery.trim()}
          >
            Search Stores
          </Button>
          
          <Button 
            mode="contained" 
            onPress={refreshLocation} 
            style={styles.refreshButton}
            icon="refresh"
          >
            Refresh Location
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
    paddingVertical: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
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
  },
  searchButton: {
    backgroundColor: '#4CAF50',
    marginTop: 10,
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
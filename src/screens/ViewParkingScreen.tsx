import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { Button } from 'react-native-paper';
import MapView, { Marker, PROVIDER_GOOGLE, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { config } from '../config';
import { GOOGLE_MAPS_API_KEY } from '@env';
import BottomNavBar from '../components/BottomNavBar';

type ViewParkingScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ViewParking'>;

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

interface ParkingLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  vicinity?: string;
  rating?: number;
}

const ViewParkingScreen = () => {
  const navigation = useNavigation<ViewParkingScreenNavigationProp>();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [parkingLocations, setParkingLocations] = useState<ParkingLocation[]>([]);
  const [searchingParking, setSearchingParking] = useState(false);
  const [parkingError, setParkingError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      await getLocationPermission();
    })();
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

  const searchParkingLocations = async () => {
    if (!location) {
      Alert.alert('Error', 'Unable to get your current location. Please try refreshing.');
      return;
    }

    setSearchingParking(true);
    setParkingError(null);
    
    try {
      // Use Google Places API to find parking locations
      const apiKey = GOOGLE_MAPS_API_KEY; // Ensure this is correctly set
      if (!apiKey) {
        throw new Error('Google Maps API key is not configured');
      }
      
      // Construct the URL for the Google Places API request
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.latitude},${location.longitude}&radius=9000&type=parking&key=${GOOGLE_MAPS_API_KEY}`;
      
      // Make the API request
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK') {
        console.error(`Places API error: ${data.status}`, data.error_message);
        throw new Error(`Places API error: ${data.status}${data.error_message ? ` - ${data.error_message}` : ''}`);
      }
      
      // Transform the API response into our ParkingLocation format
      const parkingResults = data.results.map((place: any, index: number) => ({
        id: place.place_id || `parking-${index}`,
        name: place.name,
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        vicinity: place.vicinity,
        rating: place.rating
      }));
      
      if (parkingResults.length === 0) {
        setParkingError('No parking locations found nearby');
      } else {
        setParkingLocations(parkingResults);
      }
    } catch (error) {
      console.error('Error searching for parking:', error);
      setParkingError('Failed to search for parking locations');
    } finally {
      setSearchingParking(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Parking Locations</Text>
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
              
              {/* Parking location markers */}
              {parkingLocations.map((parking) => (
                <Marker
                  key={parking.id}
                  coordinate={{
                    latitude: parking.latitude,
                    longitude: parking.longitude,
                  }}
                  title={parking.name}
                  description={parking.vicinity}
                >
                  <MaterialCommunityIcons name="parking" size={30} color="#FF6F61" />
                  <Callout tooltip>
                    <View style={styles.calloutContainer}>
                      <Text style={styles.calloutTitle}>{parking.name}</Text>
                      {parking.vicinity && (
                        <Text style={styles.calloutText}>{parking.vicinity}</Text>
                      )}
                      {parking.rating && (
                        <Text style={styles.calloutText}>Rating: {parking.rating} ⭐</Text>
                      )}
                    </View>
                  </Callout>
                </Marker>
              ))}
            </MapView>
          )}
          

          
          {searchingParking && (
            <View style={styles.searchingContainer}>
              <ActivityIndicator size="small" color="#FF6F61" />
              <Text style={styles.searchingText}>Searching for parking...</Text>
            </View>
          )}
          
          {parkingError && (
            <Text style={styles.errorText}>{parkingError}</Text>
          )}
          
          <View style={styles.buttonContainer}>
            <Button 
              mode="contained" 
              onPress={searchParkingLocations} 
              style={styles.searchButton}
              icon="parking"
              loading={searchingParking}
              disabled={searchingParking || !location}
            >
              Search Parking
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
        </View>
      )}
      <View style={styles.bottomNavContainer}>
        <BottomNavBar currentScreen="ViewParking" />
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
  map: {
    width: '100%',
    height: '85%',
    borderRadius: 10,
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
    borderRadius: 8,
  },
  refreshButton: {
    backgroundColor: '#FF6F61',
    marginTop: 10,
    borderRadius: 8,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 80, // Increased to make room for bottom nav bar
    left: 0,
    right: 0,
    paddingHorizontal: 16,
  },
  searchButton: {
    backgroundColor: '#4CAF50',
    marginBottom: 2,
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
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});

export default ViewParkingScreen;
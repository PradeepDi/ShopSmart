// Configuration file to access environment variables
import Constants from 'expo-constants';

// Import environment variables from Expo's Constants manifest
const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY || 'AIzaSyDJtiDYWhBTnv8YKOdfUmeSjob1e9wyXz8';

// Export configuration variables
export const config = {
  googleMaps: {
    apiKey: GOOGLE_MAPS_API_KEY
  }
};
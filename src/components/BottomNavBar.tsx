import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { supabase } from '../../supabaseClient';

type BottomNavBarProps = {
  currentScreen?: keyof RootStackParamList;
  isLoggedIn?: boolean | null;
};

const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentScreen, isLoggedIn = true }) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const [isVendor, setIsVendor] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      checkUserType();
    }
  }, [isLoggedIn]);

  const checkUserType = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      
      if (userError || !userData?.user) {
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_type')
        .eq('id', userData.user.id)
        .single();

      if (profileData?.user_type === 'Vendor') {
        setIsVendor(true);
      } else {
        setIsVendor(false);
      }
    } catch (error) {
      console.error('Error checking user type:', error);
    }
  };

  const handleHomePress = () => {
    if (isLoggedIn) {
      if (isVendor && currentScreen !== 'VendorDashboard') {
        navigation.navigate('VendorDashboard');
      } else if (!isVendor && currentScreen !== 'Dashboard') {
        navigation.navigate('Dashboard');
      }
    }
  };

  const handleProfilePress = () => {
    if (isLoggedIn && currentScreen !== 'Profile') {
      navigation.navigate('Profile');
    }
  };

  const handleBackPress = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.navButton, !isLoggedIn && styles.disabledButton]} 
        onPress={handleHomePress}
        activeOpacity={isLoggedIn ? 0.7 : 1}
        disabled={!isLoggedIn}
      >
        <MaterialCommunityIcons 
          name="home" 
          size={32} 
          color={currentScreen === 'Dashboard' || currentScreen === 'VendorDashboard' ? '#FF6F61' : !isLoggedIn ? '#ccc' : '#666'} 
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.navButton, !isLoggedIn && styles.disabledButton]} 
        onPress={handleProfilePress}
        activeOpacity={isLoggedIn ? 0.7 : 1}
        disabled={!isLoggedIn}
      >
        <MaterialCommunityIcons 
          name="account" 
          size={32} 
          color={currentScreen === 'Profile' ? '#FF6F61' : !isLoggedIn ? '#ccc' : '#666'} 
        />
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.navButton} 
        onPress={handleBackPress}
        activeOpacity={0.7}
      >
        <MaterialCommunityIcons name="arrow-left" size={32} color="#666" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    height: 70,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingBottom: 10,
    paddingTop: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  disabledButton: {
    opacity: 0.7,
  },
});

export default BottomNavBar;
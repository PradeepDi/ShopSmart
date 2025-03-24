import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent, Alert } from 'react-native';
import { TextInput, Button, Menu, Divider, Provider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { supabase } from '../../supabaseClient';

type SignupScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Signup'>;

const SignupScreen = () => {
  const navigation = useNavigation<SignupScreenNavigationProp>();
  const [userType, setUserType] = useState('Customer');
  const [menuVisible, setMenuVisible] = useState(false);
  const [anchorCoordinates, setAnchorCoordinates] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

  const handleLayout = (event: LayoutChangeEvent) => {
    const { x, y, height } = event.nativeEvent.layout;
    setAnchorCoordinates({ x: x, y: y + height });
  };

  const handleSignup = async () => {
    // Validate that passwords match
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match. Please try again.');
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      Alert.alert('Error', error.message || 'An unknown error occurred.');
    } else if (data?.user) {
      // Create a profile for the new user with the selected user type
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ id: data.user.id, name, email, user_type: userType }]);

      if (profileError) {
        Alert.alert('Error', profileError.message || 'An unknown error occurred while creating profile.');
      } else {
        Alert.alert(
          'Success',
          'Account created successfully!',
          [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
        );
      }
    }
  };

  return (
    <Provider>
      <LinearGradient
        colors={['#FF6F61', '#f5f0e8']}
        style={styles.container}
      >
        <View style={styles.card}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <Icon name="shield" size={30} color="#fff" />
            </View>
          </View>
          
          <Text style={styles.title}>Create an Account</Text>
          <Text style={styles.subtitle}>Please fill in the form to register</Text>
          <TextInput
            placeholder="Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
            mode="outlined"
            outlineColor="#e0e0e0"
            activeOutlineColor="#FF6F61"
          />
          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            mode="outlined"
            outlineColor="#e0e0e0"
            activeOutlineColor="#FF6F61"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            mode="outlined"
            outlineColor="#e0e0e0"
            activeOutlineColor="#FF6F61"
            secureTextEntry={!passwordVisible}
            right={<TextInput.Icon 
              icon={passwordVisible ? "eye-off" : "eye"} 
              onPress={() => setPasswordVisible(!passwordVisible)}
              color="#aaa"
            />}
          />
          <TextInput
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            mode="outlined"
            outlineColor="#e0e0e0"
            activeOutlineColor="#FF6F61"
            secureTextEntry={!confirmPasswordVisible}
            style={styles.input}
            right={<TextInput.Icon 
              icon={confirmPasswordVisible ? "eye-off" : "eye"} 
              onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
              color="#aaa"
            />}
          />
          <View style={styles.input} onLayout={handleLayout}>
            <TouchableOpacity onPress={() => setMenuVisible(true)}>
              <TextInput
                placeholder="User Type"
                mode="outlined"
                value={userType}
                editable={false}
                pointerEvents="none"
                outlineColor="#e0e0e0"
                activeOutlineColor="#4169e1"
                right={<TextInput.Icon icon="menu-down" color="#aaa" />}
              />
            </TouchableOpacity>
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={anchorCoordinates}
            >
              <Menu.Item
                onPress={() => {
                  setUserType('Customer');
                  setMenuVisible(false);
                }}
                title="Customer"
              />
              <Divider />
              <Menu.Item
                onPress={() => {
                  setUserType('Vendor');
                  setMenuVisible(false);
                }}
                title="Vendor"
              />
            </Menu>
          </View>
          <Button 
            mode="contained" 
            style={styles.button}
            onPress={handleSignup}
          >
            Sign Up
          </Button>
          
          <View style={styles.loginContainer}>
            <Text style={styles.footerText}>
              Already have an account?{' '}
              <Text style={styles.loginText} onPress={() => navigation.navigate('Login')}>
                Login
              </Text>
            </Text>
          </View>
        </View>
      </LinearGradient>
    </Provider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    width: '90%',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  logoContainer: {
    marginBottom: 10,
    alignItems: 'center',
  },
  logoBackground: {
    backgroundColor: '#FF6F61',
    width: 50,
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginVertical: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    marginVertical: 8,
    backgroundColor: '#fff',
  },
  button: {
    width: '100%',
    marginVertical: 15,
    paddingVertical: 8,
    justifyContent: 'center',
    backgroundColor: '#FF6F61',
    borderRadius: 5,
  },
  loginContainer: {
    marginTop: 10,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  loginText: {
    color: '#FF6F61',
    fontWeight: 'bold',
  },
});

export default SignupScreen;
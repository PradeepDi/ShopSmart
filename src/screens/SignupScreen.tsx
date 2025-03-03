import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent, Alert } from 'react-native';
import { TextInput, Button, Menu, Divider, Provider } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { supabase } from '../../supabaseClient'; // Adjust the path as necessary

type SignupScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Signup'>;

const SignupScreen = () => {
  const navigation = useNavigation<SignupScreenNavigationProp>();
  const [userType, setUserType] = useState('Customer');
  const [menuVisible, setMenuVisible] = useState(false);
  const [anchorCoordinates, setAnchorCoordinates] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleLayout = (event: LayoutChangeEvent) => {
    const { x, y, height } = event.nativeEvent.layout;
    setAnchorCoordinates({ x: x, y: y + height });
  };

  const handleSignup = async () => {
    const { user, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      Alert.alert('Error', error.message || 'An unknown error occurred.');
    } else if (user) {
      // Create a profile for the new user
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ id: user.id, name, email }]);

      if (profileError) {
        Alert.alert('Error', profileError.message || 'An unknown error occurred while creating profile.');
      } else {
        Alert.alert('Success', 'Account created successfully!');
        navigation.navigate('Login'); // Navigate to the Login screen
      }
    }
  };

  return (
    <Provider>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Sign Up</Text>
        </View>
        <View style={styles.content}>
          <TextInput
            label="Name"
            value={name}
            onChangeText={setName}
            style={styles.input}
          />
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry
          />
          <TextInput
            label="Confirm Password"
            mode="outlined"
            secureTextEntry
            style={styles.input}
          />
          <View style={styles.input} onLayout={handleLayout}>
            <TouchableOpacity onPress={() => setMenuVisible(true)}>
              <TextInput
                label="User Type"
                mode="outlined"
                value={userType}
                editable={false}
                pointerEvents="none"
                right={<TextInput.Icon icon="menu-down" />}
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
          <Text style={styles.footerText}>
            Already have an account?{' '}
            <Text style={styles.loginText} onPress={() => navigation.navigate('Login')}>
              Login
            </Text>
          </Text>
        </View>
      </View>
    </Provider>
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
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  input: {
    width: '80%',
    marginVertical: 10,
  },
  button: {
    width: '80%',
    marginVertical: 10,
    height: '10%',
    justifyContent: 'center',
    backgroundColor: '#FF6F61',
  },
  footerText: {
    marginTop: 20,
    color: '#333',
  },
  loginText: {
    color: '#FF6F61',
    fontWeight: 'bold',
  },
});

export default SignupScreen; 
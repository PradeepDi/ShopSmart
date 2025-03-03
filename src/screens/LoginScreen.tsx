import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { TextInput, Button, Menu, Divider, Provider } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { supabase } from '../../supabaseClient';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [userType, setUserType] = useState('Customer'); // default is Customer
  const [menuVisible, setMenuVisible] = useState(false);
  const [anchorCoordinates, setAnchorCoordinates] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Capture the layout of the wrapper view to position the Menu.
  const handleLayout = (event: LayoutChangeEvent) => {
    const { x, y, height } = event.nativeEvent.layout;
    setAnchorCoordinates({ x: x, y: y + height });
  };

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      alert('Logged in successfully!');
      navigation.navigate('Dashboard');
    }
  };

  return (
    <Provider>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Login</Text>
        </View>
        <View style={styles.content}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
          />
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />

          {/* Wrapper for the User Type dropdown */}
          <View style={styles.input} onLayout={handleLayout}>
            <TouchableOpacity onPress={() => setMenuVisible(true)}>
              <TextInput
                label="User Type"
                mode="outlined"
                value={userType}
                editable={false}
                pointerEvents="none" // Prevent interaction with the TextInput directly
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

          <Button mode="contained" onPress={handleLogin} style={styles.button}>
            Login
          </Button>
          <Text style={styles.footerText}>
            Don't have an account?{' '}
            <Text style={styles.signUpText} onPress={() => navigation.navigate('Signup')}>
              Sign Up
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
  signUpText: {
    color: '#FF6F61',
    fontWeight: 'bold',
  },
});

export default LoginScreen;

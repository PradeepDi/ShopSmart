import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { TextInput, Button, Provider, Checkbox } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { supabase } from '../../supabaseClient';
import { LinearGradient } from 'expo-linear-gradient';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user) {
        // Check if came from a list view screen with an anonymous list
        const route = navigation.getState().routes;
        const currentRoute = route[route.length - 1];
        const previousRoute = route.length > 1 ? route[route.length - 2] : null;
        
        // If came from ListView and have a listId, transfer ownership of that list
        if (previousRoute && previousRoute.name === 'ListView' && previousRoute.params?.listId) {
          const listId = previousRoute.params.listId;
          
          // Update the list to assign it to the logged-in user
          const { error: updateError } = await supabase
            .from('lists')
            .update({ user_id: userData.user.id, is_anonymous: false })
            .eq('id', listId)
            .eq('is_anonymous', true);
          
          if (updateError) {
            console.error('Error transferring list ownership:', updateError);
          }
        }
        
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', userData.user.id)
          .single();

        // Show success alert
        Alert.alert(
          "Login Successful",
          `Welcome to ShopSmart!`,
          [
            { text: "OK", onPress: () => {
              // Navigate after alert is dismissed
              if (profileData?.user_type === 'Vendor') {
                navigation.navigate('VendorDashboard');
              } else {
                navigation.navigate('Dashboard');
              }
            }}
          ]
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
          
          <Text style={styles.title}>Login to your Account</Text>
          <Text style={styles.subtitle}>Enter your email and password to log in</Text>

          <TextInput
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            mode="outlined"
            outlineColor="#e0e0e0"
            activeOutlineColor="#FF6F61"
          />
          
          <View style={styles.passwordContainer}>
            <TextInput
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!passwordVisible}
              style={[styles.input, {marginBottom: 0}]}
              mode="outlined"
              outlineColor="#e0e0e0"
              activeOutlineColor="#FF6F61"
              right={<TextInput.Icon 
                icon={passwordVisible ? "eye-off" : "eye"} 
                onPress={() => setPasswordVisible(!passwordVisible)}
                color="#aaa"
              />}
            />
          </View>
          
          <View style={styles.rememberForgotContainer}>
            <View style={styles.rememberMeContainer}>
              <Checkbox
                status={rememberMe ? 'checked' : 'unchecked'}
                onPress={() => setRememberMe(!rememberMe)}
                color="#FF6F61"
              />
              <Text style={styles.rememberMeText}>Remember me</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotPasswordText}>Forgot Password ?</Text>
            </TouchableOpacity>
          </View>
          
          <Button mode="contained" onPress={handleLogin} style={styles.button}>
            Log In
          </Button>
          
          <View style={styles.signupContainer}>
            <Text style={styles.footerText}>
              Don't have an account?{' '}
              <Text style={styles.signUpText} onPress={() => navigation.navigate('Signup')}>
                Sign Up
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
  passwordContainer: {
    width: '100%',
    marginBottom: 5,
  },
  rememberForgotContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 10,
    alignItems: 'center',
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberMeText: {
    color: '#666',
    fontSize: 14,
  },
  forgotPasswordText: {
    color: '#FF6F61',
    fontSize: 14,
  },
  button: {
    width: '100%',
    marginVertical: 15,
    paddingVertical: 8,
    justifyContent: 'center',
    backgroundColor: '#FF6F61',
    borderRadius: 5,
  },
  signupContainer: {
    marginTop: 10,
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  signUpText: {
    color: '#FF6F61',
    fontWeight: 'bold',
  },
});

export default LoginScreen;

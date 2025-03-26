import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TextInput, Button, Provider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { supabase } from '../../supabaseClient';
import { LinearGradient } from 'expo-linear-gradient';

type ForgotPasswordScreenNavigationProp = StackNavigationProp<RootStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleResetPassword = async () => {
    if (!email.trim()) {
      alert('Please enter your email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://shopsmart.com/reset-password',
      });

      if (error) {
        alert(error.message);
      } else {
        setResetSent(true);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('An error occurred while trying to reset your password. Please try again.');
    } finally {
      setIsSubmitting(false);
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
              <Icon name="lock-reset" size={30} color="#fff" />
            </View>
          </View>
          
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {resetSent 
              ? 'Password reset email sent! Check your inbox for further instructions.'
              : 'Enter your email address to receive a password reset link'}
          </Text>

          {!resetSent ? (
            <>
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
                disabled={isSubmitting}
              />
              
              <Button 
                mode="contained" 
                onPress={handleResetPassword} 
                style={styles.button}
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                Send Reset Link
              </Button>
            </>
          ) : (
            <Button 
              mode="contained" 
              onPress={() => navigation.navigate('Login')} 
              style={styles.button}
            >
              Back to Login
            </Button>
          )}
          
          <View style={styles.loginContainer}>
            <Text style={styles.footerText}>
              Remember your password?{' '}
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

export default ForgotPasswordScreen;
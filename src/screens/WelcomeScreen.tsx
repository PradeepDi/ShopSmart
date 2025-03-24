import React from 'react';
import { View, Text, StyleSheet, Image, Dimensions, Animated } from 'react-native';
import { Button } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';

type WelcomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Welcome'>;

const WelcomeScreen = () => {
  const navigation = useNavigation<WelcomeScreenNavigationProp>();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../../assets/shopping-cart.png')}
          style={styles.logo}
        />
        <Text style={styles.title}>ShopSmart</Text>
        <Text style={styles.subtitle}>Your Smart Shopping Companion</Text>
      </View>
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>        
        <Button
          mode="contained"
          style={styles.button}
          labelStyle={styles.buttonLabel}
          onPress={() => navigation.navigate('CreateList')}
          icon="plus"
        >
          Create List
        </Button>
        <Button
          mode="contained"
          style={styles.button}
          labelStyle={styles.buttonLabel}
          onPress={() => navigation.navigate('Login')}
          icon="arrow-right"
        >
          Login
        </Button>
        <View style={styles.signupContainer}>
          <Text style={styles.footerText}>
            Don't have an account?{' '}
            <Text style={styles.signUpText} onPress={() => navigation.navigate('Signup')}>
              Sign Up
            </Text>
          </Text>
        </View>
      </Animated.View>
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF3F3',
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
    marginBottom: 10,
    tintColor: '#fff',
  },
  header: {
    backgroundColor: '#FF6F61',
    width: '100%',
    paddingVertical: 130,
    alignItems: 'center',
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  button: {
    width: '90%',
    marginVertical: 10,
    paddingVertical: 8,
    justifyContent: 'center',
    backgroundColor: '#FF6F61',
    borderRadius: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  buttonLabel: {
    fontSize: 16,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  signupContainer: {
    marginTop: 15,
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

export default WelcomeScreen;
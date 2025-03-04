import { createStackNavigator } from '@react-navigation/stack';
import WelcomeScreen from '../screens/WelcomeScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import CreateListScreen from '../screens/CreateListScreen';
import ListViewScreen from '../screens/ListViewScreen';
import DashboardScreen from '../screens/DashboardScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { VendorDashboardScreen } from '../screens/VendorDashboardScreen';
import { StoreCreationScreen } from '../screens/StoreCreationScreen';
import { StoreManagementScreen } from '../screens/StoreManagementScreen';
// Import other screens as needed

export type RootStackParamList = {
  Welcome: undefined;
  CreateList: undefined;
  ListView: { listId: number; listName: string };
  Login: undefined;
  Signup: undefined;
  Dashboard: undefined;
  Profile: undefined;
  VendorDashboard: undefined;
  StoreCreation: undefined;
  StoreManagement: { storeId: string };
  // Add other routes here as needed
};

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator = () => (
  <Stack.Navigator initialRouteName="Welcome" id={undefined}>
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="CreateList" component={CreateListScreen} />
    <Stack.Screen name="ListView" component={ListViewScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
    <Stack.Screen name="Dashboard" component={DashboardScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="VendorDashboard" component={VendorDashboardScreen} />
    <Stack.Screen name="StoreCreation" component={StoreCreationScreen} />
    <Stack.Screen name="StoreManagement" component={StoreManagementScreen} />
    {/* Add other screens here */}
  </Stack.Navigator>
);
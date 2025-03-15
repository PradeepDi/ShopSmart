import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image } from 'react-native';
import { Button, Card, Divider, Chip } from 'react-native-paper';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/AppNavigator';
import { supabase } from '../../supabaseClient';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type PickItemScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PickItem'>;
type PickItemScreenRouteProp = RouteProp<RootStackParamList, 'PickItem'>;

// Define interfaces for the data structure
interface ShopItem {
  id: string;
  name: string;
  price: number;
  stock_status: boolean;
  description?: string;
  image_url?: string;
  store_id: string;
  store_name?: string;
  store_location?: string;
}

const PickItemScreen = () => {
  const navigation = useNavigation<PickItemScreenNavigationProp>();
  const route = useRoute<PickItemScreenRouteProp>();
  const { itemName } = route.params;
  
  const [items, setItems] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchItemsFromShops();
  }, []);

  const fetchItemsFromShops = async () => {
    try {
      setLoading(true);
      setError(null);

      // Query inventory items that match the item name
      const { data: inventoryItems, error: inventoryError } = await supabase
        .from('inventory_items')
        .select(`
          id,
          name,
          price,
          stock_status,
          description,
          image_url,
          shop_id,
          shops(name, address)
        `)
        .ilike('name', `%${itemName}%`);

      if (inventoryError) {
        throw inventoryError;
      }

      if (inventoryItems && inventoryItems.length > 0) {
        // Transform the data to include store information
        const formattedItems = inventoryItems.map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          stock_status: item.stock_status,
          description: item.description,
          image_url: item.image_url,
          store_id: item.store_id,
          store_name: item.shops?.name,
          store_location: item.shops?.address
        }));

        setItems(formattedItems);
      } else {
        // No items found
        setItems([]);
      }
    } catch (err) {
      console.error('Error fetching items:', err);
      setError('Failed to load items. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const viewItemDetails = (item: ShopItem) => {
    navigation.navigate('ViewItem', {
      item: {
        id: item.id,
        item_name: item.name,
        price: item.price,
        stock_status: item.stock_status,
        description: item.description,
        image_url: item.image_url
      },
      fromPickItem: true
    });
  };

  const renderItem = ({ item }: { item: ShopItem }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.itemHeader}>
          <View style={styles.itemInfo}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.price}>Rs. {item.price.toFixed(2)}</Text>
          </View>
          {item.image_url ? (
            <Image 
              source={{ uri: item.image_url }} 
              style={styles.itemImage} 
              resizeMode="cover"
            />
          ) : (
            <Image 
              source={require('../../assets/product-default.png')} 
              style={styles.itemImage} 
              resizeMode="cover"
            />
          )}
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>Store: {item.store_name || 'Unknown'}</Text>
          <Text style={styles.storeLocation}>Location: {item.store_location || 'Not specified'}</Text>
        </View>
        
        <View style={styles.stockContainer}>
          <Chip 
            icon={item.stock_status ? "check-circle" : "alert-circle"}
            style={[styles.stockChip, item.stock_status ? styles.inStock : styles.outOfStock]}
          >
            {item.stock_status ? 'In Stock' : 'Out of Stock'}
          </Chip>
        </View>
      </Card.Content>
      <Card.Actions style={styles.cardActions}>
        <Button 
          mode="outlined" 
          onPress={() => navigation.navigate('ViewLocation', {
            storeName: item.store_name
          })} 
          style={styles.locationButton}
          icon="map-marker"
        >
          View Location
        </Button>
        <Button mode="contained" onPress={() => viewItemDetails(item)} style={styles.button}>
          View Details
        </Button>
        <Button 
          mode="outlined" 
          onPress={() => {}} 
          style={styles.pickItemButton}
          icon="cart-plus"
        >
          Pick Item
        </Button>
      </Card.Actions>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Available Items: {itemName}</Text>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6F61" />
          <Text style={styles.loadingText}>Loading items...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button mode="contained" onPress={fetchItemsFromShops} style={styles.retryButton}>
            Retry
          </Button>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No items found matching "{itemName}"</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
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
    paddingVertical: 20,
    alignItems: 'center',
    borderBottomLeftRadius: 100,
    borderBottomRightRadius: 100,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 4,
    borderRadius: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    color: '#FF6F61',
    fontWeight: 'bold',
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  divider: {
    marginVertical: 8,
  },
  storeInfo: {
    marginBottom: 8,
  },
  storeName: {
    fontSize: 14,
    fontWeight: '500',
  },
  storeLocation: {
    fontSize: 14,
    color: '#666',
  },
  stockContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  stockChip: {
    height: 30,
  },
  inStock: {
    backgroundColor: '#E8F5E9',
  },
  outOfStock: {
    backgroundColor: '#FFEBEE',
  },
  button: {
    backgroundColor: '#FF6F61',
    marginLeft: 8,
  },
  cardActions: {
    justifyContent: 'flex-end',
  },
  locationButton: {
    borderColor: '#4CAF50',
    borderWidth: 1,
    marginRight: 8,
  },
  pickItemButton: {
    borderColor: '#FF9800',
    borderWidth: 1,
    marginRight: 8,
  },
  marginLeft: 'auto',
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
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#B00020',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#FF6F61',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default PickItemScreen;
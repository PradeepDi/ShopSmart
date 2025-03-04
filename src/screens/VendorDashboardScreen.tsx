import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Card, Title, Paragraph, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../supabaseClient';

interface Store {
  id: string;
  name: string;
  address: string;
  contact: string;
  map_link: string;
}

export const VendorDashboardScreen = () => {
  const navigation = useNavigation();
  const [stores, setStores] = useState<Store[]>([]);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data: storeData, error } = await supabase
        .from('shops')
        .select('*')
        .eq('vendor_id', userData.user?.id);

      if (error) throw error;
      setStores(storeData || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const handleAddStore = () => {
navigation.navigate('StoreCreation' as never);
  };

  const handleStorePress = (store: Store) => {
navigation.navigate('StoreManagement' as never, { storeId: store.id } as never);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.storeList}>
        {stores.map((store) => (
          <Card
            key={store.id}
            style={styles.storeCard}
            onPress={() => handleStorePress(store)}
          >
            <Card.Content>
              <Title>{store.name}</Title>
              <Paragraph>{store.address}</Paragraph>
              <Paragraph>Contact: {store.contact}</Paragraph>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
      <FAB
        style={styles.fab}
        icon="plus"
        label="Add Store"
        onPress={handleAddStore}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  storeList: {
    flex: 1,
    padding: 16,
  },
  storeCard: {
    marginBottom: 16,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
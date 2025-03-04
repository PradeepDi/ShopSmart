import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Image } from 'react-native';
import { Button, Card, Title, Paragraph, FAB } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../supabaseClient';
import { useCallback } from 'react';

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

  useFocusEffect(
    useCallback(() => {
      fetchStores();
      return () => {};
    }, [])
  );

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
      <View style={styles.header}>
        <Text style={styles.title}>Vendor Dashboard</Text>
        <TouchableOpacity
          style={styles.profileIconContainer}
          onPress={() => navigation.navigate('Profile' as never)}
        >
          <Image
            source={{ uri: 'https://via.placeholder.com/50' }}
            style={styles.profileIcon}
          />
        </TouchableOpacity>
      </View>
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
        color='white'
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
    backgroundColor: '#FAF3F3',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FF6F61',
    width: '100%',
    paddingVertical: 60,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 50,
    borderBottomRightRadius: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileIconContainer: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  profileIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  storeList: {
    flex: 1,
    padding: 16,
  },
  storeCard: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#FF6F61',
  },
});
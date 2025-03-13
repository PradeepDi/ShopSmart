import React from 'react';
import { View, StyleSheet, ScrollView, Text, Image } from 'react-native';
import { Button, Divider, Paragraph } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';

interface RouteParams {
  item: {
    id: string;
    item_name: string;
    price: number;
    stock_status: boolean;
    description?: string;
    image_url?: string;
  };
}

export const ViewItemScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { item } = route.params as RouteParams;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Item Details</Text>
      </View>
      <ScrollView style={styles.contentContainer}>
        <View style={styles.content}>
          <View style={styles.imageContainer}>
            <Image
              source={item.image_url ? { uri: item.image_url } : require('../../assets/product-default.png')}
              style={styles.itemImage}
              resizeMode="cover"
            />
          </View>
          
          <Text style={styles.itemName}>{item.item_name}</Text>
          
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Price:</Text>
            <Text style={styles.priceValue}>Rs. {item.price.toFixed(2)}</Text>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.stockContainer}>
            <Text style={styles.stockLabel}>Stock Status:</Text>
            <Text style={[styles.stockValue, { color: item.stock_status ? '#4CAF50' : '#F44336' }]}>
              {item.stock_status ? 'In Stock' : 'Out of Stock'}
            </Text>
          </View>
          
          <Divider style={styles.divider} />
          
          {item.description ? (
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionLabel}>Description:</Text>
              <Paragraph style={styles.descriptionText}>{item.description}</Paragraph>
            </View>
          ) : (
            <Paragraph style={styles.noDescription}>No description available</Paragraph>
          )}
          
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            textColor="#FF6F61"
          >
            Back to Inventory
          </Button>
        </View>
      </ScrollView>
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
  contentContainer: {
    flex: 1,
  },
  content: {
    padding: 16,
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  itemImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
  },
  itemName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 18,
    marginRight: 8,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6F61',
  },
  divider: {
    width: '100%',
    marginVertical: 16,
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockLabel: {
    fontSize: 18,
    marginRight: 8,
  },
  stockValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  descriptionContainer: {
    width: '100%',
    marginBottom: 24,
  },
  descriptionLabel: {
    fontSize: 18,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  noDescription: {
    fontStyle: 'italic',
    color: '#888',
    marginBottom: 24,
  },
  backButton: {
    marginTop: 16,
    width: '80%',
    borderColor: '#FF6F61',
  },
});

export default ViewItemScreen;
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { supabase } from '@/services/supabase';
import ProductCard from '@/components/product-card';

interface Product {
  id: string;
  title: string;
  description: string;
  image_url: string;
  affiliate_link: string;
  platform: string;
  category: string;
  featured: boolean;
  sort_order: number;
}

const CATEGORIES = ['All', 'Plants', 'Art', 'Experiences', 'Books'];

export default function ShopScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');

  const fetchProducts = async () => {
    try {
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('affiliate_products')
        .select('*')
        .eq('active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setProducts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter(p => p.category === selectedCategory);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Shop</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A7C2E" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shop</Text>
        <Text style={styles.headerSubtitle}>
          Curated gear and wellness products for your nature journey
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScrollView}
          contentContainerStyle={styles.categoryContainer}
        >
          {CATEGORIES.map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.categoryButtonActive
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.categoryButtonText,
                selectedCategory === category && styles.categoryButtonTextActive
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4A7C2E" />}
      >
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {filteredProducts.length === 0 && !error && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products available at the moment.</Text>
            <Text style={styles.emptySubtext}>Check back soon for curated gear and wellness products!</Text>
          </View>
        )}

        {filteredProducts.map(product => (
          <ProductCard
            key={product.id}
            title={product.title}
            description={product.description}
            imageUrl={product.image_url}
            affiliateLink={product.affiliate_link}
            platform={product.platform}
            category={product.category}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8F3',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2D3E1F',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#5A6C4A',
    lineHeight: 20,
    marginBottom: 12,
  },
  categoryScrollView: {
    marginTop: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F8F3',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryButtonActive: {
    backgroundColor: '#4A7C2E',
    borderColor: '#4A7C2E',
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#5A6C4A',
  },
  categoryButtonTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: '#FEE',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCC',
  },
  errorText: {
    color: '#C33',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3E1F',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#5A6C4A',
    textAlign: 'center',
    lineHeight: 20,
  },
});

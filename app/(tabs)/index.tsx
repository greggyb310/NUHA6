import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, MessageCircle, Leaf } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';

const IMAGE_MAP: Record<string, ImageSourcePropType> = {
  'img_1335_medium.jpeg': require('@/assets/images/img_1335_medium.jpeg'),
  'img_3495_medium.jpeg': require('@/assets/images/img_3495_medium.jpeg'),
  'img_6096_large_medium.jpeg': require('@/assets/images/img_6096_large_medium.jpeg'),
  'img_6448_medium.jpeg': require('@/assets/images/img_6448_medium.jpeg'),
  'img_6502_medium.jpeg': require('@/assets/images/img_6502_medium.jpeg'),
  'img_6521_medium.jpeg': require('@/assets/images/img_6521_medium.jpeg'),
  'img_6583_medium.jpeg': require('@/assets/images/img_6583_medium.jpeg'),
  'snail1_medium.jpeg': require('@/assets/images/snail1_medium.jpeg'),
  'star_shaockwaves_medium.jpeg': require('@/assets/images/star_shaockwaves_medium.jpeg'),
  'sunrise_above_the_clouds_donner_lake_medium.jpeg': require('@/assets/images/sunrise_above_the_clouds_donner_lake_medium.jpeg'),
  'natureup_health_logo_-_green_bkgd.jpeg': require('@/assets/images/natureup_health_logo_-_green_bkgd.jpeg'),
};

interface InspirationPhoto {
  id: string;
  image_url: string;
  photographer: string | null;
  alt_text: string | null;
}

interface InspirationQuote {
  id: string;
  quote_text: string;
  author: string | null;
}

export default function HomeScreen() {
  const router = useRouter();
  const [photo, setPhoto] = useState<InspirationPhoto | null>(null);
  const [quote, setQuote] = useState<InspirationQuote | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInspiration();
  }, []);

  const fetchInspiration = async () => {
    try {
      setLoading(true);

      const { data: photos } = await supabase
        .from('inspiration_photos')
        .select('*')
        .eq('active', true);

      const { data: quotes } = await supabase
        .from('inspiration_quotes')
        .select('*')
        .eq('active', true);

      if (photos && photos.length > 0) {
        const randomPhoto = photos[Math.floor(Math.random() * photos.length)];
        setPhoto(randomPhoto);
      }

      if (quotes && quotes.length > 0) {
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        setQuote(randomQuote);
      }
    } catch (error) {
      console.error('Error fetching inspiration:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <Image
              source={require('@/assets/images/natureup_health_logo_-_green_bkgd.jpeg')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.heroTitle}>NatureUp Health</Text>
        </View>

        <Text style={styles.welcomeText}>Partnering with Nature</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4A7C2E" />
          </View>
        ) : (
          <>
            {photo && IMAGE_MAP[photo.image_url] && (
              <View style={styles.photoCard}>
                <Image
                  source={IMAGE_MAP[photo.image_url]}
                  style={styles.photo}
                  resizeMode="cover"
                />
                {photo.photographer && (
                  <Text style={styles.photoCredit}>Photo by {photo.photographer}</Text>
                )}
              </View>
            )}

            {quote && (
              <View style={styles.quoteCard}>
                <Text style={styles.quoteText}>"{quote.quote_text}"</Text>
                {quote.author && (
                  <Text style={styles.quoteAuthor}>— {quote.author}</Text>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F8F3',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3E1F',
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#4A7C2E',
    textAlign: 'center',
    marginHorizontal: 24,
    marginTop: 0,
    marginBottom: 24,
  },
  loadingContainer: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    alignItems: 'center',
  },
  photoCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  photo: {
    width: '100%',
    height: 200,
  },
  photoCredit: {
    fontSize: 10,
    color: '#9CA3AF',
    padding: 8,
    textAlign: 'right',
  },
  quoteCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4A7C2E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  quoteText: {
    fontSize: 15,
    lineHeight: 23,
    color: '#2D3E1F',
    fontStyle: 'italic',
    marginBottom: 10,
  },
  quoteAuthor: {
    fontSize: 13,
    color: '#5A6C4A',
    fontWeight: '600',
    textAlign: 'right',
  },
  featuresSection: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(74, 124, 46, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3E1F',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#5A6C4A',
    lineHeight: 20,
  },
});

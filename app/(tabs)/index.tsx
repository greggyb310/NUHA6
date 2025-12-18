import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ImageBackground, Image, ActivityIndicator, ImageSourcePropType, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { MessageCircle } from 'lucide-react-native';

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

  const backgroundImage = photo && IMAGE_MAP[photo.image_url]
    ? IMAGE_MAP[photo.image_url]
    : require('@/assets/images/img_6096_large_medium.jpeg');

  return (
    <View style={styles.container}>
      <ImageBackground
        source={backgroundImage}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.7)']}
          style={styles.gradient}
        >
          <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <View style={styles.topSection}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('@/assets/images/natureup_health_logo_-_green_bkgd.jpeg')}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.heroTitle}>NatureUp Health</Text>
              <Text style={styles.welcomeText}>Partnering with Nature</Text>
            </View>

            <View style={styles.centerSection}>
              {loading ? (
                <ActivityIndicator size="large" color="#FFFFFF" />
              ) : quote ? (
                <View style={styles.quoteContainer}>
                  <Text style={styles.quoteText}>"{quote.quote_text}"</Text>
                  {quote.author && (
                    <Text style={styles.quoteAuthor}>— {quote.author}</Text>
                  )}
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.createButton}
                onPress={() => router.push('/chat')}
              >
                <MessageCircle size={24} color="#FFFFFF" />
                <Text style={styles.createButtonText}>Create Excursion</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bottomSection}>
              {photo?.photographer && (
                <Text style={styles.photoCredit}>Photo by {photo.photographer}</Text>
              )}
            </View>
          </SafeAreaView>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  topSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingHorizontal: 24,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  centerSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 32,
  },
  quoteContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  quoteText: {
    fontSize: 20,
    lineHeight: 32,
    color: '#FFFFFF',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    fontWeight: '500',
  },
  quoteAuthor: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  bottomSection: {
    paddingBottom: 12,
    paddingHorizontal: 24,
    alignItems: 'flex-end',
  },
  photoCredit: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A7C2E',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ImageBackground, Image, ActivityIndicator, ImageSourcePropType, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Compass } from 'lucide-react-native';

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
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    fetchInspiration();
    fetchUserName();
  }, []);

  const fetchInspiration = async () => {
    try {
      setLoading(true);

      const [photosResult, quotesResult] = await Promise.all([
        supabase.from('inspiration_photos').select('*').eq('active', true),
        supabase.from('inspiration_quotes').select('*').eq('active', true),
      ]);

      const { data: photos } = photosResult;
      const { data: quotes } = quotesResult;

      let newPhoto: InspirationPhoto | null = null;
      let newQuote: InspirationQuote | null = null;

      if (photos && photos.length > 0) {
        newPhoto = photos[Math.floor(Math.random() * photos.length)];
      }

      if (quotes && quotes.length > 0) {
        newQuote = quotes[Math.floor(Math.random() * quotes.length)];
      }

      setPhoto(newPhoto);
      setQuote(newQuote);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching inspiration:', error);
      setLoading(false);
    }
  };

  const fetchUserName = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profile?.full_name) {
          setUserName(profile.full_name.split(' ')[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching user name:', error);
    }
  };

  const handleCreateExcursion = () => {
    router.push('/explore/create');
  };

  const backgroundImage = photo && IMAGE_MAP[photo.image_url]
    ? IMAGE_MAP[photo.image_url]
    : require('@/assets/images/img_6096_large_medium.jpeg');

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <LinearGradient
        colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.6)']}
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
            <Text style={styles.tagline}>Partnering with Nature</Text>
          </View>

          <View style={styles.centerSection}>
            <Text style={styles.welcomeText}>
              {userName ? `Welcome, ${userName}` : 'Welcome'}
            </Text>

            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateExcursion}
              activeOpacity={0.8}
            >
              <Compass size={24} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create Excursion</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSection}>
            {loading ? (
              <ActivityIndicator size="large" color="#FFFFFF" />
            ) : quote ? (
              <View style={styles.quoteContainer}>
                <Text style={styles.quoteText}>"{quote.quote_text}"</Text>
                {quote.author && (
                  <Text style={styles.quoteAuthor}>- {quote.author}</Text>
                )}
              </View>
            ) : null}

            {photo?.photographer && (
              <Text style={styles.photoCredit}>Photo by {photo.photographer}</Text>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
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
  tagline: {
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
  welcomeText: {
    fontSize: 42,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
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
    shadowRadius: 6,
    elevation: 5,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomSection: {
    paddingBottom: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  quoteContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  quoteText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#FFFFFF',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    fontWeight: '500',
  },
  quoteAuthor: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  photoCredit: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    alignSelf: 'flex-end',
  },
});

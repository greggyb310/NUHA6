import { View, Text, StyleSheet, ActivityIndicator, Image, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { useEffect, useState } from 'react';

const { width, height } = Dimensions.get('window');

const NATURE_IMAGES = [
  require('@/assets/images/img_1335_medium.jpeg'),
  require('@/assets/images/sunrise_above_the_clouds_donner_lake_medium.jpeg'),
  require('@/assets/images/img_6448_medium.jpeg'),
  require('@/assets/images/img_6502_medium.jpeg'),
  require('@/assets/images/img_6521_medium.jpeg'),
  require('@/assets/images/img_3495_medium.jpeg'),
  require('@/assets/images/star_shaockwaves_medium.jpeg'),
  require('@/assets/images/img_6583_medium.jpeg'),
  require('@/assets/images/snail1_medium.jpeg'),
  require('@/assets/images/img_6096_large_medium.jpeg'),
];

const NATURE_QUOTES = [
  "In every walk with nature, one receives far more than they seek.",
  "Nature does not hurry, yet everything is accomplished.",
  "The earth has music for those who listen.",
  "Look deep into nature, and then you will understand everything better.",
  "Adopt the pace of nature: her secret is patience.",
  "Nature is not a place to visit. It is home.",
  "In nature, nothing is perfect and everything is perfect.",
  "The clearest way into the Universe is through a forest wilderness.",
  "Nature always wears the colors of the spirit.",
  "Let nature be your teacher.",
  "Between every two pines is a doorway to a new world.",
  "Study nature, love nature, stay close to nature. It will never fail you.",
  "To sit in the shade on a fine day and look upon verdure is the most perfect refreshment.",
  "Nature is the art of God.",
  "Heaven is under our feet as well as over our heads.",
];

interface LoadingScreenProps {
  message?: string;
  progress?: number;
}

export function LoadingScreen({ message, progress }: LoadingScreenProps) {
  const [imageIndex, setImageIndex] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    setImageIndex(Math.floor(Math.random() * NATURE_IMAGES.length));
    setQuoteIndex(Math.floor(Math.random() * NATURE_QUOTES.length));
  }, []);

  return (
    <View style={styles.container}>
      <Image
        source={NATURE_IMAGES[imageIndex]}
        style={styles.backgroundImage}
        resizeMode="cover"
      />

      <BlurView intensity={30} style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.quoteContainer}>
            <Text style={styles.quote}>"{NATURE_QUOTES[quoteIndex]}"</Text>
          </View>

          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#4A7C2E" />
            {message && <Text style={styles.message}>{message}</Text>}
            {progress !== undefined && progress >= 0 && (
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarBackground}>
                  <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressText}>{Math.round(progress)}%</Text>
              </View>
            )}
          </View>
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width,
    height,
    zIndex: 9999,
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(45, 62, 31, 0.3)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  quoteContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    padding: 24,
    marginBottom: 48,
    maxWidth: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  quote: {
    fontSize: 18,
    lineHeight: 27,
    color: '#2D3E1F',
    textAlign: 'center',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  loaderContainer: {
    alignItems: 'center',
    gap: 16,
  },
  message: {
    fontSize: 16,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  progressBarContainer: {
    alignItems: 'center',
    gap: 8,
    width: 200,
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4A7C2E',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

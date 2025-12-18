import { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ImageBackground, Dimensions, Animated } from 'react-native';

const NATURE_IMAGES = [
  require('@/assets/images/img_1335_medium.jpeg'),
  require('@/assets/images/img_3495_medium.jpeg'),
  require('@/assets/images/img_6096_large_medium.jpeg'),
  require('@/assets/images/img_6448_medium.jpeg'),
  require('@/assets/images/img_6502_medium.jpeg'),
  require('@/assets/images/img_6521_medium.jpeg'),
  require('@/assets/images/img_6583_medium.jpeg'),
  require('@/assets/images/sunrise_above_the_clouds_donner_lake_medium.jpeg'),
  require('@/assets/images/star_shaockwaves_medium.jpeg'),
];

const { width, height } = Dimensions.get('window');

export function SplashScreen() {
  const [randomImage] = useState(() => {
    const randomIndex = Math.floor(Math.random() * NATURE_IMAGES.length);
    return NATURE_IMAGES[randomIndex];
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      delay: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <View style={styles.container}>
      <ImageBackground
        source={randomImage}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay} />
        <Animated.View
          style={[styles.content, { opacity: fadeAnim }]}
        >
          <Text style={styles.welcomeText}>Welcome</Text>
          <Text style={styles.subtitle}>to NatureUP Health</Text>
        </Animated.View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2D3E1F',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(45, 62, 31, 0.4)',
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  welcomeText: {
    fontSize: 64,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '400',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    opacity: 0.95,
  },
});

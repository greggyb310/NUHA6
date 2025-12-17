import { View, Text, StyleSheet } from 'react-native';
import { MapPin } from 'lucide-react-native';

export default function MapScreen() {
  return (
    <View style={styles.centerContainer}>
      <MapPin size={48} color="#4A7C2E" />
      <Text style={styles.webMessage}>NatureUP Health is iOS-only</Text>
      <Text style={styles.webSubtext}>
        Preview this app on your iPhone using launch.expo.dev
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F8F3',
    padding: 20,
  },
  webMessage: {
    marginTop: 16,
    fontSize: 18,
    color: '#2D3E1F',
    fontWeight: '600',
    textAlign: 'center',
  },
  webSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#5A6C4A',
    textAlign: 'center',
  },
});

import { View, Text, StyleSheet } from 'react-native';
import { User } from 'lucide-react-native';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <User size={48} color="#4A7C2E" />
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.subtitle}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F8F3',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2D3E1F',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#5A6C4A',
    marginTop: 8,
  },
});

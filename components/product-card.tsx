import { View, Text, StyleSheet, TouchableOpacity, Image, Linking } from 'react-native';
import { ExternalLink } from 'lucide-react-native';

interface ProductCardProps {
  title: string;
  description: string;
  imageUrl: string;
  affiliateLink: string;
  platform: string;
  category: string;
}

const IMAGE_MAP: Record<string, any> = {
  'sunrise_above_the_clouds_donner_lake_medium.jpeg': require('@/assets/images/sunrise_above_the_clouds_donner_lake_medium.jpeg'),
  'star_shaockwaves_medium.jpeg': require('@/assets/images/star_shaockwaves_medium.jpeg'),
  'snail1_medium.jpeg': require('@/assets/images/snail1_medium.jpeg'),
  'img_1335_medium.jpeg': require('@/assets/images/img_1335_medium.jpeg'),
  'img_3495_medium.jpeg': require('@/assets/images/img_3495_medium.jpeg'),
  'img_6096_large_medium.jpeg': require('@/assets/images/img_6096_large_medium.jpeg'),
  'img_6448_medium.jpeg': require('@/assets/images/img_6448_medium.jpeg'),
  'img_6502_medium.jpeg': require('@/assets/images/img_6502_medium.jpeg'),
  'img_6521_medium.jpeg': require('@/assets/images/img_6521_medium.jpeg'),
  'img_6583_medium.jpeg': require('@/assets/images/img_6583_medium.jpeg'),
};

export default function ProductCard({
  title,
  description,
  imageUrl,
  affiliateLink,
  platform,
  category,
}: ProductCardProps) {
  const handlePress = async () => {
    const supported = await Linking.canOpenURL(affiliateLink);
    if (supported) {
      await Linking.openURL(affiliateLink);
    }
  };

  const imageSource = IMAGE_MAP[imageUrl] || IMAGE_MAP['snail1_medium.jpeg'];

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.8}>
      <Image source={imageSource} style={styles.image} resizeMode="cover" />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.category}>{category}</Text>
          <Text style={styles.platform}>{platform}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.description} numberOfLines={3}>
          {description}
        </Text>
        <View style={styles.footer}>
          <View style={styles.linkButton}>
            <ExternalLink size={16} color="#4A7C2E" />
            <Text style={styles.linkText}>View Product</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: 200,
    backgroundColor: '#F5F8F3',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  category: {
    fontSize: 12,
    color: '#4A7C2E',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  platform: {
    fontSize: 12,
    color: '#5A6C4A',
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3E1F',
    marginBottom: 8,
    lineHeight: 24,
  },
  description: {
    fontSize: 14,
    color: '#5A6C4A',
    lineHeight: 20,
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F5F8F3',
    borderRadius: 8,
  },
  linkText: {
    fontSize: 14,
    color: '#4A7C2E',
    fontWeight: '600',
  },
});

import { Stack } from 'expo-router';

export default function ExploreLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="create" />
      <Stack.Screen name="excursion-detail" />
      <Stack.Screen name="active-excursion" />
    </Stack>
  );
}

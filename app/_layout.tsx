import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { getCurrentUser } from '@/services/auth';
import { supabase } from '@/services/supabase';
import { SplashScreen } from '@/components/splash-screen';

export default function RootLayout() {
  useFrameworkReady();
  const router = useRouter();
  const segments = useSegments();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated === null || showSplash) {
      return;
    }

    const inAuthGroup = segments[0] === '(tabs)';
    const inOnboarding = segments[0] === 'onboarding';
    const inSignIn = segments[0] === 'sign-in';
    const inSignUp = segments[0] === 'sign-up';

    console.log('Navigation check:', {
      isAuthenticated,
      segments,
      inAuthGroup,
    });

    if (!isAuthenticated && inAuthGroup) {
      console.log('Redirecting to sign-in (unauthenticated in tabs)');
      router.replace('/sign-in');
    } else if (
      isAuthenticated &&
      !inAuthGroup &&
      !inOnboarding &&
      !inSignIn &&
      !inSignUp &&
      segments.length > 0
    ) {
      console.log('Redirecting to tabs (authenticated but not in allowed route)');
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, segments, showSplash]);

  const checkAuth = async () => {
    const user = await getCurrentUser();
    setIsAuthenticated(!!user);
  };

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  if (isAuthenticated === null || showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

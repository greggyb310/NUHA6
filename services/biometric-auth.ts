import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CREDENTIALS_KEY = 'biometric_credentials';
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export interface BiometricCapabilities {
  isAvailable: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  biometricType: string;
}

export async function getBiometricCapabilities(): Promise<BiometricCapabilities> {
  if (Platform.OS === 'web') {
    return {
      isAvailable: false,
      hasHardware: false,
      isEnrolled: false,
      biometricType: 'none',
    };
  }

  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

  let biometricType = 'none';
  if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    biometricType = 'Face ID';
  } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    biometricType = 'Touch ID';
  }

  return {
    isAvailable: hasHardware && isEnrolled,
    hasHardware,
    isEnrolled,
    biometricType,
  };
}

export async function authenticateWithBiometrics(): Promise<{ success: boolean; error?: string }> {
  if (Platform.OS === 'web') {
    return { success: false, error: 'Biometric authentication not available on web' };
  }

  const capabilities = await getBiometricCapabilities();

  if (!capabilities.isAvailable) {
    return { success: false, error: 'Biometric authentication not available' };
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Sign in to NatureUP Health',
    fallbackLabel: 'Use password',
    cancelLabel: 'Cancel',
  });

  if (result.success) {
    return { success: true };
  }

  return { success: false, error: 'Authentication failed' };
}

export async function saveCredentialsForBiometric(username: string, password: string): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  const credentials = JSON.stringify({ username, password });
  await SecureStore.setItemAsync(CREDENTIALS_KEY, credentials, {
    requireAuthentication: false,
  });
  await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true', {
    requireAuthentication: false,
  });
}

export async function getStoredCredentials(): Promise<{ username: string; password: string } | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    const credentials = await SecureStore.getItemAsync(CREDENTIALS_KEY, {
      requireAuthentication: false,
    });
    if (!credentials) {
      return null;
    }

    return JSON.parse(credentials);
  } catch (error) {
    return null;
  }
}

export async function isBiometricEnabled(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY, {
    requireAuthentication: false,
  });
  return enabled === 'true';
}

export async function disableBiometric(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }

  await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
  await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
}

export async function enableBiometric(username: string, password: string): Promise<{ success: boolean; error?: string }> {
  const capabilities = await getBiometricCapabilities();

  if (!capabilities.isAvailable) {
    return { success: false, error: `${capabilities.biometricType} is not set up on this device` };
  }

  const authResult = await authenticateWithBiometrics();

  if (!authResult.success) {
    return { success: false, error: authResult.error };
  }

  await saveCredentialsForBiometric(username, password);

  return { success: true };
}

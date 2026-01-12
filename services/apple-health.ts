import { Platform } from 'react-native';
import {
  isHealthDataAvailable,
  requestAuthorization,
  queryQuantitySamples,
  saveWorkoutSample,
  saveCategorySample,
  HKWorkoutActivityType,
  HKQuantityTypeIdentifier,
  HKCategoryTypeIdentifier,
} from '@kingstinct/react-native-healthkit';
import { supabase } from './supabase';

export interface HealthPermissions {
  read: string[];
  write: string[];
}

export interface HealthMetric {
  type: string;
  value: number;
  unit: string;
  date: Date;
}

export interface WorkoutData {
  type: string;
  startDate: Date;
  endDate: Date;
  duration: number;
  distance?: number;
  calories?: number;
  metadata?: Record<string, unknown>;
}

const READ_TYPES = [
  HKQuantityTypeIdentifier.stepCount,
  HKQuantityTypeIdentifier.distanceWalkingRunning,
  HKQuantityTypeIdentifier.activeEnergyBurned,
  HKQuantityTypeIdentifier.heartRate,
  HKCategoryTypeIdentifier.mindfulSession,
  'HKWorkoutTypeIdentifier',
] as const;

const WRITE_TYPES = [
  HKCategoryTypeIdentifier.mindfulSession,
  'HKWorkoutTypeIdentifier',
  HKQuantityTypeIdentifier.activeEnergyBurned,
] as const;

export async function isHealthKitAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    const available = await isHealthDataAvailable();
    return available;
  } catch {
    return false;
  }
}

export async function requestHealthPermissions(): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log('[HealthKit] requestHealthPermissions called');
  console.log('[HealthKit] Platform.OS:', Platform.OS);

  if (Platform.OS !== 'ios') {
    const message =
      Platform.OS === 'web'
        ? 'Apple Health is only available on iOS devices. This is a web preview.'
        : 'Apple Health is not available on this device';
    console.log('[HealthKit] Not available:', message);
    return {
      success: false,
      error: message,
    };
  }

  try {
    const available = await isHealthDataAvailable();
    if (!available) {
      return {
        success: false,
        error: 'Health data is not available on this device.',
      };
    }

    await requestAuthorization(READ_TYPES, WRITE_TYPES);

    console.log('[HealthKit] Successfully authorized');
    return { success: true };
  } catch (e) {
    console.error('[HealthKit] Authorization error:', e);
    const msg = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      error: `HealthKit authorization failed: ${msg}. Check Settings > Privacy & Security > Health.`,
    };
  }
}

export async function getSteps(
  startDate: Date,
  endDate: Date = new Date()
): Promise<number> {
  if (!(await isHealthKitAvailable())) {
    return 0;
  }

  try {
    const samples = await queryQuantitySamples(HKQuantityTypeIdentifier.stepCount, {
      from: startDate,
      to: endDate,
    });

    return samples.reduce((sum: number, s) => sum + (s.quantity ?? 0), 0);
  } catch (error) {
    console.error('Error fetching steps:', error);
    return 0;
  }
}

export async function getDistance(
  startDate: Date,
  endDate: Date = new Date()
): Promise<number> {
  if (!(await isHealthKitAvailable())) {
    return 0;
  }

  try {
    const samples = await queryQuantitySamples(HKQuantityTypeIdentifier.distanceWalkingRunning, {
      from: startDate,
      to: endDate,
    });

    return samples.reduce((sum: number, s) => sum + (s.quantity ?? 0), 0);
  } catch (error) {
    console.error('Error fetching distance:', error);
    return 0;
  }
}

export async function getActiveCalories(
  startDate: Date,
  endDate: Date = new Date()
): Promise<number> {
  if (!(await isHealthKitAvailable())) {
    return 0;
  }

  try {
    const samples = await queryQuantitySamples(HKQuantityTypeIdentifier.activeEnergyBurned, {
      from: startDate,
      to: endDate,
    });

    return samples.reduce((sum: number, s) => sum + (s.quantity ?? 0), 0);
  } catch (error) {
    console.error('Error fetching calories:', error);
    return 0;
  }
}

function toWorkoutActivityType(activity?: string): HKWorkoutActivityType {
  const a = (activity ?? '').toLowerCase();
  if (a.includes('hike')) return HKWorkoutActivityType.hiking;
  if (a.includes('run')) return HKWorkoutActivityType.running;
  return HKWorkoutActivityType.walking;
}

export async function saveWorkout(workout: WorkoutData): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!(await isHealthKitAvailable())) {
    return {
      success: false,
      error: 'Apple Health is only available on iOS devices',
    };
  }

  try {
    const activityType =
      typeof workout.type === 'string'
        ? toWorkoutActivityType(workout.type)
        : toWorkoutActivityType(String(workout.type));

    await saveWorkoutSample(activityType, [], workout.startDate, {
      end: workout.endDate,
      totals: {
        energyBurned: workout.calories ?? 0,
        distance: workout.distance ?? 0,
      },
    });

    return { success: true };
  } catch (e) {
    console.error('Error saving workout:', e);
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg || 'Failed to save workout' };
  }
}

export async function saveMindfulMinutes(
  startDate: Date,
  duration: number
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!(await isHealthKitAvailable())) {
    return {
      success: false,
      error: 'Apple Health is only available on iOS devices',
    };
  }

  const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

  try {
    await saveCategorySample(HKCategoryTypeIdentifier.mindfulSession, 0, {
      start: startDate,
      end: endDate,
    });

    return { success: true };
  } catch (e) {
    console.error('Error saving mindful session:', e);
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg || 'Failed to save mindful minutes' };
  }
}

export async function syncExcursionToHealth(excursionData: {
  title: string;
  startTime: Date;
  endTime: Date;
  distanceKm?: number;
  activityType?: string;
  estimatedCalories?: number;
}): Promise<{ success: boolean; error?: string }> {
  if (!(await isHealthKitAvailable())) {
    return {
      success: false,
      error: 'Apple Health is only available on iOS devices',
    };
  }

  const duration =
    (excursionData.endTime.getTime() - excursionData.startTime.getTime()) /
    1000 /
    60;

  const workoutType = toWorkoutActivityType(excursionData.activityType);

  const workoutResult = await saveWorkout({
    type: String(workoutType),
    startDate: excursionData.startTime,
    endDate: excursionData.endTime,
    duration,
    distance: excursionData.distanceKm ? excursionData.distanceKm * 1000 : 0,
    calories: excursionData.estimatedCalories || 0,
  });

  if (!workoutResult.success) {
    return workoutResult;
  }

  const mindfulDuration = Math.floor(duration * 0.3);
  if (mindfulDuration > 0) {
    await saveMindfulMinutes(excursionData.startTime, mindfulDuration);
  }

  return { success: true };
}

export async function syncHealthMetricsToDatabase(
  userId: string,
  daysBack: number = 7
): Promise<{ success: boolean; error?: string }> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const steps = await getSteps(startDate, endDate);
    const distance = await getDistance(startDate, endDate);
    const calories = await getActiveCalories(startDate, endDate);

    const metricsToSync = [
      {
        user_id: userId,
        metric_type: 'steps',
        value: steps,
        unit: 'steps',
        recorded_at: endDate.toISOString(),
        source: 'apple_health',
      },
      {
        user_id: userId,
        metric_type: 'distance',
        value: distance,
        unit: 'meters',
        recorded_at: endDate.toISOString(),
        source: 'apple_health',
      },
      {
        user_id: userId,
        metric_type: 'calories',
        value: calories,
        unit: 'kcal',
        recorded_at: endDate.toISOString(),
        source: 'apple_health',
      },
    ];

    const { error } = await supabase
      .from('health_data_sync')
      .insert(metricsToSync);

    if (error) {
      console.error('Error syncing health metrics to database:', error);
      return { success: false, error: error.message };
    }

    await supabase
      .from('user_profiles')
      .update({ last_health_sync_at: new Date().toISOString() })
      .eq('user_id', userId);

    return { success: true };
  } catch (error) {
    console.error('Error in syncHealthMetricsToDatabase:', error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

export async function enableAppleHealth(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  console.log('enableAppleHealth called for user:', userId);

  const permissionResult = await requestHealthPermissions();

  if (!permissionResult.success) {
    console.log('Permission request failed:', permissionResult.error);
    return permissionResult;
  }

  console.log('Updating user profile with Apple Health enabled...');
  const { error } = await supabase
    .from('user_profiles')
    .update({
      apple_health_enabled: true,
      apple_health_connected_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating profile:', error);
    return { success: false, error: `Database error: ${error.message}` };
  }

  console.log('Profile updated successfully, syncing health data...');
  const syncResult = await syncHealthMetricsToDatabase(userId);

  if (!syncResult.success) {
    console.warn('Initial sync failed, but connection established:', syncResult.error);
  }

  return { success: true };
}

export async function disableAppleHealth(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('user_profiles')
    .update({
      apple_health_enabled: false,
      apple_health_connected_at: null,
      last_health_sync_at: null,
    })
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating profile:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getRecentHealthSummary(
  userId: string,
  daysBack: number = 7
): Promise<{
  steps: number;
  distance: number;
  calories: number;
  error?: string;
}> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const { data, error } = await supabase
      .from('health_data_sync')
      .select('metric_type, value')
      .eq('user_id', userId)
      .gte('recorded_at', startDate.toISOString())
      .lte('recorded_at', endDate.toISOString())
      .order('recorded_at', { ascending: false });

    if (error) {
      console.error('Error fetching health summary:', error);
      return { steps: 0, distance: 0, calories: 0, error: error.message };
    }

    const summary = {
      steps: 0,
      distance: 0,
      calories: 0,
    };

    if (data) {
      const latestMetrics = new Map<string, number>();

      data.forEach((metric) => {
        if (!latestMetrics.has(metric.metric_type)) {
          latestMetrics.set(metric.metric_type, metric.value);
        }
      });

      summary.steps = latestMetrics.get('steps') || 0;
      summary.distance = latestMetrics.get('distance') || 0;
      summary.calories = latestMetrics.get('calories') || 0;
    }

    return summary;
  } catch (error) {
    console.error('Error in getRecentHealthSummary:', error);
    return {
      steps: 0,
      distance: 0,
      calories: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

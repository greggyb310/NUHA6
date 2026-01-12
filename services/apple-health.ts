import { Platform } from 'react-native';
import AppleHealthKit, {
  HealthKitPermissions,
  HealthValue,
  HealthInputOptions,
} from 'react-native-health';
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

const HEALTH_PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Steps,
      AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.MindfulSession,
      AppleHealthKit.Constants.Permissions.Workout,
    ],
    write: [
      AppleHealthKit.Constants.Permissions.MindfulSession,
      AppleHealthKit.Constants.Permissions.Workout,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
    ],
  },
};

export function isHealthKitAvailable(): boolean {
  return Platform.OS === 'ios';
}

export async function requestHealthPermissions(): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log('[HealthKit] requestHealthPermissions called');
  console.log('[HealthKit] Platform.OS:', Platform.OS);
  console.log('[HealthKit] AppleHealthKit module available:', !!AppleHealthKit);
  console.log('[HealthKit] AppleHealthKit.Constants available:', !!AppleHealthKit.Constants);

  if (!isHealthKitAvailable()) {
    const message = Platform.OS === 'web'
      ? 'Apple Health is only available on iOS devices. This is a web preview.'
      : 'Apple Health is not available on this device';
    console.log('[HealthKit] Not available:', message);
    return {
      success: false,
      error: message,
    };
  }

  return new Promise((resolve) => {
    let resolved = false;
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        console.error('[HealthKit] TIMEOUT - HealthKit initialization took longer than 10 seconds');
        resolve({
          success: false,
          error: 'Connection timeout. The native HealthKit module may not be properly configured. Please rebuild the app using EAS Build.',
        });
      }
    }, 10000);

    console.log('[HealthKit] Calling initHealthKit...');
    console.log('[HealthKit] Permissions config:', JSON.stringify(HEALTH_PERMISSIONS, null, 2));

    try {
      AppleHealthKit.initHealthKit(HEALTH_PERMISSIONS, (error: string) => {
        if (resolved) {
          console.log('[HealthKit] Callback fired after timeout, ignoring');
          return;
        }

        clearTimeout(timeout);
        resolved = true;

        if (error) {
          console.error('[HealthKit] Init error:', error);
          console.error('[HealthKit] Error type:', typeof error);
          console.error('[HealthKit] Error details:', JSON.stringify(error));
          resolve({
            success: false,
            error: `HealthKit Error: ${String(error)}. Please open Settings > Privacy & Security > Health > NatureUP Health and enable all permissions.`,
          });
          return;
        }

        console.log('[HealthKit] Successfully initialized');
        resolve({ success: true });
      });
    } catch (err) {
      if (!resolved) {
        clearTimeout(timeout);
        resolved = true;
        console.error('[HealthKit] Exception during initHealthKit:', err);
        resolve({
          success: false,
          error: `Native module error: ${err instanceof Error ? err.message : String(err)}. The app may need to be rebuilt with EAS Build.`,
        });
      }
    }
  });
}

export async function checkHealthAuthorization(
  permissionType: string
): Promise<boolean> {
  if (!isHealthKitAvailable()) {
    return false;
  }

  return new Promise((resolve) => {
    AppleHealthKit.getAuthStatus(
      { type: permissionType } as any,
      (error: string, result: any) => {
        if (error || !result) {
          resolve(false);
          return;
        }
        resolve(true);
      }
    );
  });
}

export async function getSteps(
  startDate: Date,
  endDate: Date = new Date()
): Promise<number> {
  if (!isHealthKitAvailable()) {
    return 0;
  }

  return new Promise((resolve) => {
    const options: HealthInputOptions = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    };

    AppleHealthKit.getStepCount(options, (error: string, results: HealthValue) => {
      if (error || !results) {
        console.error('Error fetching steps:', error);
        resolve(0);
        return;
      }
      resolve(results.value);
    });
  });
}

export async function getDistance(
  startDate: Date,
  endDate: Date = new Date()
): Promise<number> {
  if (!isHealthKitAvailable()) {
    return 0;
  }

  return new Promise((resolve) => {
    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      unit: 'meter' as any,
    };

    AppleHealthKit.getDistanceWalkingRunning(options, (error: string, results: HealthValue) => {
      if (error || !results) {
        console.error('Error fetching distance:', error);
        resolve(0);
        return;
      }
      resolve(results.value);
    });
  });
}

export async function getActiveCalories(
  startDate: Date,
  endDate: Date = new Date()
): Promise<number> {
  if (!isHealthKitAvailable()) {
    return 0;
  }

  return new Promise((resolve) => {
    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      unit: 'kilocalorie' as any,
    };

    AppleHealthKit.getActiveEnergyBurned(options, (error: string, results: HealthValue[]) => {
      if (error || !results || results.length === 0) {
        console.error('Error fetching calories:', error);
        resolve(0);
        return;
      }
      resolve(results[0].value);
    });
  });
}

export async function saveWorkout(workout: WorkoutData): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isHealthKitAvailable()) {
    return {
      success: false,
      error: 'Apple Health is only available on iOS devices',
    };
  }

  return new Promise((resolve) => {
    const workoutOptions = {
      type: (workout.type || AppleHealthKit.Constants.Activities.Walking) as any,
      startDate: workout.startDate.toISOString(),
      endDate: workout.endDate.toISOString(),
      energyBurned: workout.calories || 0,
      distance: workout.distance || 0,
    };

    AppleHealthKit.saveWorkout(workoutOptions, (error: string) => {
      if (error) {
        console.error('Error saving workout:', error);
        resolve({
          success: false,
          error: String(error) || 'Failed to save workout',
        });
        return;
      }

      resolve({ success: true });
    });
  });
}

export async function saveMindfulMinutes(
  startDate: Date,
  duration: number
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!isHealthKitAvailable()) {
    return {
      success: false,
      error: 'Apple Health is only available on iOS devices',
    };
  }

  return new Promise((resolve) => {
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

    const mindfulOptions = {
      value: duration,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    } as any;

    AppleHealthKit.saveMindfulSession(mindfulOptions, (error: string) => {
      if (error) {
        console.error('Error saving mindful session:', error);
        resolve({
          success: false,
          error: String(error) || 'Failed to save mindful minutes',
        });
        return;
      }

      resolve({ success: true });
    });
  });
}

export async function syncExcursionToHealth(excursionData: {
  title: string;
  startTime: Date;
  endTime: Date;
  distanceKm?: number;
  activityType?: string;
  estimatedCalories?: number;
}): Promise<{ success: boolean; error?: string }> {
  if (!isHealthKitAvailable()) {
    return {
      success: false,
      error: 'Apple Health is only available on iOS devices',
    };
  }

  const duration =
    (excursionData.endTime.getTime() - excursionData.startTime.getTime()) /
    1000 /
    60;

  let workoutType = AppleHealthKit.Constants.Activities.Walking;
  if (excursionData.activityType?.toLowerCase().includes('hike')) {
    workoutType = AppleHealthKit.Constants.Activities.Hiking;
  } else if (excursionData.activityType?.toLowerCase().includes('run')) {
    workoutType = AppleHealthKit.Constants.Activities.Running;
  }

  const workoutResult = await saveWorkout({
    type: workoutType,
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

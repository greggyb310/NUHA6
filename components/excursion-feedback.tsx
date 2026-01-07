import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Star } from 'lucide-react-native';
import { supabase } from '@/services/supabase';
import { syncExcursionToHealth } from '@/services/apple-health';
import { getCurrentUser } from '@/services/auth';
import { getUserProfile } from '@/services/user-profile';

interface ExcursionFeedbackProps {
  excursionId: string;
  excursionTitle: string;
  startTime: Date;
  durationMinutes: number;
  distanceKm?: number;
  activityType?: string;
  onComplete: () => void;
}

export function ExcursionFeedback({
  excursionId,
  excursionTitle,
  startTime,
  durationMinutes,
  distanceKm,
  activityType,
  onComplete
}: ExcursionFeedbackProps) {
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be logged in to submit feedback');
        setSubmitting(false);
        return;
      }

      const { error: dbError } = await supabase
        .from('excursion_feedback')
        .insert({
          excursion_id: excursionId,
          user_id: user.id,
          rating,
          feedback_text: feedback.trim() || null,
        });

      if (dbError) {
        console.error('Error submitting feedback:', dbError);
        setError('Failed to submit feedback');
        setSubmitting(false);
        return;
      }

      const completedAt = new Date();
      const { error: updateError } = await supabase
        .from('excursions')
        .update({ completed_at: completedAt.toISOString() })
        .eq('id', excursionId);

      if (updateError) {
        console.error('Error updating excursion:', updateError);
      }

      await syncToAppleHealth(completedAt);

      onComplete();
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setError('An unexpected error occurred');
      setSubmitting(false);
    }
  };

  const syncToAppleHealth = async (completedAt: Date) => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const profile = await getUserProfile(user.id);
      if (!profile?.apple_health_enabled) return;

      const endTime = completedAt;
      const estimatedCalories = durationMinutes ? Math.round(durationMinutes * 4.5) : 0;

      await syncExcursionToHealth({
        title: excursionTitle,
        startTime,
        endTime,
        distanceKm,
        activityType,
        estimatedCalories,
      });
    } catch (err) {
      console.error('Error syncing to Apple Health:', err);
    }
  };

  const handleSkip = async () => {
    try {
      const completedAt = new Date();
      await supabase
        .from('excursions')
        .update({ completed_at: completedAt.toISOString() })
        .eq('id', excursionId);

      await syncToAppleHealth(completedAt);

      onComplete();
    } catch (err) {
      console.error('Error updating excursion:', err);
      onComplete();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>How was your experience?</Text>
        <Text style={styles.subtitle}>{excursionTitle}</Text>

        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              disabled={submitting}
            >
              <Star
                size={40}
                color={star <= rating ? '#FFD700' : '#CCC'}
                fill={star <= rating ? '#FFD700' : 'transparent'}
              />
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.textInput}
          value={feedback}
          onChangeText={setFeedback}
          placeholder="Share your thoughts (optional)"
          placeholderTextColor="#999"
          multiline
          maxLength={500}
          editable={!submitting}
        />

        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.skipButton]}
            onPress={handleSkip}
            disabled={submitting}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.submitButton, rating === 0 && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting || rating === 0}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2D3E1F',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#5A6C4A',
    marginBottom: 24,
    textAlign: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 24,
  },
  textInput: {
    minHeight: 100,
    backgroundColor: '#F5F8F3',
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: '#2D3E1F',
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 14,
    color: '#C00',
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    backgroundColor: '#F5F8F3',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5A6C4A',
  },
  submitButton: {
    backgroundColor: '#4A7C2E',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    backgroundColor: '#CCC',
  },
});

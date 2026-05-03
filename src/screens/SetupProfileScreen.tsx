import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { auth, db } from '../lib/firebaseSetup';
import { doc, updateDoc } from 'firebase/firestore';
import { logoutUser } from '../api/auth';

const goals = [
  { label: 'Lose', value: 'LOSE_WEIGHT' },
  { label: 'Maintain', value: 'MAINTAIN' },
  { label: 'Gain', value: 'GAIN_WEIGHT' },
] as const;

const activityLevels = [
  { label: 'Sedentary', value: 'SEDENTARY' },
  { label: 'Active', value: 'ACTIVE' },
] as const;

export default function SetupProfileScreen() {
  const [name, setName] = useState(auth.currentUser?.displayName || '');
  const [calorieTarget, setCalorieTarget] = useState('2000');
  const [goal, setGoal] = useState<(typeof goals)[number]['value']>('MAINTAIN');
  const [activityLevel, setActivityLevel] = useState<(typeof activityLevels)[number]['value']>('ACTIVE');
  const [isSaving, setIsSaving] = useState(false);

  const handleContinue = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Session expired', 'Please sign in again.');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter your name to continue.');
      return;
    }

    try {
      setIsSaving(true);
      await updateDoc(doc(db, 'users', user.uid), {
        name: name.trim(),
        goal,
        activityLevel,
        dailyCalorieTarget: Number(calorieTarget) || 2000,
        onboardingComplete: true,
        updatedAt: Date.now(),
      });
    } catch (error: any) {
      Alert.alert('Could not save profile', error?.message || 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Set your nutrition profile</Text>
      <Text style={styles.subtitle}>One-time setup for personalized tracking.</Text>

      <View style={styles.card}>
        <Text style={styles.inputLabel}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={colors.textSecondary}
        />

        <Text style={styles.inputLabel}>Goal</Text>
        <View style={styles.rowWrap}>
          {goals.map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[styles.chip, goal === item.value && styles.chipActive]}
              onPress={() => setGoal(item.value)}
            >
              <Text style={[styles.chipText, goal === item.value && styles.chipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.inputLabel}>Activity</Text>
        <View style={styles.rowWrap}>
          {activityLevels.map((item) => (
            <TouchableOpacity
              key={item.value}
              style={[styles.chip, activityLevel === item.value && styles.chipActive]}
              onPress={() => setActivityLevel(item.value)}
            >
              <Text style={[styles.chipText, activityLevel === item.value && styles.chipTextActive]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.inputLabel}>Daily kcal target</Text>
        <TextInput
          style={styles.input}
          value={calorieTarget}
          onChangeText={setCalorieTarget}
          keyboardType="numeric"
          placeholder="2000"
          placeholderTextColor={colors.textSecondary}
        />

        <TouchableOpacity style={styles.primaryBtn} disabled={isSaving} onPress={handleContinue}>
          {isSaving ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={styles.primaryBtnText}>Continue</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={logoutUser}>
          <Text style={styles.secondaryBtnText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    paddingTop: 40,
  },
  title: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 30,
    color: colors.textPrimary,
  },
  subtitle: {
    marginTop: 6,
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  inputLabel: {
    fontFamily: 'Outfit_600SemiBold',
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Outfit_400Regular',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  rowWrap: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#f3f4f6',
  },
  chipActive: {
    backgroundColor: colors.primary,
  },
  chipText: {
    fontFamily: 'Outfit_600SemiBold',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.textPrimary,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 28,
    paddingVertical: 14,
    marginTop: 10,
    alignItems: 'center',
  },
  primaryBtnText: {
    fontFamily: 'Outfit_700Bold',
    color: colors.textPrimary,
    fontSize: 16,
  },
  secondaryBtn: {
    marginTop: 12,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontFamily: 'Outfit_400Regular',
    color: colors.textSecondary,
  },
});

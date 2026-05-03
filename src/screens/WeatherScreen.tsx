import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { httpsCallable } from 'firebase/functions';
import { functions, db, auth } from '../lib/firebaseSetup';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { colors } from '../theme/colors';
import {
  CloudSun, Thermometer, Droplets, Wind, UtensilsCrossed,
  Flame, Apple, RefreshCw, AlertCircle
} from 'lucide-react-native';

type ClimateData = {
  temp: number;
  humidity: number;
  condition: string;
  advice: string;
  suggestedFoods: string[];
  climateCondition: 'HOT' | 'COLD' | 'NORMAL';
  waterGoalDeltaMl: number;
};

const CLIMATE_CONFIG = {
  HOT:    { emoji: '🌡️', label: 'Hot', color: '#ef4444', bg: '#fee2e2', icon: '🔥' },
  COLD:   { emoji: '❄️', label: 'Cold', color: '#3b82f6', bg: '#dbeafe', icon: '🧊' },
  NORMAL: { emoji: '🌤️', label: 'Pleasant', color: '#10b981', bg: '#d1fae5', icon: '✅' },
};

const FOOD_EMOJIS: Record<string, string> = {
  'Watermelon': '🍉', 'Curd Rice': '🍚', 'Cucumber Salad': '🥗', 'Coconut Water': '🥥',
  'Masala Oats': '🥣', 'Chicken Soup': '🍲', 'Ginger Tea': '🍵', 'Spiced Dal': '🫕',
  'Standard Diet': '🥗',
};

export default function WeatherScreen() {
  const [climate, setClimate] = useState<ClimateData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [remainingCals, setRemainingCals] = useState<number | null>(null);
  const [userName, setUserName] = useState('');

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setIsLoading(true);
    setError(null);

    try {
      // 1. Get location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission is needed to show weather-based recommendations.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });

      // 2. Call Cloud Function
      const getClimateAdviceFn = httpsCallable(functions, 'getClimateAdvice');
      const res: any = await getClimateAdviceFn({ lat: loc.coords.latitude, lon: loc.coords.longitude });
      setClimate(res.data);

      // 3. Load remaining calories for today
      const uid = auth.currentUser?.uid;
      if (uid) {
        // Fetch user profile for name and goal
        const profileDoc = await getDoc(doc(db, 'users', uid));
        if (profileDoc.exists()) {
          const profile = profileDoc.data();
          setUserName(profile.name?.split(' ')[0] || '');

          const dailyGoal = profile.dailyCalorieTarget || 2000;
          const today = new Date().toISOString().split('T')[0];
          const logDoc = await getDoc(doc(db, `users/${uid}/dailyLogs`, today));
          const consumed = logDoc.exists() ? (logDoc.data().totalCalories || 0) : 0;
          setRemainingCals(Math.max(0, dailyGoal - consumed));
        }
      }
    } catch (e: any) {
      setError(e.message || 'Could not load weather data. Try again.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching your local climate...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <AlertCircle size={48} color="#f59e0b" />
          <Text style={styles.errorTitle}>Couldn't Load Weather</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()}>
            <RefreshCw size={16} color="#fff" />
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const cfg = (climate?.climateCondition && CLIMATE_CONFIG[climate.climateCondition])
    ? CLIMATE_CONFIG[climate.climateCondition]
    : CLIMATE_CONFIG.NORMAL;
  const waterGlasses = climate ? Math.round((2000 + climate.waterGoalDeltaMl) / 250) : 8;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Climate Kitchen 🌍</Text>
            <Text style={styles.headerSub}>
              {userName ? `Personalized for you, ${userName}` : 'Personalized nutrition based on your weather'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => fetchData(true)} style={styles.refreshBtn}>
            <RefreshCw size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Main Climate Card */}
        {climate && (
          <View style={[styles.climateCard, { backgroundColor: cfg.bg }]}>
            <View style={styles.climateTop}>
              <View>
                <Text style={styles.climateEmoji}>{cfg.emoji}</Text>
                <Text style={[styles.climateBadge, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
              <View style={styles.tempDisplay}>
                <Text style={[styles.tempValue, { color: cfg.color }]}>{Math.round(climate.temp)}°</Text>
                <Text style={styles.tempUnit}>Celsius</Text>
              </View>
            </View>

            <Text style={[styles.climateCondition, { color: cfg.color }]}>{climate.condition}</Text>

            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={styles.statPill}>
                <Thermometer size={14} color={cfg.color} />
                <Text style={styles.statText}>{Math.round(climate.temp)}°C Feels</Text>
              </View>
              <View style={styles.statPill}>
                <Droplets size={14} color={cfg.color} />
                <Text style={styles.statText}>{climate.humidity}% Humidity</Text>
              </View>
            </View>

            {/* Advice */}
            <View style={styles.adviceBox}>
              <Text style={styles.adviceText}>💡 {climate.advice}</Text>
            </View>
          </View>
        )}

        {/* Water Goal Card */}
        {climate && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Droplets size={20} color="#0ea5e9" />
              <Text style={styles.cardTitle}>Today's Hydration Goal</Text>
            </View>
            <View style={styles.waterGoalRow}>
              <Text style={styles.waterValue}>{waterGlasses}</Text>
              <Text style={styles.waterUnit}>glasses</Text>
            </View>
            {climate.waterGoalDeltaMl > 0 && (
              <Text style={styles.waterNote}>
                +{climate.waterGoalDeltaMl}ml extra due to {climate.climateCondition === 'HOT' ? 'heat' : 'cold weather'}
              </Text>
            )}
            {/* Visual glass indicators */}
            <View style={styles.glassRow}>
              {Array.from({ length: Math.min(waterGlasses, 10) }).map((_, i) => (
                <Text key={i} style={styles.glassIcon}>🥛</Text>
              ))}
            </View>
          </View>
        )}

        {/* Remaining Calories + Suggestions */}
        {remainingCals !== null && climate && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Flame size={20} color="#f97316" />
              <Text style={styles.cardTitle}>Remaining Calories</Text>
            </View>
            <View style={styles.calorieRow}>
              <Text style={styles.calorieValue}>{remainingCals}</Text>
              <Text style={styles.calorieUnit}>kcal left today</Text>
            </View>
            <Text style={styles.suggestionsLabel}>
              {cfg.icon} Best foods for you right now:
            </Text>
            <View style={styles.foodChips}>
              {climate.suggestedFoods.map((food) => (
                <View key={food} style={styles.foodChip}>
                  <Text style={styles.foodChipEmoji}>{FOOD_EMOJIS[food] || '🍽️'}</Text>
                  <Text style={styles.foodChipText}>{food}</Text>
                </View>
              ))}
            </View>
            {remainingCals < 300 && (
              <View style={styles.goalMetBanner}>
                <Text style={styles.goalMetText}>🎉 Almost at your daily goal! Keep it up.</Text>
              </View>
            )}
          </View>
        )}

        {/* Tips Card */}
        {climate && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Apple size={20} color="#10b981" />
              <Text style={styles.cardTitle}>Nutrition Tips</Text>
            </View>
            {climate.climateCondition === 'HOT' ? (
              <>
                <Tip icon="🥑" text="Avoid heavy oily foods that raise body temperature" />
                <Tip icon="🥤" text="Drink water 30 min before meals for better digestion" />
                <Tip icon="🍋" text="Citrus fruits help cool the body naturally" />
              </>
            ) : climate.climateCondition === 'COLD' ? (
              <>
                <Tip icon="🌶️" text="Spiced foods like ginger and pepper boost circulation" />
                <Tip icon="🍲" text="Warm soups and stews keep your core temperature up" />
                <Tip icon="☕" text="Herbal teas provide warmth and antioxidants" />
              </>
            ) : (
              <>
                <Tip icon="🥗" text="Great day for a balanced, nutrient-dense meal" />
                <Tip icon="🏃" text="Pleasant weather — ideal conditions for a post-meal walk" />
                <Tip icon="💧" text="Stick to your 8 glasses baseline hydration" />
              </>
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Tip({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.tip}>
      <Text style={styles.tipIcon}>{icon}</Text>
      <Text style={styles.tipText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 16, fontFamily: 'Outfit_600SemiBold', color: colors.textSecondary },
  errorTitle: { fontFamily: 'Outfit_700Bold', fontSize: 18, color: colors.textPrimary, marginTop: 16 },
  errorText: { fontFamily: 'Outfit_400Regular', color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20,
    backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24,
  },
  retryText: { fontFamily: 'Outfit_600SemiBold', color: '#fff' },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  headerTitle: { fontFamily: 'Outfit_700Bold', fontSize: 26, color: colors.textPrimary },
  headerSub: { fontFamily: 'Outfit_400Regular', fontSize: 13, color: colors.textSecondary, marginTop: 4 },
  refreshBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },

  climateCard: { borderRadius: 24, padding: 24, marginBottom: 16 },
  climateTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  climateEmoji: { fontSize: 36, marginBottom: 4 },
  climateBadge: { fontFamily: 'Outfit_700Bold', fontSize: 16 },
  climateCondition: { fontFamily: 'Outfit_600SemiBold', fontSize: 15, marginBottom: 16 },
  tempDisplay: { alignItems: 'flex-end' },
  tempValue: { fontFamily: 'Outfit_700Bold', fontSize: 56, lineHeight: 60 },
  tempUnit: { fontFamily: 'Outfit_400Regular', fontSize: 13, color: '#6b7280' },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  statText: { fontFamily: 'Outfit_400Regular', fontSize: 12, color: '#374151' },
  adviceBox: { backgroundColor: 'rgba(255,255,255,0.7)', borderRadius: 14, padding: 14 },
  adviceText: { fontFamily: 'Outfit_400Regular', fontSize: 14, lineHeight: 20, color: '#374151' },

  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  cardTitle: { fontFamily: 'Outfit_600SemiBold', fontSize: 16, color: colors.textPrimary },

  waterGoalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 },
  waterValue: { fontFamily: 'Outfit_700Bold', fontSize: 48, color: '#0ea5e9' },
  waterUnit: { fontFamily: 'Outfit_400Regular', fontSize: 16, color: colors.textSecondary },
  waterNote: { fontFamily: 'Outfit_400Regular', fontSize: 13, color: '#0369a1', marginBottom: 16 },
  glassRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  glassIcon: { fontSize: 22 },

  calorieRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 16 },
  calorieValue: { fontFamily: 'Outfit_700Bold', fontSize: 40, color: '#f97316' },
  calorieUnit: { fontFamily: 'Outfit_400Regular', fontSize: 14, color: colors.textSecondary },
  suggestionsLabel: { fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: colors.textPrimary, marginBottom: 12 },
  foodChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  foodChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f0fdf4', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  foodChipEmoji: { fontSize: 16 },
  foodChipText: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: '#166534' },
  goalMetBanner: { backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12, marginTop: 4 },
  goalMetText: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: '#15803d', textAlign: 'center' },

  tip: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  tipIcon: { fontSize: 20 },
  tipText: { fontFamily: 'Outfit_400Regular', fontSize: 14, color: colors.textSecondary, flex: 1, lineHeight: 20 },
});

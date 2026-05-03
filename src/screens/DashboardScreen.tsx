import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Bell, Footprints, Droplets, Utensils, Camera } from 'lucide-react-native';
import { doc, onSnapshot, collection, query, where, updateDoc, setDoc, increment, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebaseSetup';
import { useNavigation } from '@react-navigation/native';

const DAILY_GOAL = 2000;

// Compute the 7 days of the current week (Mon–Sun)
function getCurrentWeek() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sun
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const week = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - dayOfWeek + i);
    week.push({ label: days[d.getDay()], date: d.getDate(), isToday: d.toDateString() === today.toDateString() });
  }
  return week;
}

export default function DashboardScreen() {
  const navigation = useNavigation<any>();
  const [userName, setUserName] = useState('');
  const [totalCalories, setTotalCalories] = useState(0);
  const [macros, setMacros] = useState({ protein: 0, carbs: 0, fats: 0 });
  const [waterGlasses, setWaterGlasses] = useState(0);
  const [meals, setMeals] = useState<any[]>([]);
  const [dailyGoal, setDailyGoal] = useState(DAILY_GOAL);
  const week = getCurrentWeek();

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // 1. Fetch user profile for name + goal
    getDoc(doc(db, 'users', uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUserName(data.name?.split(' ')[0] || '');
        setDailyGoal(data.dailyCalorieTarget || DAILY_GOAL);
      }
    });

    // 2. Real-time listener on today's DailyLog (O(1) read — denormalized totals)
    const today = new Date().toISOString().split('T')[0];
    const logRef = doc(db, `users/${uid}/dailyLogs`, today);
    const unsubLog = onSnapshot(logRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setTotalCalories(data.totalCalories || 0);
        setMacros({
          protein: data.totalProtein || 0,
          carbs: data.totalCarbs || 0,
          fats: data.totalFats || 0,
        });
        setWaterGlasses(Math.round((data.waterIntakeMl || 0) / 250));
      }
    });

    // 3. Real-time listener on today's meals (for the log list)
    const mealsRef = collection(db, `users/${uid}/meals`);
    const q = query(mealsRef, where('dailyLogId', '==', today));
    const unsubMeals = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => b.createdAt - a.createdAt);
      setMeals(list);
    });

    return () => { unsubLog(); unsubMeals(); };
  }, []);

  // Tap-to-add water: increment 250ml in the DailyLog
  const addWater = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const today = new Date().toISOString().split('T')[0];
    const logRef = doc(db, `users/${uid}/dailyLogs`, today);
    try {
      const snap = await getDoc(logRef);
      if (snap.exists()) {
        await updateDoc(logRef, { waterIntakeMl: increment(250) });
      } else {
        await setDoc(logRef, {
          id: today, userId: uid, dateString: today,
          totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0,
          waterIntakeMl: 250, createdAt: Date.now(), updatedAt: Date.now(),
        });
      }
    } catch (e) { console.error(e); }
  };

  const progressPercent = Math.min(100, Math.round((totalCalories / dailyGoal) * 100));
  const greetingTime = new Date().getHours();
  const greeting = greetingTime < 12 ? 'Good morning' : greetingTime < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {userName ? userName[0].toUpperCase() : '👤'}
              </Text>
            </View>
            <View>
              <Text style={styles.greeting}>{greeting} 👋</Text>
              <Text style={styles.name}>{userName || 'Loading...'}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('CameraScanner')}>
              <Camera size={20} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Calorie Progress Card */}
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>⚡ Daily Intake</Text>
            <View style={[styles.badge, progressPercent >= 100 && styles.badgeFull]}>
              <Text style={styles.badgeText}>{progressPercent}%</Text>
            </View>
          </View>

          <View style={styles.progressBarBg}>
            <View style={[
              styles.progressBarFill,
              { width: `${progressPercent}%` },
              progressPercent >= 100 && { backgroundColor: '#ef4444' }
            ]} />
          </View>

          <View style={styles.progressLabels}>
            <Text style={styles.calorieConsumed}>{totalCalories} kcal</Text>
            <Text style={styles.calorieGoal}>/ {dailyGoal} goal</Text>
          </View>

          {/* Macro Mini Row */}
          <View style={styles.macroMiniRow}>
            <MacroMini label="Protein" value={macros.protein} color="#3b82f6" unit="g" />
            <MacroMini label="Carbs" value={macros.carbs} color="#f59e0b" unit="g" />
            <MacroMini label="Fat" value={macros.fats} color="#f97316" unit="g" />
          </View>
        </View>

        {/* Stats Row: Steps + Water */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { flex: 1 }]}>
            <View style={[styles.statIcon, { backgroundColor: '#fff3e0' }]}>
              <Footprints size={22} color="#f97316" />
            </View>
            <Text style={styles.statValue}>4,500</Text>
            <Text style={styles.statLabel}>Steps</Text>
            <Text style={styles.statSub}>Coming soon</Text>
          </View>

          <TouchableOpacity style={[styles.statCard, { flex: 1 }]} onPress={addWater} activeOpacity={0.7}>
            <View style={[styles.statIcon, { backgroundColor: '#e0f2fe' }]}>
              <Droplets size={22} color="#0ea5e9" />
            </View>
            <Text style={styles.statValue}>{waterGlasses}</Text>
            <Text style={styles.statLabel}>Glasses</Text>
            <Text style={styles.statSub}>Tap to add 💧</Text>
          </TouchableOpacity>
        </View>

        {/* Calendar Strip */}
        <View style={styles.calendarCard}>
          {week.map((day) => (
            <View key={day.label + day.date} style={styles.calDay}>
              <Text style={styles.calLabel}>{day.label}</Text>
              <View style={[styles.calCircle, day.isToday && styles.calCircleActive]}>
                <Text style={[styles.calDate, day.isToday && styles.calDateActive]}>
                  {day.date}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Today's Meals */}
        <Text style={styles.sectionTitle}>Today's Logs</Text>
        {meals.length === 0 ? (
          <View style={styles.emptyState}>
            <Utensils size={40} color="#d1d5db" />
            <Text style={styles.emptyTitle}>Nothing logged yet</Text>
            <Text style={styles.emptySubtext}>Tap the camera button to scan your first meal</Text>
          </View>
        ) : (
          meals.map((meal) => (
            <View key={meal.id} style={styles.mealCard}>
              <View style={styles.mealIcon}>
                <Utensils size={18} color={colors.primary} />
              </View>
              <View style={styles.mealInfo}>
                <Text style={styles.mealName} numberOfLines={1}>{meal.name}</Text>
                <Text style={styles.mealMeta}>
                  {meal.calories} kcal · {meal.mealType || 'SNACK'}
                </Text>
              </View>
              <Text style={styles.mealCals}>{meal.calories}</Text>
            </View>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function MacroMini({ label, value, color, unit }: { label: string; value: number; color: string; unit: string }) {
  return (
    <View style={styles.macroMini}>
      <Text style={[styles.macroMiniValue, { color }]}>{Math.round(value)}{unit}</Text>
      <Text style={styles.macroMiniLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerRight: { flexDirection: 'row', gap: 10 },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontFamily: 'Outfit_700Bold', fontSize: 18, color: '#fff' },
  greeting: { fontFamily: 'Outfit_400Regular', fontSize: 13, color: colors.textSecondary },
  name: { fontFamily: 'Outfit_700Bold', fontSize: 18, color: colors.textPrimary },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },

  progressCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  progressTitle: { fontFamily: 'Outfit_600SemiBold', fontSize: 16, color: colors.textPrimary },
  badge: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeFull: { backgroundColor: '#ef4444' },
  badgeText: { fontFamily: 'Outfit_700Bold', fontSize: 12, color: '#fff' },
  progressBarBg: { height: 10, backgroundColor: '#f3f4f6', borderRadius: 6, marginBottom: 12, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 6 },
  progressLabels: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 16 },
  calorieConsumed: { fontFamily: 'Outfit_700Bold', fontSize: 28, color: colors.textPrimary },
  calorieGoal: { fontFamily: 'Outfit_400Regular', fontSize: 14, color: colors.textSecondary },
  macroMiniRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  macroMini: { alignItems: 'center' },
  macroMiniValue: { fontFamily: 'Outfit_700Bold', fontSize: 16 },
  macroMiniLabel: { fontFamily: 'Outfit_400Regular', fontSize: 11, color: colors.textSecondary, marginTop: 2 },

  statsRow: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  statCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  statIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontFamily: 'Outfit_700Bold', fontSize: 20, color: colors.textPrimary },
  statLabel: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  statSub: { fontFamily: 'Outfit_400Regular', fontSize: 11, color: '#9ca3af', marginTop: 4 },

  calendarCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  calDay: { alignItems: 'center', gap: 8 },
  calLabel: { fontFamily: 'Outfit_400Regular', fontSize: 11, color: colors.textSecondary },
  calCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  calCircleActive: { backgroundColor: colors.primary },
  calDate: { fontFamily: 'Outfit_600SemiBold', fontSize: 13, color: colors.textPrimary },
  calDateActive: { color: '#fff', fontFamily: 'Outfit_700Bold' },

  sectionTitle: { fontFamily: 'Outfit_700Bold', fontSize: 18, color: colors.textPrimary, marginBottom: 14 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyTitle: { fontFamily: 'Outfit_600SemiBold', fontSize: 16, color: colors.textPrimary },
  emptySubtext: { fontFamily: 'Outfit_400Regular', fontSize: 13, color: colors.textSecondary, textAlign: 'center' },

  mealCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  mealIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0fdf4',
    justifyContent: 'center', alignItems: 'center',
  },
  mealInfo: { flex: 1 },
  mealName: { fontFamily: 'Outfit_600SemiBold', fontSize: 15, color: colors.textPrimary },
  mealMeta: { fontFamily: 'Outfit_400Regular', fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  mealCals: { fontFamily: 'Outfit_700Bold', fontSize: 16, color: colors.primary },
});

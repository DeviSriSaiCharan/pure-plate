import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Flame, TrendingUp, Calendar } from 'lucide-react-native';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebaseSetup';

const MEAL_TYPE_COLORS: Record<string, string> = {
  BREAKFAST: '#f97316',
  LUNCH: '#10b981',
  DINNER: '#8b5cf6',
  SNACK: '#f59e0b',
};

export default function ActivityScreen() {
  const [meals, setMeals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCalories, setTotalCalories] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setIsLoading(false); return; }

    // Query from the correct nested path — no cross-collection index needed
    const mealsRef = collection(db, `users/${uid}/meals`);
    const q = query(mealsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      let totalCals = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({ id: doc.id, ...data });
        totalCals += data.calories || 0;
      });
      setMeals(list);
      setTotalCalories(totalCals);
      setIsLoading(false);
      setRefreshing(false);
    }, (error) => {
      console.error('Error fetching meals:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const groupByDay = () => {
    const groups: Record<string, any[]> = {};
    meals.forEach((meal) => {
      const day = meal.dailyLogId || (meal.createdAt
        ? new Date(meal.createdAt).toISOString().split('T')[0]
        : 'Unknown');
      if (!groups[day]) groups[day] = [];
      groups[day].push(meal);
    });
    return groups;
  };

  const groups = groupByDay();
  const sortedDays = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  const formatDay = (dateStr: string) => {
    if (dateStr === 'Unknown') return 'Unknown Date';
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
        <Text style={styles.headerSub}>Your complete meal history</Text>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your history...</Text>
        </View>
      ) : meals.length === 0 ? (
        <View style={styles.centered}>
          <Flame size={48} color="#e5e7eb" />
          <Text style={styles.emptyTitle}>No meals logged yet</Text>
          <Text style={styles.emptySubtext}>Use the camera button to start logging meals</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(true)} tintColor={colors.primary} />}
        >
          {/* Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <Flame size={20} color={colors.primary} />
              <Text style={styles.summaryValue}>{totalCalories.toLocaleString()}</Text>
              <Text style={styles.summaryLabel}>Total kcal</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <TrendingUp size={20} color={colors.primary} />
              <Text style={styles.summaryValue}>{meals.length}</Text>
              <Text style={styles.summaryLabel}>Total Meals</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Calendar size={20} color={colors.primary} />
              <Text style={styles.summaryValue}>{sortedDays.length}</Text>
              <Text style={styles.summaryLabel}>Days Logged</Text>
            </View>
          </View>

          {/* Grouped by day */}
          {sortedDays.map((day) => (
            <View key={day}>
              <Text style={styles.dayHeader}>{formatDay(day)}</Text>
              {groups[day].map((meal) => {
                const mealType = meal.mealType || 'SNACK';
                const dotColor = MEAL_TYPE_COLORS[mealType] || '#9ca3af';
                return (
                  <View key={meal.id} style={styles.mealCard}>
                    <View style={styles.mealLeft}>
                      <View style={[styles.mealTypeDot, { backgroundColor: dotColor }]} />
                      <View>
                        <Text style={styles.mealName}>{meal.name}</Text>
                        <View style={styles.mealMeta}>
                          <Text style={[styles.mealTypeLabel, { color: dotColor }]}>{mealType}</Text>
                          <Text style={styles.mealTime}>
                            · {meal.createdAt ? new Date(meal.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.mealRight}>
                      <Text style={styles.mealCals}>{meal.calories} kcal</Text>
                      {meal.protein > 0 && (
                        <Text style={styles.mealProtein}>{Math.round(meal.protein)}g P</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          ))}

          <View style={{ height: 120 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  headerTitle: { fontFamily: 'Outfit_700Bold', fontSize: 28, color: colors.textPrimary },
  headerSub: { fontFamily: 'Outfit_400Regular', fontSize: 14, color: colors.textSecondary, marginTop: 4 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loadingText: { marginTop: 12, fontFamily: 'Outfit_600SemiBold', color: colors.textSecondary },
  emptyTitle: { fontFamily: 'Outfit_700Bold', fontSize: 16, color: colors.textPrimary, marginTop: 16 },
  emptySubtext: { fontFamily: 'Outfit_400Regular', fontSize: 13, color: colors.textSecondary, marginTop: 8, textAlign: 'center' },
  scroll: { paddingHorizontal: 20 },

  summaryCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 24,
    flexDirection: 'row', justifyContent: 'space-around',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  summaryItem: { alignItems: 'center', gap: 6, flex: 1 },
  summaryValue: { fontFamily: 'Outfit_700Bold', fontSize: 20, color: colors.primary },
  summaryLabel: { fontFamily: 'Outfit_400Regular', fontSize: 11, color: colors.textSecondary },
  summaryDivider: { width: 1, backgroundColor: '#f3f4f6' },

  dayHeader: {
    fontFamily: 'Outfit_700Bold', fontSize: 15, color: colors.textPrimary,
    marginBottom: 10, marginTop: 4,
  },
  mealCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  mealLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  mealTypeDot: { width: 10, height: 10, borderRadius: 5 },
  mealName: { fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: colors.textPrimary },
  mealMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  mealTypeLabel: { fontFamily: 'Outfit_600SemiBold', fontSize: 11 },
  mealTime: { fontFamily: 'Outfit_400Regular', fontSize: 11, color: colors.textSecondary },
  mealRight: { alignItems: 'flex-end' },
  mealCals: { fontFamily: 'Outfit_700Bold', fontSize: 15, color: colors.textPrimary },
  mealProtein: { fontFamily: 'Outfit_400Regular', fontSize: 11, color: '#3b82f6', marginTop: 2 },
});

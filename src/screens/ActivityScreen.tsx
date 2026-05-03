import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Flame, TrendingUp, Calendar } from 'lucide-react-native';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebaseSetup';

export default function ActivityScreen() {
  const [meals, setMeals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCalories, setTotalCalories] = useState(0);

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const q = query(
      collection(db, 'meals'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const mealsData: any[] = [];
        let totalCals = 0;

        snapshot.forEach((doc) => {
          const data = doc.data();
          mealsData.push({ id: doc.id, ...data });
          totalCals += data.calories || 0;
        });

        setMeals(mealsData);
        setTotalCalories(totalCals);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error fetching meals:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
        <Text style={styles.headerSub}>Your meal history</Text>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading your meals...</Text>
        </View>
      ) : meals.length > 0 ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={false} />}
        >
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Flame size={20} color={colors.primary} />
                <Text style={styles.summaryValue}>{totalCalories}</Text>
                <Text style={styles.summaryLabel}>Total kcal</Text>
              </View>
              <View style={styles.summaryItem}>
                <TrendingUp size={20} color={colors.primary} />
                <Text style={styles.summaryValue}>{meals.length}</Text>
                <Text style={styles.summaryLabel}>Meals</Text>
              </View>
              <View style={styles.summaryItem}>
                <Calendar size={20} color={colors.primary} />
                <Text style={styles.summaryValue}>{meals.length > 0 ? Math.round(totalCalories / meals.length) : 0}</Text>
                <Text style={styles.summaryLabel}>Avg/meal</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Recent Meals</Text>
          {meals.map((meal, index) => (
            <View key={meal.id || index} style={styles.mealCard}>
              <View style={styles.mealHeaderRow}>
                <View>
                  <Text style={styles.mealName}>{meal.foodName}</Text>
                  <Text style={styles.mealTime}>
                    {new Date(meal.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
              </View>
              {meal.macros && (
                <View style={styles.mealMacros}>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroLabel}>P</Text>
                    <Text style={styles.macroValue}>{Math.round(meal.macros.protein)}g</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroLabel}>C</Text>
                    <Text style={styles.macroValue}>{Math.round(meal.macros.carbs)}g</Text>
                  </View>
                  <View style={styles.macroItem}>
                    <Text style={styles.macroLabel}>F</Text>
                    <Text style={styles.macroValue}>{Math.round(meal.macros.fat)}g</Text>
                  </View>
                </View>
              )}
            </View>
          ))}

          <View style={{ height: 120 }} />
        </ScrollView>
      ) : (
        <View style={styles.centerContainer}>
          <Flame size={48} color={colors.textSecondary} />
          <Text style={styles.emptyText}>No meals logged yet</Text>
          <Text style={styles.emptySubtext}>Start logging meals to see your activity here</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  headerTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 28,
    color: colors.textPrimary,
  },
  headerSub: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontFamily: 'Outfit_600SemiBold',
    color: colors.textSecondary,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    gap: 6,
  },
  summaryValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 18,
    color: colors.primary,
  },
  summaryLabel: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 11,
    color: colors.textSecondary,
  },
  sectionTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 18,
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 12,
  },
  mealCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  mealHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealName: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 14,
    color: colors.textPrimary,
  },
  mealTime: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  mealCalories: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
    color: colors.primary,
  },
  mealMacros: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  macroLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 11,
    color: colors.textSecondary,
  },
  macroValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 13,
    color: colors.textPrimary,
    marginTop: 2,
  },
  emptyText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 16,
    color: colors.textPrimary,
    marginTop: 16,
  },
  emptySubtext: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});

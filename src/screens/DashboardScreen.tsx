import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { Bell, Footprints, Droplets, Utensils } from 'lucide-react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebaseSetup';

export default function DashboardScreen() {
  const [meals, setMeals] = useState<any[]>([]);
  const [totalCalories, setTotalCalories] = useState(0);
  
  const DAILY_GOAL = 2000;
  
  useEffect(() => {
    // Only fetch for the current user or the demo fallback
    const userId = auth.currentUser?.uid || "demo-capstone-user";
    
    // Create query
    const q = query(
      collection(db, 'meals'),
      where('userId', '==', userId)
    );
    
    // Realtime Listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedMeals: any[] = [];
      let cals = 0;
      
      const today = new Date().toISOString().split('T')[0];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.timestamp && data.timestamp.startsWith(today)) {
           fetchedMeals.push({ id: doc.id, ...data });
           cals += data.calories;
        }
      });
      
      // Sort so newest appears at the top
      fetchedMeals.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      setMeals(fetchedMeals);
      setTotalCalories(cals);
    });
    
    return () => unsubscribe();
  }, []);

  const progressPercent = Math.min(100, Math.round((totalCalories / DAILY_GOAL) * 100));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <View style={styles.avatarPlaceholder} />
            <View>
              <Text style={styles.greetingTitle}>Hello Alex 👋</Text>
              <Text style={styles.greetingSub}>Get ready</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.bellIcon}>
            <Bell size={20} color={colors.textPrimary} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {/* Daily Intake Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              <Text style={styles.cardTitle}>⚡ Daily Intake</Text>
            </View>
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>4 Day</Text>
            </View>
          </View>
          
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBarBackground}>
              <View style={[styles.progressBarFill, { width: `${progressPercent}%` }, progressPercent >= 100 && { backgroundColor: '#ef4444' }]} />
              <View style={[styles.progressKnob]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabelText}>Progress</Text>
              <Text style={styles.progressLabelText}>{totalCalories} / {DAILY_GOAL} kcal</Text>
              <Text style={[styles.progressLabelText, progressPercent >= 100 && { color: '#ef4444' }]}>{progressPercent}%</Text>
            </View>
          </View>
        </View>

        {/* Quick Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.card, styles.statCard]}>
            <Text style={styles.statTitle}>Steps</Text>
            <Text style={styles.statValue}>4,500 <Text style={styles.statUnit}>Steps</Text></Text>
            <View style={[styles.iconCircle, { backgroundColor: '#fff3e0' }]}>
              <Footprints size={24} color="#f97316" />
            </View>
          </View>
          <View style={[styles.card, styles.statCard]}>
            <Text style={styles.statTitle}>Water</Text>
            <Text style={styles.statValue}>12 <Text style={styles.statUnit}>Glass</Text></Text>
            <View style={[styles.iconCircle, { backgroundColor: '#e0f2fe' }]}>
              <Droplets size={24} color="#0ea5e9" />
            </View>
          </View>
        </View>

        {/* Calendar Strip */}
        <View style={styles.calendarStrip}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
            const date = 19 + i;
            const isActive = day === 'Wed'; 
            return (
              <View key={day} style={styles.calendarDay}>
                <Text style={styles.calendarDayText}>{day}</Text>
                <View style={[styles.calendarDateCircle, isActive && styles.calendarDateActive]}>
                  <Text style={[styles.calendarDateText, isActive && styles.calendarDateTextActive]}>
                    {date}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        <Text style={styles.sectionHeader}>Today's Logs</Text>
        {meals.length === 0 ? (
           <View style={styles.emptyState}>
             <Utensils size={40} color="#ccc" />
             <Text style={styles.emptyText}>No meals logged today!</Text>
           </View>
        ) : (
           meals.map((meal) => (
             <View key={meal.id} style={[styles.mealCard, { backgroundColor: '#eefbdf' }]}>
               <View style={styles.mealImagePlaceholder}>
                 <Utensils size={20} color={colors.primary} />
               </View>
               <View style={styles.mealInfo}>
                 <Text style={styles.mealTitle} numberOfLines={1}>{meal.foodName}</Text>
                 <Text style={styles.mealCals}>{meal.calories} kcal • {meal.macros?.protein || 0}g protein</Text>
               </View>
               <TouchableOpacity style={styles.addButton}>
                 <Text style={styles.addButtonText}>View</Text>
               </TouchableOpacity>
             </View>
           ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ccc',
  },
  greetingTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 20,
    color: colors.textPrimary,
  },
  greetingSub: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
  bellIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  notificationDot: {
    position: 'absolute',
    top: 12,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#fff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
  },
  streakBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  streakText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 12,
    color: colors.textPrimary,
  },
  progressContainer: {
    marginTop: 10,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressKnob: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#000',
    marginLeft: -8,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  progressLabelText: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    marginBottom: 0,
  },
  statTitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  statValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  statUnit: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'Outfit_400Regular',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  calendarStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  calendarDay: {
    alignItems: 'center',
    gap: 8,
  },
  calendarDayText: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
  },
  calendarDateCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDateActive: {
    backgroundColor: colors.primary,
  },
  calendarDateText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: colors.textPrimary,
  },
  calendarDateTextActive: {
    fontFamily: 'Outfit_700Bold',
  },
  sectionHeader: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 20,
    color: colors.textPrimary,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12
  },
  emptyText: {
     fontFamily: 'Outfit_400Regular',
     color: colors.textSecondary
  },
  mealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    marginBottom: 16,
  },
  mealImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  mealInfo: {
    flex: 1,
    marginRight: 8,
  },
  mealTitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: 4,
  },
  mealCals: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
  addButton: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  addButtonText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: colors.textPrimary,
  }
});

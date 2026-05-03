import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { auth, db } from '../lib/firebaseSetup';
import { doc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { logoutUser } from '../api/auth';
import { UserProfile } from '../types/schema';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [stats, setStats] = useState({
    totalMealsLogged: 0,
    totalCaloriesToday: 0,
    weeklyAverage: 0,
    macros: { protein: 0, carbs: 0, fat: 0 },
  });
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setProfile(snapshot.data() as UserProfile);
        }
        setIsLoading(false);
      },
      () => {
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error: any) {
      Alert.alert('Logout failed', error?.message || 'Please try again.');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Profile</Text>

      <View style={styles.card}>
        <Text style={styles.name}>{profile?.name || 'User'}</Text>
        <Text style={styles.email}>{profile?.email || auth.currentUser?.email || 'No email'}</Text>

        <View style={styles.row}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Goal</Text>
            <Text style={styles.infoValue}>{profile?.goal || 'MAINTAIN'}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Activity</Text>
            <Text style={styles.infoValue}>{profile?.activityLevel || 'ACTIVE'}</Text>
          </View>
        </View>

        <View style={styles.infoBoxFull}>
          <Text style={styles.infoLabel}>Daily Calorie Target</Text>
          <Text style={styles.infoValue}>{profile?.dailyCalorieTarget || 2000} kcal</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.statsHeader}>📊 Your Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalMealsLogged}</Text>
            <Text style={styles.statLabel}>Meals Logged</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalCaloriesToday}</Text>
            <Text style={styles.statLabel}>Today (kcal)</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.weeklyAverage}</Text>
            <Text style={styles.statLabel}>Weekly Avg</Text>
          </View>
        </View>

        <View style={styles.macrosContainer}>
          <Text style={styles.macrosTitle}>🥗 Macros Today</Text>
          <View style={styles.macroBar}>
            <View style={[styles.macroSegment, styles.proteinSegment, { flex: Math.max(1, stats.macros.protein) }]}>
              <Text style={styles.macroText}>{Math.round(stats.macros.protein)}g</Text>
            </View>
            <View style={[styles.macroSegment, styles.carbsSegment, { flex: Math.max(1, stats.macros.carbs) }]}>
              <Text style={styles.macroText}>{Math.round(stats.macros.carbs)}g</Text>
            </View>
            <View style={[styles.macroSegment, styles.fatSegment, { flex: Math.max(1, stats.macros.fat) }]}>
              <Text style={styles.macroText}>{Math.round(stats.macros.fat)}g</Text>
            </View>
          </View>
          <View style={styles.macroLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, styles.proteinSegment]} />
              <Text style={styles.legendText}>Protein</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, styles.carbsSegment]} />
              <Text style={styles.legendText}>Carbs</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, styles.fatSegment]} />
              <Text style={styles.legendText}>Fat</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const q = query(collection(db, 'meals'), where('userId', '==', userId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mealsData: any[] = [];
      let totalCals = 0;
      let totalProtein = 0, totalCarbs = 0, totalFat = 0;

      const today = new Date().toISOString().split('T')[0];

      snapshot.forEach((doc) => {
        const data = doc.data();
        mealsData.push({ id: doc.id, ...data });

        if (data.timestamp?.startsWith(today)) {
          totalCals += data.calories || 0;
          totalProtein += data.macros?.protein || 0;
          totalCarbs += data.macros?.carbs || 0;
          totalFat += data.macros?.fat || 0;
        }
      });

      setStats({
        totalMealsLogged: mealsData.length,
        totalCaloriesToday: totalCals,
        weeklyAverage: Math.round(totalCals / 7),
        macros: { protein: totalProtein, carbs: totalCarbs, fat: totalFat },
      });
    });

    return () => unsubscribe();
  }, []);
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    paddingTop: 40,
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 30,
    color: colors.textPrimary,
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  name: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 24,
    color: colors.textPrimary,
  },
  email: {
    fontFamily: 'Outfit_400Regular',
    color: colors.textSecondary,
    marginTop: 4,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  infoBox: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  infoBoxFull: {
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    padding: 14,
  },
  infoLabel: {
    fontFamily: 'Outfit_400Regular',
    color: colors.textSecondary,
    fontSize: 13,
  },
  infoValue: {
    marginTop: 4,
    fontFamily: 'Outfit_700Bold',
    color: colors.textPrimary,
    fontSize: 15,
    divider: {
      height: 1,
      backgroundColor: '#e5e7eb',
      marginVertical: 16,
    },
    statsHeader: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 16,
      color: colors.textPrimary,
      marginBottom: 12,
    },
    statsGrid: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 16,
    },
    statBox: {
      flex: 1,
      backgroundColor: '#f9fafb',
      borderRadius: 14,
      padding: 12,
      alignItems: 'center',
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    statValue: {
      fontFamily: 'Outfit_700Bold',
      fontSize: 20,
      color: colors.primary,
    },
    statLabel: {
      fontFamily: 'Outfit_400Regular',
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    macrosContainer: {
      marginTop: 12,
      padding: 12,
      backgroundColor: '#f9fafb',
      borderRadius: 14,
    },
    macrosTitle: {
      fontFamily: 'Outfit_600SemiBold',
      color: colors.textPrimary,
      marginBottom: 10,
    },
    macroBar: {
      flexDirection: 'row',
      height: 24,
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 10,
    },
    macroSegment: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    proteinSegment: {
      backgroundColor: '#ef4444',
    },
    carbsSegment: {
      backgroundColor: colors.primary,
    },
    fatSegment: {
      backgroundColor: '#8b5cf6',
    },
    macroText: {
      fontFamily: 'Outfit_600SemiBold',
      fontSize: 10,
      color: '#fff',
    },
    macroLegend: {
      flexDirection: 'row',
      gap: 12,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    legendColor: {
      width: 10,
      height: 10,
      borderRadius: 2,
    },
    legendText: {
      fontFamily: 'Outfit_400Regular',
      fontSize: 12,
      color: colors.textSecondary,
    },
  },
  logoutBtn: {
    marginTop: 20,
    backgroundColor: '#111827',
    borderRadius: 26,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 15,
  },
});

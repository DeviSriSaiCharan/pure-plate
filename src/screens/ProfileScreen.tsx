import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc, collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebaseSetup';
import { logoutUser } from '../api/auth';
import { colors } from '../theme/colors';
import { User, Mail, LogOut, Utensils, Target, ChevronRight, Award } from 'lucide-react-native';
import { UserProfile } from '../types/schema';

const GOAL_LABELS: Record<string, string> = {
  LOSE_WEIGHT: '🎯 Lose Weight',
  MAINTAIN: '⚖️ Maintain Weight',
  GAIN_WEIGHT: '💪 Gain Weight',
};

const DIET_LABELS: Record<string, string> = {
  SOUTH_INDIAN: '🍛 South Indian',
  NORTH_INDIAN: '🫓 North Indian',
  VEGAN: '🌱 Vegan',
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [mealCount, setMealCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setIsLoading(false); return; }

    const fetchProfile = async () => {
      try {
        const profileDoc = await getDoc(doc(db, 'users', uid));
        if (profileDoc.exists()) setProfile(profileDoc.data() as UserProfile);

        // Count total meals
        const mealsRef = collection(db, `users/${uid}/meals`);
        const snapshot = await getDocs(mealsRef);
        setMealCount(snapshot.size);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await logoutUser();
              // RootNavigator's onAuthStateChanged will auto-navigate to Onboarding
            } catch (e) {
              Alert.alert('Error', 'Could not sign out. Try again.');
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (auth.currentUser?.email?.[0] || 'U').toUpperCase();

  const firstName = profile?.name?.split(' ')[0] || 'User';
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Avatar + Identity Card */}
        <View style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{profile?.name || 'User'}</Text>
          <Text style={styles.email}>{auth.currentUser?.email || ''}</Text>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{mealCount}</Text>
              <Text style={styles.statLabel}>Meals Logged</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {profile?.dailyCalorieTarget || 2000}
              </Text>
              <Text style={styles.statLabel}>Daily Goal kcal</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {profile?.goal ? GOAL_LABELS[profile.goal]?.split(' ')[0] : '🎯'}
              </Text>
              <Text style={styles.statLabel}>Goal</Text>
            </View>
          </View>
        </View>

        {/* Info Cards */}
        <Text style={styles.sectionLabel}>My Details</Text>

        <View style={styles.infoCard}>
          <InfoRow
            icon={<Target size={18} color={colors.primary} />}
            label="Health Goal"
            value={profile?.goal ? GOAL_LABELS[profile.goal] : 'Not set'}
          />
          <View style={styles.divider} />
          <InfoRow
            icon={<Utensils size={18} color={colors.primary} />}
            label="Diet Preference"
            value={profile?.culturalPreference ? DIET_LABELS[profile.culturalPreference] : 'Not set'}
          />
          <View style={styles.divider} />
          <InfoRow
            icon={<Award size={18} color={colors.primary} />}
            label="Activity Level"
            value={profile?.activityLevel === 'ACTIVE' ? '🏃 Active' : profile?.activityLevel === 'SEDENTARY' ? '🪑 Sedentary' : 'Not set'}
          />
        </View>

        <Text style={styles.sectionLabel}>Account</Text>

        <View style={styles.infoCard}>
          <InfoRow
            icon={<Mail size={18} color={colors.primary} />}
            label="Email"
            value={auth.currentUser?.email || ''}
          />
          <View style={styles.divider} />
          <InfoRow
            icon={<User size={18} color={colors.primary} />}
            label="Member Since"
            value={profile?.createdAt
              ? new Date(profile.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })
              : 'Recently joined'}
          />
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          disabled={isLoggingOut}
        >
          {isLoggingOut
            ? <ActivityIndicator color="#ef4444" />
            : <>
                <LogOut size={18} color="#ef4444" />
                <Text style={styles.logoutText}>Sign Out</Text>
              </>
          }
        </TouchableOpacity>

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 20, paddingTop: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { marginBottom: 20 },
  headerTitle: { fontFamily: 'Outfit_700Bold', fontSize: 28, color: colors.textPrimary },

  identityCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    alignItems: 'center', marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { fontFamily: 'Outfit_700Bold', fontSize: 28, color: '#fff' },
  name: { fontFamily: 'Outfit_700Bold', fontSize: 22, color: colors.textPrimary, marginBottom: 4 },
  email: { fontFamily: 'Outfit_400Regular', fontSize: 14, color: colors.textSecondary, marginBottom: 20 },
  statsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', paddingTop: 20, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  statItem: { alignItems: 'center' },
  statValue: { fontFamily: 'Outfit_700Bold', fontSize: 20, color: colors.textPrimary },
  statLabel: { fontFamily: 'Outfit_400Regular', fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: '#e5e7eb', height: '100%' },

  sectionLabel: { fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: colors.textSecondary, marginBottom: 10, marginLeft: 4 },

  infoCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 4, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  infoIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0fdf4',
    justifyContent: 'center', alignItems: 'center',
  },
  infoContent: { flex: 1 },
  infoLabel: { fontFamily: 'Outfit_400Regular', fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
  infoValue: { fontFamily: 'Outfit_600SemiBold', fontSize: 15, color: colors.textPrimary },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginHorizontal: 16 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#fecaca', borderRadius: 16, paddingVertical: 16,
    backgroundColor: '#fff5f5',
  },
  logoutText: { fontFamily: 'Outfit_600SemiBold', fontSize: 16, color: '#ef4444' },
});

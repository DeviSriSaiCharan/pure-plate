import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

export default function AnalyticsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <Text style={styles.sectionTitle}>My Activity</Text>
        
        <View style={styles.activityGrid}>
          {/* Main Completion Card */}
          <View style={[styles.card, styles.completionCard]}>
            <Text style={styles.statValue}>77%</Text>
            <Text style={styles.statLabel}>Completed</Text>
            <Text style={styles.coreTarget}>Core Target</Text>
            <Text style={styles.statContext}>Fitness focus</Text>
            {/* Visual Swoosh mock for background */}
            <View style={styles.swooshDecoration} />
          </View>

          <View style={styles.rightStats}>
            <View style={[styles.card, styles.smallStatCard, { backgroundColor: colors.primaryGradientStart }]}>
               <Text style={styles.statValue}>256 <Text style={styles.statUnit}>/kcal</Text></Text>
               <Text style={styles.statLabel}>Calories burn</Text>
               <View style={styles.chartBarsMock}>
                 <View style={[styles.bar, { height: 16 }]} />
                 <View style={[styles.bar, { height: 24 }]} />
                 <View style={[styles.bar, { height: 32 }]} />
               </View>
            </View>

            <View style={[styles.card, styles.smallStatCard]}>
               <Text style={styles.statValue}>03 <Text style={styles.statUnit}>/kg</Text></Text>
               <Text style={styles.statLabel}>Weight lose</Text>
               <View style={styles.chartBarsMock}>
                 <View style={[styles.bar, { height: 20, backgroundColor: colors.primaryGradientStart }]} />
                 <View style={[styles.bar, { height: 14, backgroundColor: colors.primaryGradientStart }]} />
                 <View style={[styles.bar, { height: 28, backgroundColor: colors.primaryGradientStart }]} />
               </View>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Tracking Stats</Text>

        {/* Workout Duration Box */}
        <View style={styles.card}>
           <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Workout Duration</Text>
                <Text style={styles.chartSubtitle}>Total Time Spent in training</Text>
              </View>
              <View style={styles.dropdown}>
                <Text style={styles.dropdownText}>Weekly ▾</Text>
              </View>
           </View>
           
           {/* Mock Bar Chart */}
           <View style={styles.mockBarChart}>
              {[20, 30, 40, 90, 60, 20, 40].map((height, index) => {
                const isActive = index === 3;
                return (
                  <View key={index} style={styles.mockBarCol}>
                    {isActive && (
                      <View style={styles.barTooltip}>
                        <Text style={styles.tooltipText}>70 min</Text>
                      </View>
                    )}
                    <View style={[styles.chartBar, { height }, isActive && styles.chartBarActive]} />
                    <Text style={styles.chartBarLabel}>{['Sat', 'Sun', 'Mon', 'Twe', 'Wed', 'Thu', 'Fri'][index]}</Text>
                  </View>
                );
              })}
           </View>
        </View>

        {/* Weight Journey Box */}
        <View style={styles.card}>
           <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>Weight Journey</Text>
                <Text style={styles.chartSubtitle}>Last 7 Days</Text>
              </View>
              <View style={styles.dropdown}>
                <Text style={styles.dropdownText}>Weekly ▾</Text>
              </View>
           </View>
        </View>

        {/* Spacer for bottom tabs */}
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
  sectionTitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 18,
    color: colors.textPrimary,
    marginBottom: 20,
    marginTop: 10,
  },
  activityGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  completionCard: {
    flex: 1.2,
    position: 'relative',
    overflow: 'hidden',
  },
  swooshDecoration: {
    position: 'absolute',
    right: -20,
    top: 50,
    width: 100,
    height: 100,
    backgroundColor: colors.primaryGradientStart,
    borderRadius: 50,
    opacity: 0.8,
  },
  rightStats: {
    flex: 1,
    gap: 16,
  },
  smallStatCard: {
    padding: 16,
    alignItems: 'flex-start',
    overflow: 'hidden',
  },
  statValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 24,
    color: colors.textPrimary,
  },
  statUnit: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
    color: colors.textSecondary,
  },
  statLabel: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  coreTarget: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: 30,
  },
  statContext: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
  },
  chartBarsMock: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'flex-end',
    height: 32,
    marginTop: 12,
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  bar: {
    width: 6,
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  chartTitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 16,
    color: colors.textPrimary,
  },
  chartSubtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  dropdown: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  dropdownText: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
  },
  mockBarChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 150,
  },
  mockBarCol: {
    alignItems: 'center',
    gap: 8,
  },
  chartBar: {
    width: 24,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
  },
  chartBarActive: {
    backgroundColor: colors.primaryGradientStart,
  },
  chartBarLabel: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 8,
  },
  barTooltip: {
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    position: 'absolute',
    top: -30,
  },
  tooltipText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Outfit_600SemiBold',
  }
});

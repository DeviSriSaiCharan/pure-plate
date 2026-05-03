import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function OnboardingScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Bito</Text>

        <View style={styles.imageContainer}>
          <Image 
            source={require('../../assets/avocado_mascot.png')} 
            style={styles.image}
            resizeMode="contain"
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.heading}>Track calories daily, reach your health goals</Text>
          <Text style={styles.subHeading}>
            This app simplifies nutrition and makes healthy living truly achievable.
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.buttonWrapper} 
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Auth')}
        >
          <LinearGradient
            colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Get Ready</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 42,
    color: '#345e2a',
    textAlign: 'center',
    marginTop: 20,
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: width * 0.8,
    height: width * 0.8,
  },
  textContainer: {
    marginBottom: 40,
  },
  heading: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 28,
    color: colors.textPrimary,
    lineHeight: 36,
    marginBottom: 12,
  },
  subHeading: {
    fontFamily: 'Outfit_400Regular',
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  buttonWrapper: {
    width: '100%',
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  button: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 18,
    color: colors.textPrimary,
  }
});

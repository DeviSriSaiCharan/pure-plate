import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { loginUser, registerUser } from '../api/auth';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../lib/firebaseSetup';

WebBrowser.maybeCompleteAuthSession();

type GoogleSignInSectionProps = {
  busy: boolean;
  setBusy: (value: boolean) => void;
};

function GoogleSignInSection({ busy, setBusy }: GoogleSignInSectionProps) {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    const signInFromGoogle = async () => {
      if (response?.type !== 'success') return;
      const idToken = response.authentication?.idToken;

      if (!idToken) {
        Alert.alert('Google Sign-In Error', 'Missing Google ID token. Check OAuth client setup.');
        return;
      }

      try {
        setBusy(true);
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
      } catch (error: any) {
        Alert.alert('Google Sign-In failed', error?.message || 'Please try again.');
      } finally {
        setBusy(false);
      }
    };

    signInFromGoogle();
  }, [response, setBusy]);

  return (
    <TouchableOpacity
      style={[styles.googleBtn, (!request || busy) && styles.googleBtnDisabled]}
      disabled={!request || busy}
      onPress={() => promptAsync()}
    >
      <Text style={styles.googleBtnText}>Continue with Google</Text>
    </TouchableOpacity>
  );
}

export default function AuthScreen({ navigation }: any) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const missingGoogleConfig =
    (Platform.OS === 'android' && !process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID) ||
    (Platform.OS === 'ios' && !process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);

  const handleAuth = async () => {
    if (!email || !password || (isSignUp && !name)) {
      Alert.alert('Missing details', 'Please fill all required fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (isSignUp) {
        await registerUser(email.trim(), password, name.trim());
      } else {
        await loginUser(email.trim(), password);
      }
    } catch (error: any) {
      Alert.alert('Authentication failed', error?.message || 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBlock}>
        <Text style={styles.brand}>Bito</Text>
        <Text style={styles.title}>{isSignUp ? 'Create your account' : 'Welcome back'}</Text>
        <Text style={styles.subTitle}>Your daily calorie tracker starts here.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, !isSignUp && styles.modeBtnActive]}
            onPress={() => setIsSignUp(false)}
          >
            <Text style={[styles.modeBtnText, !isSignUp && styles.modeBtnTextActive]}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeBtn, isSignUp && styles.modeBtnActive]}
            onPress={() => setIsSignUp(true)}
          >
            <Text style={[styles.modeBtnText, isSignUp && styles.modeBtnTextActive]}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {isSignUp ? (
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Full name"
            placeholderTextColor={colors.textSecondary}
          />
        ) : null}

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="Email"
          placeholderTextColor={colors.textSecondary}
        />

        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Password"
          placeholderTextColor={colors.textSecondary}
        />

        <TouchableOpacity style={styles.buttonWrapper} disabled={isSubmitting} onPress={handleAuth}>
          <LinearGradient
            colors={[colors.primaryGradientStart, colors.primaryGradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.button}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <Text style={styles.buttonText}>{isSignUp ? 'Create Account' : 'Sign In'}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {missingGoogleConfig ? (
          <Text style={styles.helperText}>
            Google login unavailable on {Platform.OS}. Missing EXPO_PUBLIC_GOOGLE_{Platform.OS.toUpperCase()}_CLIENT_ID.
          </Text>
        ) : (
          <GoogleSignInSection busy={isSubmitting} setBusy={setIsSubmitting} />
        )}

        <TouchableOpacity onPress={() => setIsSignUp((prev) => !prev)}>
          <Text style={styles.switchText}>
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  headerBlock: {
    marginTop: 12,
    marginBottom: 28,
  },
  brand: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 42,
    color: '#345e2a',
    marginBottom: 6,
  },
  title: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 30,
    color: colors.textPrimary,
  },
  subTitle: {
    marginTop: 6,
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
    color: colors.textSecondary,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
  },
  modeBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: '#fff',
  },
  modeBtnText: {
    fontFamily: 'Outfit_600SemiBold',
    color: colors.textSecondary,
  },
  modeBtnTextActive: {
    color: colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 12,
    fontFamily: 'Outfit_400Regular',
    fontSize: 16,
    color: colors.textPrimary,
  },
  buttonWrapper: {
    marginTop: 8,
    width: '100%',
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
  },
  button: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: 17,
    color: colors.textPrimary,
  },
  googleBtn: {
    marginTop: 10,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  googleBtnDisabled: {
    opacity: 0.5,
  },
  googleBtnText: {
    fontFamily: 'Outfit_600SemiBold',
    color: colors.textPrimary,
    fontSize: 15,
  },
  helperText: {
    marginTop: 14,
    textAlign: 'center',
    fontFamily: 'Outfit_400Regular',
    fontSize: 12,
    color: '#b45309',
  },
  switchText: {
    marginTop: 18,
    textAlign: 'center',
    color: colors.textPrimary,
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
  },
  backText: {
    marginTop: 10,
    textAlign: 'center',
    color: colors.textSecondary,
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
  },
});

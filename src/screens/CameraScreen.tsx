import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Alert, TextInput, ScrollView, Modal, Animated
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '../theme/colors';
import { X, Camera as CameraIcon, Barcode, ScanLine, Scale, ChevronDown } from 'lucide-react-native';
import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '../lib/firebaseSetup';
import { logFoodItem } from '../api/meals';
import { Meal } from '../types/schema';

// Condiment/packaged-food keywords — always ask serving grams for these
const CONDIMENT_KEYWORDS = [
  'mayonnaise', 'mayo', 'ketchup', 'sauce', 'jam', 'jelly', 'butter',
  'ghee', 'oil', 'dressing', 'vinegar', 'mustard', 'honey', 'syrup',
  'paste', 'chutney', 'pickle', 'spread', 'cream', 'cheese'
];

const SOFT_DRINK_KEYWORDS = [
  'cola', 'soda', 'pepsi', 'coke', 'sprite', 'fanta', 'energy drink',
  'mountain dew', 'juice', 'lemonade', 'iced tea', 'soft drink'
];

function needsServingInput(foodName: string): boolean {
  const lower = foodName.toLowerCase();
  return CONDIMENT_KEYWORDS.some(k => lower.includes(k));
}

function isSoftDrink(foodName: string): boolean {
  const lower = foodName.toLowerCase();
  return SOFT_DRINK_KEYWORDS.some(k => lower.includes(k));
}

// Scale nutrition values per 100g to actual grams
function scaleNutrition(result: any, grams: number): any {
  const factor = grams / 100;
  return {
    ...result,
    calories: Math.round(Number(result.calories) * factor),
    macros: {
      protein: Math.round(Number(result.macros?.protein || 0) * factor),
      carbs: Math.round(Number(result.macros?.carbs || 0) * factor),
      fats: Math.round(Number(result.macros?.fats || result.macros?.fat || 0) * factor),
    }
  };
}

export default function CameraScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [isBarcodeMode, setIsBarcodeMode] = useState(false);

  // Serving size modal state
  const [showServingModal, setShowServingModal] = useState(false);
  const [servingGrams, setServingGrams] = useState('15');
  const [pendingResult, setPendingResult] = useState<any>(null);

  if (!permission) return <View />;

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Camera permission is needed to scan food</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePictureAndAnalyze = async () => {
    if (!cameraRef.current) return;
    try {
      setIsProcessing(true);
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.1 });
      if (!photo?.base64) throw new Error('Failed to capture image');

      const analyzeMealFn = httpsCallable(functions, 'analyzeMealWithGemini');
      const response: any = await analyzeMealFn({ base64Image: photo.base64, mimeType: 'image/jpeg' });
      const mealResult = response.data.result;
      if (!mealResult || !mealResult.foodName) throw new Error('Gemini returned invalid format.');

      // If it's a soft drink, add an extra warning
      if (isSoftDrink(mealResult.foodName) && !mealResult.warningMessage) {
        mealResult.warningMessage = '⚠️ Soft drinks are high in sugar with zero nutritional value. Consider water or a healthier alternative.';
        mealResult.isUnhealthy = true;
      }

      setResult(mealResult);
    } catch (error: any) {
      Alert.alert('Analysis Failed', error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBarcodeScanned = async ({ data }: any) => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${data}.json`);
      const json = await response.json();
      if (json.status !== 1) throw new Error('Product not found in global database.');

      const product = json.product;
      const foodName = product.product_name || 'Unknown Packaged Food';
      const cals100g = product.nutriments?.['energy-kcal_100g'] || 0;
      const protein100g = product.nutriments?.proteins_100g || 0;
      const carbs100g = product.nutriments?.carbohydrates_100g || 0;
      const fat100g = product.nutriments?.fat_100g || 0;

      const baseResult = {
        foodName,
        calories: Math.round(cals100g),
        macros: {
          protein: Math.round(protein100g),
          carbs: Math.round(carbs100g),
          fats: Math.round(fat100g),
        },
        isUnhealthy: isSoftDrink(foodName),
        isRawIngredient: false,
        warningMessage: isSoftDrink(foodName)
          ? '⚠️ Soft drinks have high sugar and no nutritional value. Consider a healthier option.'
          : null,
        _per100g: true, // flag so we know values are per 100g
      };

      // For condiments/packaged foods, show serving size picker
      if (needsServingInput(foodName)) {
        setPendingResult(baseResult);
        setShowServingModal(true);
      } else {
        // Standard packaged food: warn and show
        setResult({
          ...baseResult,
          warningMessage: baseResult.warningMessage ||
            '📦 Packaged food values are per 100g. Adjust the fields for your actual portion.',
        });
      }
    } catch (err: any) {
      Alert.alert('Barcode Error', err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmServing = () => {
    const grams = parseFloat(servingGrams);
    if (isNaN(grams) || grams <= 0) {
      Alert.alert('Invalid input', 'Please enter a valid number of grams.');
      return;
    }
    const scaled = scaleNutrition(pendingResult, grams);
    setResult({
      ...scaled,
      warningMessage: `✅ Values scaled to ${grams}g portion. Edit below if needed.`,
    });
    setShowServingModal(false);
    setPendingResult(null);
  };

  const logMeal = async () => {
    if (!auth.currentUser) {
      Alert.alert('Not signed in', 'Please sign in to log meals.');
      return;
    }
    if (result.isRawIngredient) {
      Alert.alert('Cannot Log', 'Raw ingredients cannot be logged as a meal. Please prepare the dish first.');
      return;
    }

    try {
      setIsProcessing(true);
      const today = new Date().toISOString().split('T')[0];

      const mealData: Omit<Meal, 'id' | 'userId' | 'dailyLogId' | 'createdAt'> = {
        name: result.foodName,
        mealType: result.mealType || 'SNACK',
        calories: Number(result.calories) || 0,
        protein: Number(result.macros?.protein) || 0,
        carbs: Number(result.macros?.carbs) || 0,
        fats: Number(result.macros?.fats || result.macros?.fat) || 0,
        estimatedByAI: result.estimatedByAI ?? true,
      };

      await logFoodItem(mealData, today);

      Alert.alert('Logged! 🎉', `${result.foodName} added to today's diary.`);
      setResult(null);
      navigation.goBack();
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message || 'Could not save meal.');
      setIsProcessing(false);
    }
  };

  // --- Result Review Screen ---
  if (result) {
    const isWarning = result.isUnhealthy && !result.isRawIngredient;
    const isDanger = result.isRawIngredient;
    const isInfo = !result.isUnhealthy && !result.isRawIngredient && result.warningMessage;

    return (
      <View style={styles.center}>
        <ScrollView contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>

          {/* Warning / Info Banner */}
          {result.warningMessage ? (
            <View style={[
              styles.warningBanner,
              isDanger && styles.dangerBanner,
              isWarning && styles.warningBannerYellow,
              isInfo && styles.infoBanner,
            ]}>
              <Text style={[
                styles.warningText,
                isDanger && styles.dangerText,
                isInfo && styles.infoText,
              ]}>
                {result.warningMessage}
              </Text>
            </View>
          ) : null}

          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Meal Identified ✨</Text>

            {/* Food Name — Editable */}
            <Text style={styles.fieldLabel}>Food Name</Text>
            <TextInput
              style={styles.foodNameInput}
              value={result.foodName}
              onChangeText={(text) => setResult({ ...result, foodName: text })}
            />

            {/* Macro Row — Editable */}
            <View style={styles.macroRow}>
              {[
                { label: 'kcal', key: 'calories', top: true },
                { label: 'Protein', key: 'protein', nested: true },
                { label: 'Carbs', key: 'carbs', nested: true },
                { label: 'Fat', key: 'fats', nested: true },
              ].map((item) => (
                <View key={item.label} style={styles.macroBox}>
                  <TextInput
                    style={styles.macroValue}
                    keyboardType="numeric"
                    value={String(item.top ? (result.calories || 0) : (result.macros?.[item.key] || 0))}
                    onChangeText={(text) => {
                      if (item.top) {
                        setResult({ ...result, calories: text });
                      } else {
                        setResult({ ...result, macros: { ...result.macros, [item.key]: text } });
                      }
                    }}
                  />
                  <Text style={styles.macroLabel}>{item.label}</Text>
                </View>
              ))}
            </View>

            {/* Suggestion for condiment-style foods */}
            {needsServingInput(result.foodName) && (
              <View style={styles.suggestionBox}>
                <Scale size={16} color={colors.primary} />
                <Text style={styles.suggestionText}>
                  Typical serving for {result.foodName}: 15–30g. Adjust the values above if your portion differs.
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <TouchableOpacity
              style={[styles.logButton, (result.isRawIngredient || isProcessing) && styles.disabledButton]}
              onPress={logMeal}
              disabled={result.isRawIngredient || isProcessing}
            >
              {isProcessing
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.logButtonText}>
                    {result.isRawIngredient ? 'Cannot Log Raw Ingredient' : 'Log Meal →'}
                  </Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.discardBtn} onPress={() => setResult(null)}>
              <Text style={styles.discardText}>Discard & Scan Again</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Serving Size Modal */}
        <Modal visible={showServingModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>How much did you use?</Text>
              <Text style={styles.modalSubtitle}>
                Nutritional values for {pendingResult?.foodName} are per 100g.{'\n'}Enter your portion in grams.
              </Text>
              <View style={styles.modalInputRow}>
                <TextInput
                  style={styles.gramsInput}
                  keyboardType="numeric"
                  value={servingGrams}
                  onChangeText={setServingGrams}
                  autoFocus
                />
                <Text style={styles.gramsLabel}>grams</Text>
              </View>
              <View style={styles.modalSuggestions}>
                {['5', '15', '30', '50'].map((g) => (
                  <TouchableOpacity key={g} style={styles.servingChip} onPress={() => setServingGrams(g)}>
                    <Text style={styles.servingChipText}>{g}g</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.logButton} onPress={confirmServing}>
                <Text style={styles.logButtonText}>Calculate & Continue →</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowServingModal(false); setResult(pendingResult); }}>
                <Text style={styles.discardText}>Skip — Use 100g values</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // --- Camera View ---
  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        ref={cameraRef}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['upc_a', 'upc_e', 'ean13', 'ean8', 'qr'] }}
        onBarcodeScanned={isBarcodeMode ? handleBarcodeScanned : undefined}
      />

      <SafeAreaView style={styles.overlay}>
        {/* Top Controls */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <X size={22} color="#FFF" />
          </TouchableOpacity>

          <Text style={styles.modeLabel}>
            {isBarcodeMode ? '📦 Barcode Mode' : '🤖 AI Vision Mode'}
          </Text>

          <TouchableOpacity
            onPress={() => setIsBarcodeMode(!isBarcodeMode)}
            style={[styles.modeToggle, isBarcodeMode && styles.modeToggleActive]}
          >
            {isBarcodeMode
              ? <Barcode size={20} color="#000" />
              : <ScanLine size={20} color="#FFF" />
            }
          </TouchableOpacity>
        </View>

        {/* Scan Frame Guide */}
        <View style={styles.frameGuide}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
        </View>

        {/* Bottom Controls */}
        <View style={styles.bottomBar}>
          {!isBarcodeMode ? (
            <TouchableOpacity
              style={[styles.captureBtn, isProcessing && styles.captureBtnBusy]}
              onPress={takePictureAndAnalyze}
              disabled={isProcessing}
            >
              {isProcessing
                ? <ActivityIndicator color={colors.primary} size="large" />
                : <View style={styles.captureInner}><CameraIcon size={30} color="#000" /></View>
              }
            </TouchableOpacity>
          ) : (
            <View style={styles.barcodeHint}>
              <Text style={styles.barcodeHintText}>
                {isProcessing ? 'Looking up product...' : 'Point at a barcode to scan automatically'}
              </Text>
            </View>
          )}
          {isProcessing && !isBarcodeMode && (
            <Text style={styles.processingText}>Asking Gemini AI...</Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { ...StyleSheet.absoluteFillObject },
  center: { flex: 1, backgroundColor: colors.background },
  text: { fontSize: 16, fontFamily: 'Outfit_400Regular', color: colors.textPrimary, marginBottom: 20, textAlign: 'center' },
  permissionButton: { backgroundColor: colors.primary, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 24 },
  permissionText: { fontFamily: 'Outfit_600SemiBold', fontSize: 16, color: '#fff' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', zIndex: 10 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16,
  },
  iconBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  modeLabel: {
    color: '#fff', fontFamily: 'Outfit_600SemiBold', fontSize: 15,
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  modeToggle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  modeToggleActive: { backgroundColor: colors.primary },
  frameGuide: {
    width: 240, height: 240, alignSelf: 'center',
    position: 'relative', marginTop: 'auto', marginBottom: 'auto',
  },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#fff', borderWidth: 3 },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  bottomBar: { paddingBottom: 44, alignItems: 'center', gap: 12 },
  captureBtn: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: '#fff',
  },
  captureBtnBusy: { backgroundColor: 'rgba(0,0,0,0.4)', borderColor: 'transparent' },
  captureInner: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  barcodeHint: {
    paddingHorizontal: 24, paddingVertical: 14,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 24, marginHorizontal: 40,
  },
  barcodeHintText: { color: '#fff', fontFamily: 'Outfit_400Regular', fontSize: 14, textAlign: 'center' },
  processingText: {
    color: '#fff', fontFamily: 'Outfit_600SemiBold', fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },

  // Result screen
  resultScroll: { padding: 24, paddingTop: 48, paddingBottom: 40 },
  warningBanner: {
    borderRadius: 16, padding: 16, marginBottom: 16,
    backgroundColor: '#fef3c7', borderLeftWidth: 4, borderLeftColor: '#f59e0b',
  },
  warningBannerYellow: { backgroundColor: '#fef3c7', borderLeftColor: '#f59e0b' },
  dangerBanner: { backgroundColor: '#fee2e2', borderLeftColor: '#ef4444' },
  infoBanner: { backgroundColor: '#e0f2fe', borderLeftColor: '#0ea5e9' },
  warningText: { fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: '#92400e', lineHeight: 20 },
  dangerText: { color: '#7f1d1d' },
  infoText: { color: '#0c4a6e' },
  resultCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  resultTitle: {
    fontFamily: 'Outfit_700Bold', fontSize: 22, color: colors.textPrimary, marginBottom: 20, textAlign: 'center',
  },
  fieldLabel: { fontFamily: 'Outfit_400Regular', fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
  foodNameInput: {
    fontFamily: 'Outfit_600SemiBold', fontSize: 18, color: colors.textPrimary,
    borderBottomWidth: 1.5, borderBottomColor: colors.primary,
    paddingBottom: 8, marginBottom: 24, textAlign: 'center',
  },
  macroRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  macroBox: {
    flex: 1, backgroundColor: '#f9fafb', borderRadius: 14, padding: 12, alignItems: 'center',
  },
  macroValue: {
    fontFamily: 'Outfit_700Bold', fontSize: 18, color: colors.textPrimary,
    textAlign: 'center', minWidth: 36,
  },
  macroLabel: { fontFamily: 'Outfit_400Regular', fontSize: 11, color: colors.textSecondary, marginTop: 4 },
  suggestionBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12, marginBottom: 20,
  },
  suggestionText: { fontFamily: 'Outfit_400Regular', fontSize: 13, color: '#166534', flex: 1, lineHeight: 18 },
  logButton: {
    backgroundColor: colors.primary, borderRadius: 24, paddingVertical: 16,
    alignItems: 'center', marginBottom: 12,
  },
  logButtonText: { fontFamily: 'Outfit_700Bold', fontSize: 16, color: '#fff' },
  disabledButton: { backgroundColor: '#d1d5db' },
  discardBtn: { alignItems: 'center', paddingVertical: 8 },
  discardText: { fontFamily: 'Outfit_400Regular', fontSize: 14, color: colors.textSecondary },

  // Serving size modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 28, paddingBottom: 48,
  },
  modalTitle: { fontFamily: 'Outfit_700Bold', fontSize: 22, color: colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  modalSubtitle: { fontFamily: 'Outfit_400Regular', fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  modalInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 16 },
  gramsInput: {
    borderWidth: 2, borderColor: colors.primary, borderRadius: 16,
    paddingHorizontal: 20, paddingVertical: 12,
    fontFamily: 'Outfit_700Bold', fontSize: 28, color: colors.textPrimary,
    minWidth: 100, textAlign: 'center',
  },
  gramsLabel: { fontFamily: 'Outfit_600SemiBold', fontSize: 18, color: colors.textSecondary },
  modalSuggestions: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  servingChip: {
    borderWidth: 1.5, borderColor: colors.primary, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  servingChipText: { fontFamily: 'Outfit_600SemiBold', fontSize: 14, color: colors.primary },
});

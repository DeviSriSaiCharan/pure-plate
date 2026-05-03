import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '../theme/colors';
import { X, Camera as CameraIcon, Barcode, ScanLine } from 'lucide-react-native';
import { httpsCallable } from 'firebase/functions';
import { functions, db, auth } from '../lib/firebaseSetup';
import { collection, addDoc } from 'firebase/firestore';

export default function CameraScreen({ navigation }: any) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // Toggle between generic AI vision and Barcode mode
  const [isBarcodeMode, setIsBarcodeMode] = useState(false);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>We need your permission to show the camera</Text>
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
      
      const photo = await cameraRef.current.takePictureAsync({ 
        base64: true,
        quality: 0.1 
      });

      if (!photo?.base64) {
        throw new Error("Failed to capture image base64 data");
      }

      const analyzeMealWithGemini = httpsCallable(functions, 'analyzeMealWithGemini');
      const response: any = await analyzeMealWithGemini({
        base64Image: photo.base64,
        mimeType: 'image/jpeg'
      });

      const mealResult = response.data.result;
      
      if (!mealResult || !mealResult.foodName) {
        throw new Error("Gemini returned an invalid meal format.");
      }

      setResult(mealResult);
    } catch (error: any) {
      console.error(error);
      Alert.alert("Analysis Failed", error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBarcodeScanned = async ({ type, data }: any) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      // Free OpenFoodFacts API for global barcodes
      const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${data}.json`);
      const json = await response.json();
      
      if (json.status !== 1) {
          throw new Error("Product not found in global database.");
      }

      const product = json.product;
      const foodName = product.product_name || 'Unknown Packaged Food';
      const calories = product.nutriments?.['energy-kcal_100g'] || 0; 
      const protein = product.nutriments?.proteins_100g || 0;
      const carbs = product.nutriments?.carbohydrates_100g || 0;
      
      setResult({
          foodName,
          calories: Math.round(calories),
          macros: { protein: Math.round(protein), carbs: Math.round(carbs), fats: 0 },
          isUnhealthy: false,
          isRawIngredient: false,
          warningMessage: "Packaged food detected. Values are per 100g. Please adjust for your serving size!"
      });
    } catch (err: any) {
        Alert.alert("Barcode Error", err.message);
    } finally {
        setIsProcessing(false);
    }
  };

  const logMealToFirestore = async () => {
    const userId = auth.currentUser?.uid || "demo-capstone-user";
    
    if (result.isRawIngredient) {
      Alert.alert("Warning", "You cannot log raw ingredients as a meal. Please prepare it first!");
      return;
    }

    try {
      setIsProcessing(true);
      await addDoc(collection(db, 'meals'), {
        userId: userId,
        foodName: result.foodName,
        calories: Number(result.calories),
        macros: {
          protein: Number(result.macros?.protein || 0),
          carbs: Number(result.macros?.carbs || 0),
        },
        timestamp: new Date().toISOString()
      });
      
      Alert.alert("Success!", `${result.foodName} has been logged.`);
      setResult(null);
      navigation.goBack();
    } catch(err) {
      console.error(err);
      Alert.alert("Error", "Could not save meal manually.");
      setIsProcessing(false);
    }
  };

  if (result) {
    return (
      <View style={styles.center}>
        <View style={styles.resultCard}>
          {result.warningMessage ? (
             <View style={[styles.warningBanner, result.isRawIngredient ? styles.dangerBanner : null]}>
               <Text style={styles.warningText}>{result.warningMessage}</Text>
             </View>
          ) : null}

          <Text style={styles.resultTitle}>Meal Identified!</Text>
          
          <TextInput 
            style={styles.foodNameInput} 
            value={result.foodName}
            onChangeText={(text) => setResult({ ...result, foodName: text })}
          />
          
          <View style={styles.macroRow}>
            <View style={styles.macroBox}>
              <TextInput 
                style={styles.macroValue} 
                keyboardType="numeric"
                value={String(result.calories || 0)}
                onChangeText={(text) => setResult({ ...result, calories: text })}
              />
              <Text style={styles.macroLabel}>kcal</Text>
            </View>
            <View style={styles.macroBox}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <TextInput 
                  style={styles.macroValue} 
                  keyboardType="numeric"
                  value={String(result.macros?.protein || 0)}
                  onChangeText={(text) => setResult({ ...result, macros: { ...result.macros, protein: text } })}
                />
                <Text style={styles.macroValue}>g</Text>
              </View>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={styles.macroBox}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <TextInput 
                  style={styles.macroValue} 
                  keyboardType="numeric"
                  value={String(result.macros?.carbs || 0)}
                  onChangeText={(text) => setResult({ ...result, macros: { ...result.macros, carbs: text } })}
                />
                <Text style={styles.macroValue}>g</Text>
              </View>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.permissionButton, result.isRawIngredient && styles.disabledButton]} 
            onPress={logMealToFirestore}
            disabled={result.isRawIngredient || isProcessing}
          >
            {isProcessing ? <ActivityIndicator color="#fff" /> : <Text style={styles.permissionText}>Log Meal</Text>}
          </TouchableOpacity>
          
          <TouchableOpacity style={{ marginTop: 16 }} onPress={() => setResult(null)}>
            <Text style={{ color: colors.textSecondary }}>Discard & Scan Another</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView 
        style={styles.camera} 
        ref={cameraRef} 
        facing="back" 
        barcodeScannerSettings={{
          barcodeTypes: ["upc_a", "upc_e", "ean13", "ean8", "qr"],
        }}
        onBarcodeScanned={isBarcodeMode ? handleBarcodeScanned : undefined}
      />
      
      <SafeAreaView style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <X size={24} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setIsBarcodeMode(!isBarcodeMode)} 
            style={[styles.modeToggleBtn, isBarcodeMode && styles.modeToggleActive]}
          >
            {isBarcodeMode ? <Barcode size={24} color="#000" /> : <ScanLine size={24} color="#FFF" />}
            <Text style={[styles.modeToggleText, isBarcodeMode && {color: '#000'}]}>
              {isBarcodeMode ? "Barcode" : "AI Vision"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          {!isBarcodeMode && (
            <TouchableOpacity 
              style={[styles.captureBtn, isProcessing && styles.captureBtnDisabled]} 
              onPress={takePictureAndAnalyze}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color={colors.primary} size="large" />
              ) : (
                <View style={styles.captureInner}>
                  <CameraIcon size={32} color="#000" />
                </View>
              )}
            </TouchableOpacity>
          )}

          {isProcessing && <Text style={styles.loadingText}>Analyzing...</Text>}
          {isBarcodeMode && !isProcessing && (
             <View style={styles.barcodeScanArea}>
                <Text style={styles.loadingText}>Point camera at barcode...</Text>
             </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { ...StyleSheet.absoluteFillObject },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: 24 },
  text: { fontSize: 16, fontFamily: 'Outfit_400Regular', color: colors.textPrimary, marginBottom: 16 },
  permissionButton: { backgroundColor: colors.primaryGradientStart, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 24 },
  disabledButton: { backgroundColor: '#ccc' },
  permissionText: { fontFamily: 'Outfit_600SemiBold', fontSize: 16 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8
  },
  modeToggleActive: {
    backgroundColor: colors.primary,
  },
  modeToggleText: {
    color: '#FFF',
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14
  },
  footer: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureBtnDisabled: {
    borderColor: 'transparent',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFF',
    fontFamily: 'Outfit_600SemiBold',
    marginTop: 16,
    fontSize: 16,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  barcodeScanArea: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 20
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  warningBanner: {
    backgroundColor: '#fef08a',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%'
  },
  dangerBanner: {
    backgroundColor: '#fecdd3'
  },
  warningText: {
    color: '#7f1d1d',
    fontFamily: 'Outfit_600SemiBold',
    fontSize: 14,
    textAlign: 'center'
  },
  resultTitle: { fontFamily: 'Outfit_700Bold', fontSize: 24, color: colors.primaryGradientStart, marginBottom: 8 },
  foodNameInput: { 
    fontFamily: 'Outfit_600SemiBold', 
    fontSize: 18, 
    color: colors.textPrimary, 
    textAlign: 'center', 
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    minWidth: 200,
    paddingBottom: 4
  },
  macroRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  macroBox: { backgroundColor: '#f3f4f6', padding: 12, borderRadius: 12, alignItems: 'center', flex: 1 },
  macroValue: { 
    fontFamily: 'Outfit_700Bold', 
    fontSize: 18, 
    color: colors.textPrimary,
    minWidth: 40,
    textAlign: 'center'
  },
  macroLabel: { fontFamily: 'Outfit_400Regular', fontSize: 12, color: colors.textSecondary }
});

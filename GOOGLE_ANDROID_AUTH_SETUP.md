# Google Android OAuth Setup Guide

## The Error: What It Means

When you see this warning in the AuthScreen:
```
Google login unavailable on android. Missing EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID.
```

**It means:** Your app is running on Android, but the Android-specific OAuth credential from Google isn't configured yet. The web and iOS OAuth clients are different from Android, so you need to set this up separately.

---

## Step-by-Step Setup

### 1. Extract Debug Keystore SHA-1 Hash

First, generate or find your Android debug keystore and extract the SHA-1 fingerprint.

**On macOS/Linux:**
```bash
cd ~/.android
keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**On Windows:**
```bash
cd C:\Users\YOUR_USERNAME\.android
keytool -list -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**Expected output includes a line like:**
```
SHA1: AB:CD:EF:12:34:56:78:90:AB:CD:EF:12:34:56:78:90:AB:CD:EF:12
```

> **Note:** If you don't have a debug.keystore, Android will create one automatically when you build your app. Try building first, then run the keytool command above.

---

### 2. Add Android App to Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **caloriemagic-capstone**
3. Click **Project Settings** (gear icon, top-left)
4. Go to **Your Apps** tab
5. Click **Add App** → Select **Android**

Fill in the form:
- **Android package name:** `com.pavankotti.tempapp`
- **SHA-1 certificate fingerprint:** Paste the SHA-1 you extracted above (format: `AB:CD:EF:...`)

6. Click **Register App**
7. Skip the "Download config file" step (Expo handles this automatically)

---

### 3. Generate Android OAuth Credential in Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: **caloriemagic-capstone**
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Choose **Android** as the application type
6. Fill in:
   - **Package name:** `com.pavankotti.tempapp`
   - **SHA-1 fingerprint:** Paste the same SHA-1 from step 1

7. Click **Create**
8. You'll see a **Client ID** like: `123456789-abcd1234.apps.googleusercontent.com`
   - **Copy this value** (you'll need it in the next step)

---

### 4. Set the Environment Variable

Create or update a `.env` file in your project root:

```bash
cat > /home/pavan/Desktop/capstone-project/.env << 'EOF'
EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID=695083153236-1bevnkmioimsncnh0ikfm8vvcldr3fj4.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_ios_client_id_here.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=YOUR_ANDROID_CLIENT_ID_FROM_STEP_3.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id_here.apps.googleusercontent.com
```

Replace `YOUR_ANDROID_CLIENT_ID_FROM_STEP_3` with the actual Android Client ID from Google Cloud.

---

### 5. Verify in AuthScreen

The warning should disappear when you:

1. **Rebuild the app:**
   ```bash
   npx expo run:android
   ```

2. **Or reload if using Expo Go:**
   - The app will automatically detect the new env variable
   - Press `r` in the terminal to reload

---

## How Android OAuth Works in Bito

**AuthScreen.tsx** uses `expo-auth-session` to handle Google login:

```typescript
const [request, response, promptAsync] = Google.useAuthRequest({
  clientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,  // ← This one
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});
```

Each platform needs its own Client ID because:
- **Web**: Uses browser-based OAuth redirect
- **iOS**: Uses Apple's authentication framework
- **Android**: Uses Android's authentication framework

The app automatically detects which platform you're on and uses the right credential.

---

## Troubleshooting

### "Client Id property `androidClientId` must be defined"
- Your `.env` file is missing `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`
- Verify the file exists and has the right value
- Restart the Expo dev server

### "SHA-1 fingerprint doesn't match"
- Make sure you extracted the SHA-1 **from your actual debug.keystore**
- Don't confuse it with release keystore (that's different)
- Update Firebase and Google Cloud with the correct hash

### "Build still fails after setting env var"
- Clear Expo cache: `npx expo start --clear`
- Remove `.env` cache: `rm -rf ~/.expo`
- Rebuild: `npx expo run:android`

---

## Summary

✅ Extract SHA-1 from debug keystore  
✅ Register Android app in Firebase  
✅ Create Android OAuth credential in Google Cloud  
✅ Set `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` in `.env`  
✅ Rebuild the app  

Your Android Google login will now work! 🎉

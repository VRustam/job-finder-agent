# App Store Deployment Steps

This guide provides step-by-step instructions to deploy your Flutter iOS application to the Apple App Store.

---

### Step 1: Create a App Record on App Store Connect
1. Log in to [developer.apple.com](https://developer.apple.com):
   - Go to **Certificates, Identifiers & Profiles** -> **Identifiers**.
   - Register a new **App ID** with:
     - **Description:** Career Agent
     - **Bundle ID (Explicit):** `com.aicareeragent.mobile`
2. Log in to [App Store Connect](https://appstoreconnect.apple.com):
   - Go to **Apps** -> Click **"+" (New App)**.
   - Set the Platform to **iOS**, name your app, choose **com.aicareeragent.mobile** as the Bundle ID, and click **Create**.

---

### Step 2: Configure Xcode Project Signing
1. Open the `/ios/Runner.xcodeproj` in Xcode.
2. Select **Runner** in the file explorer, then open the **Signing & Capabilities** tab.
3. Select your **Developer Team** (ID `5T85YGWT33`) and ensure **Automatically manage signing** is checked.
4. Verify the Bundle Identifier matches `com.aicareeragent.mobile`.

---

### Step 3: Build the iOS Release Package
In the project root or terminal, run the following commands:
```bash
cd apps/mobile
flutter clean
flutter pub get
cd ios
pod install
cd ..
flutter build ipa
```

---

### Step 4: Archive and Upload via Xcode
1. In Xcode, set the build target to **Any iOS Device (arm64)**.
2. Select **Product** -> **Archive** from the top menu.
3. In the Organizer window that opens, select the latest archive and click **Distribute App**.
4. Choose **App Store Connect** -> **Upload** and follow the prompts to send the build to Apple.

---

### Step 5: TestFlight and Submission
1. In App Store Connect, go to **TestFlight** to invite internal testers.
2. Go to the **App Store** tab, fill in the metadata (screenshots, descriptions, privacy policy link), select the uploaded Build, and click **Submit for Review**.

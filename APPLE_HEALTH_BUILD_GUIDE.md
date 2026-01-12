# Apple Health Integration - Build Guide

## Issue: Native Module Error

If you see the error "Native module error: undefined is not a function" when toggling Apple Health, this means the app is running on a preview build that doesn't include the compiled native HealthKit module.

## Why This Happens

The `react-native-health` package includes native iOS code (Objective-C/Swift) that must be compiled into the app binary. This requires:

1. **Native compilation** - The iOS native code must be built with Xcode
2. **CocoaPods linking** - The RCTAppleHealthKit module must be linked
3. **EAS Build** - Expo's managed workflow requires EAS Build to compile native modules

Preview builds from **launch.expo.dev** and **Expo Go** do NOT support native modules like Apple Health because they use a pre-compiled runtime without your custom native code.

## Solution: Build with EAS

### Step 1: Push Code to GitHub

Your code is automatically pushed from Bolt.new to GitHub, so this step is already done!

### Step 2: Build with EAS Build

You have two options:

#### Option A: Use EAS CLI (Recommended)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to your Expo account
eas login

# Build for iOS (development build for testing)
eas build --platform ios --profile development

# Or build for TestFlight
eas build --platform ios --profile preview
```

#### Option B: Use Expo's Build Service

1. Go to https://expo.dev
2. Navigate to your project
3. Click "Builds" in the left sidebar
4. Click "Create a build"
5. Select iOS
6. Choose "preview" profile (for TestFlight)
7. Wait for the build to complete (15-30 minutes)

### Step 3: Install on iPhone

**For Development Builds:**
- Download the build from EAS and install via Xcode
- Or use the QR code to install directly on a registered device

**For TestFlight:**
- Submit to TestFlight after build completes: `eas submit --platform ios`
- Install TestFlight app on iPhone
- Open TestFlight and install NatureUP Health
- Apple Health will now work correctly!

## Verification

After installing the EAS-built app:

1. Open the app and go to Profile
2. Toggle Apple Health ON
3. You should see the iOS system permissions dialog
4. Grant permissions
5. Apple Health should connect successfully
6. You'll see your activity data (steps, distance, calories)

## Configuration (Already Done)

The following configuration is already in place in this project:

### app.json
- HealthKit entitlements enabled
- Info.plist permissions set
- react-native-health plugin configured

### services/apple-health.ts
- Comprehensive error handling
- Native module availability checks
- Clear error messages guiding users to rebuild

### app/(tabs)/profile.tsx
- Warning message about EAS Build requirement
- User-friendly error display
- Loading states for async operations

## Troubleshooting

### Build Fails

If the EAS build fails:
1. Check the build logs on expo.dev
2. Ensure your bundle identifier is unique: `com.natureup.nearbyapp`
3. Verify you have a valid Apple Developer account
4. Try clearing the build cache by adding to eas.json:
   ```json
   "preview": {
     "cache": {
       "disabled": true
     }
   }
   ```

### Permissions Not Working

If Apple Health connects but permissions aren't granted:
1. Go to iPhone Settings > Privacy & Security > Health
2. Find NatureUP Health
3. Enable all requested permissions:
   - Steps
   - Walking + Running Distance
   - Active Energy
   - Heart Rate
   - Mindful Minutes
   - Workouts

### Still Getting Errors

If you still see native module errors after EAS build:
1. Verify you installed the EAS-built version (not launch.expo.dev)
2. Check that you're on iOS (not web preview)
3. Review the logs in Xcode or using `eas build:list`
4. Ensure `react-native-health` is in package.json dependencies

## Development Workflow

**For Testing Apple Health:**
1. Make code changes in Bolt.new
2. Push to GitHub (automatic)
3. Run EAS Build
4. Install via TestFlight or Xcode
5. Test Apple Health functionality on device

**For Other Features (that don't need native modules):**
1. Use launch.expo.dev for quick previews
2. Scan QR code with iPhone camera
3. Opens in Expo Go for fast iteration

## Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [react-native-health GitHub](https://github.com/agencyenterprise/react-native-health)
- [Apple HealthKit Documentation](https://developer.apple.com/documentation/healthkit)
- [Expo Native Modules](https://docs.expo.dev/workflow/customizing/)

## Summary

The Apple Health integration is properly configured in this project. The only requirement is to build the app using **EAS Build** instead of using preview builds from launch.expo.dev. Once built with EAS, all Apple Health features will work correctly on physical iOS devices.

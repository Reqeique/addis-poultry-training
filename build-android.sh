#!/bin/bash
set -e  # Exit immediately on any error

# Robust cleanup on script exit (even if errors occur)
cleanup() {
  if [ -d "api_temp" ]; then
    echo ">>> Restoring API routes from api_temp..."
    mv api_temp app/api
  fi
}
trap cleanup EXIT

echo ">>> Temporarily moving API routes to prevent static export errors..."
if [ -d "app/api" ]; then
  mv app/api api_temp
fi

echo ">>> Building Next.js static export..."
if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local 2>/dev/null; then
  echo ">>> Using real Supabase credentials from .env.local..."
  STATIC_EXPORT="true" \
  JAVA_HOME="C:\Users\anani\AppData\Local\Programs\Android Studio\jbr" \
  npm run build
else
  echo ">>> Using placeholder Supabase credentials for compilation..."
  STATIC_EXPORT="true" \
  NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co" \
  NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder" \
  JAVA_HOME="C:\Users\anani\AppData\Local\Programs\Android Studio\jbr" \
  npm run build
fi

echo ">>> Syncing assets to native layer..."
npx cap sync android

echo ">>> Entering Android directory..."
cd android

echo ">>> Assembling signed release APK..."
./gradlew assembleRelease

echo ">>> Build complete."
echo ">>> APK located at: android/app/build/outputs/apk/release/app-release.apk"

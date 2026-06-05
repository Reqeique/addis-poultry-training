$ErrorActionPreference = "Stop"

# Define cleanup function to restore API routes
function Cleanup {
    if (Test-Path "api_temp") {
        Write-Host ">>> Restoring API routes from api_temp..."
        if (Test-Path "app/api") {
            Remove-Item -Recurse -Force app/api
        }
        Move-Item api_temp app/api -Force
    }
}

# Trap unexpected errors to ensure cleanup fires
trap {
    Write-Host ">>> An error occurred during build!"
    Cleanup
    exit 1
}

Write-Host ">>> Temporarily moving API routes to prevent static export errors..."
if (Test-Path "app/api") {
    if (Test-Path "api_temp") {
        Remove-Item -Recurse -Force api_temp
    }
    Move-Item app/api api_temp -Force
}

try {
    Write-Host ">>> Building Next.js static export..."
    
    # Check if .env.local has the Supabase URL
    $hasRealKeys = $false
    if (Test-Path ".env.local") {
        $envContent = Get-Content ".env.local" -Raw
        if ($envContent -match "NEXT_PUBLIC_SUPABASE_URL") {
            $hasRealKeys = $true
        }
    }
    
    if (-not $hasRealKeys) {
        Write-Host ">>> Using placeholder Supabase credentials for compilation..."
        $env:NEXT_PUBLIC_SUPABASE_URL="https://placeholder.supabase.co"
        $env:NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder"
    } else {
        Write-Host ">>> Using real Supabase credentials from .env.local..."
        # Clear environment overrides so Next.js loads directly from .env.local
        Remove-Item Env:\NEXT_PUBLIC_SUPABASE_URL -ErrorAction SilentlyContinue
        Remove-Item Env:\NEXT_PUBLIC_SUPABASE_ANON_KEY -ErrorAction SilentlyContinue
    }
    
    $env:JAVA_HOME="C:\Users\anani\AppData\Local\Programs\Android Studio\jbr"
    
    npm run build

    Write-Host ">>> Syncing assets to native layer..."
    npx cap sync android

    Write-Host ">>> Entering Android directory..."
    Push-Location android

    Write-Host ">>> Assembling signed release APK..."
    .\gradlew assembleRelease

    Pop-Location

    Write-Host ">>> Build complete."
    Write-Host ">>> APK located at: android/app/build/outputs/apk/release/app-release.apk"
}
finally {
    Cleanup
}

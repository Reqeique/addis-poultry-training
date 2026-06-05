import { AppLauncher } from '@capacitor/app-launcher';
import { Device } from '@capacitor/device';
import { Clipboard } from '@capacitor/clipboard';

const TELEBIRR_ANDROID_PACKAGE_URI = 'package:cn.tydic.ethiopay';
const TELEBIRR_ANDROID_INTENT_URI = 'intent://#Intent;package=cn.tydic.ethiopay;end';
const TELEBIRR_IOS_URL = 'telebirr://';

const TELEBIRR_ANDROID_STORE_URL =
  'https://play.google.com/store/apps/details?id=cn.tydic.ethiopay';
const TELEBIRR_IOS_STORE_URL =
  'https://apps.apple.com/app/telebirr/id1583020612'; // Real App Store ID for Telebirr

function showPaymentFeedback(): void {
  // Check if toast already exists
  if (document.getElementById('telebirr-copy-toast')) return;

  const toast = document.createElement('div');
  toast.id = 'telebirr-copy-toast';
  
  // Style toast inline to guarantee styling irrespective of CSS purges or dark theme overrides
  toast.style.position = 'fixed';
  toast.style.bottom = '32px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%) translateY(100px)';
  toast.style.width = 'calc(100% - 32px)';
  toast.style.maxWidth = '380px';
  toast.style.backgroundColor = 'rgba(17, 22, 37, 0.95)';
  toast.style.backdropFilter = 'blur(12px)';
  toast.style.border = '1px solid rgba(141, 235, 113, 0.3)';
  toast.style.borderRadius = '24px';
  toast.style.padding = '20px';
  toast.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)';
  toast.style.zIndex = '99999';
  toast.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease';
  toast.style.opacity = '0';
  toast.style.display = 'flex';
  toast.style.flexDirection = 'column';
  toast.style.color = '#ffffff';

  toast.innerHTML = `
    <div style="display: flex; align-items: flex-start; gap: 14px;">
      <div style="background-color: rgba(141, 235, 113, 0.15); padding: 8px; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(141, 235, 113, 0.25);">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8DEC71" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
          <path d="m9 14 2 2 4-4"/>
        </svg>
      </div>
      <div style="flex: 1;">
        <h4 style="margin: 0; font-size: 14px; font-weight: 800; color: #8DEC71; text-transform: uppercase; letter-spacing: 0.05em; font-family: sans-serif;">Number Copied / ቁጥሩ ተገልብጧል</h4>
        <p style="margin: 6px 0 0 0; font-size: 13px; font-weight: 600; color: #e2e8f0; line-height: 1.4; font-family: sans-serif;">
          Our payment number has been copied — just paste it inside Telebirr.
        </p>
        <p style="margin: 6px 0 0 0; font-size: 12px; font-weight: 500; color: #94a3b8; line-height: 1.4; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 4px; font-family: sans-serif;">
          የክፍያ ቁጥራችን ተገልብጧል — ቴሌብር ውስጥ መለጠፍ (paste) ብቻ ያድርጉ።
        </p>
      </div>
    </div>
  `;

  document.body.appendChild(toast);

  // Trigger animation after paint
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(-50%) translateY(0)';
    toast.style.opacity = '1';
  });

  // Automatically fade out after 6 seconds
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(100px)';
    toast.style.opacity = '0';
    setTimeout(() => {
      toast.remove();
    }, 500);
  }, 6000);
}

async function copyMerchantNumber(): Promise<boolean> {
  try {
    const merchantNumber = process.env.NEXT_PUBLIC_MERCHANT_PHONE || '0912345678';
    await Clipboard.write({ string: merchantNumber });
    return true;
  } catch (err) {
    // Secure handling: never log process.env.NEXT_PUBLIC_MERCHANT_PHONE or merchantNumber
    console.error('[useTelebirr] Clipboard operation failed');
    return false;
  }
}

export async function launchTelebirr(): Promise<void> {
  try {
    // Copy the merchant number first on all platforms
    const copySuccess = await copyMerchantNumber();
    if (copySuccess) {
      showPaymentFeedback();
    }

    const info = await Device.getInfo();
    const platform = info.platform; // 'android' | 'ios' | 'web'

    // Slight delay of 300ms to ensure toast renders and user sees it before switching
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (platform === 'android') {
      await handleAndroid();
    } else if (platform === 'ios') {
      await handleIos();
    } else {
      // Web fallback
      window.open(TELEBIRR_ANDROID_STORE_URL, '_blank');
    }
  } catch (error) {
    console.error('[useTelebirr] Platform dispatch error');
    window.open(TELEBIRR_ANDROID_STORE_URL, '_blank');
  }
}

async function handleAndroid(): Promise<void> {
  try {
    // On Android, use the package scheme to check if Telebirr exists
    const { value: canOpen } = await AppLauncher.canOpenUrl({
      url: TELEBIRR_ANDROID_PACKAGE_URI,
    });

    if (canOpen) {
      // Use the intent scheme to directly cold-launch the app
      await AppLauncher.openUrl({ url: TELEBIRR_ANDROID_INTENT_URI });
    } else {
      window.open(TELEBIRR_ANDROID_STORE_URL, '_blank');
    }
  } catch (error) {
    console.error('[useTelebirr] Android execution failed');
    window.open(TELEBIRR_ANDROID_STORE_URL, '_blank');
  }
}

async function handleIos(): Promise<void> {
  try {
    const { value: canOpen } = await AppLauncher.canOpenUrl({
      url: TELEBIRR_IOS_URL,
    });

    if (canOpen) {
      await AppLauncher.openUrl({ url: TELEBIRR_IOS_URL });
    } else {
      window.open(TELEBIRR_IOS_STORE_URL, '_blank');
    }
  } catch (error) {
    console.error('[useTelebirr] iOS execution failed');
    window.open(TELEBIRR_IOS_STORE_URL, '_blank');
  }
}


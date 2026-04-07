import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken, AppCheck } from "firebase/app-check";

const firebaseConfig = {
  apiKey: "AIzaSyACJvjNecVmc-ooULC99pjlu6slWiQz_3o",
  authDomain: "chalotalk-67106.firebaseapp.com",
  databaseURL: "https://chalotalk-67106-default-rtdb.firebaseio.com",
  projectId: "chalotalk-67106",
  storageBucket: "chalotalk-67106.firebasestorage.app",
  messagingSenderId: "767922030084",
  appId: "1:767922030084:web:f8f1664a9685832faf5751",
};

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);

if (import.meta.env.DEV) {
  (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

let appCheckInstance: AppCheck | null = null;
try {
  appCheckInstance = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider("6LeBPqssAAAAACKXUtcHmVeZMK2IrqhS4dwkWRY"),
    isTokenAutoRefreshEnabled: true,
  });
  console.log("[AppCheck] Initialized with reCAPTCHA Enterprise");
} catch (err) {
  console.warn("[AppCheck] Init failed:", err);
}

export const appCheck = appCheckInstance;

export async function ensureAppCheckToken(): Promise<void> {
  if (!appCheckInstance) {
    console.warn("[AppCheck] Not initialized — uploads may be rejected by Storage rules");
    return;
  }
  try {
    const result = await getToken(appCheckInstance, true);
    if (!result.token) {
      throw new Error("App Check returned empty token");
    }
    console.log("[AppCheck] Token acquired, length:", result.token.length);
  } catch (err) {
    console.error("[AppCheck] Token fetch failed — upload will likely be rejected:", err);
    throw new Error("App Check verification failed. Please refresh the page and try again.");
  }
}

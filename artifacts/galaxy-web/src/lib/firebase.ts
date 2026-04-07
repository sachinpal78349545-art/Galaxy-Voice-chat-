import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken, AppCheck } from "firebase/app-check";

const DEBUG_TOKEN = "ec8ffa53-77e7-4771-bc83-342174ea5237";

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

const isReplit = window.location.hostname.includes("replit.dev")
  || window.location.hostname.includes("replit.app")
  || window.location.hostname.includes("repl.co");
const isDev = import.meta.env.DEV || isReplit || window.location.hostname === "localhost";

if (isDev) {
  (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = DEBUG_TOKEN;
  (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = DEBUG_TOKEN;
}

console.log("[AppCheck] Environment:", {
  hostname: window.location.hostname,
  isDev,
  isReplit,
  mode: import.meta.env.MODE,
  debugTokenSet: !!(self as any).FIREBASE_APPCHECK_DEBUG_TOKEN,
});

let appCheckInstance: AppCheck | null = null;
try {
  appCheckInstance = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider("6LeBPqssAAAAACKXUtcHmVeZMK2IrqhS4dwkWRY"),
    isTokenAutoRefreshEnabled: true,
  });
  console.log("[AppCheck] Initialized with ReCaptchaEnterpriseProvider, debug:", isDev);
} catch (err) {
  console.error("[AppCheck] Init FAILED, retrying with debug token force:", err);
  try {
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = DEBUG_TOKEN;
    appCheckInstance = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider("6LeBPqssAAAAACKXUtcHmVeZMK2IrqhS4dwkWRY"),
      isTokenAutoRefreshEnabled: true,
    });
    console.log("[AppCheck] Retry init succeeded");
  } catch (retryErr) {
    console.error("[AppCheck] Retry init also FAILED:", retryErr);
  }
}

export const appCheck = appCheckInstance;

let appCheckReady = false;
let appCheckReadyPromise: Promise<void> | null = null;

function warmUpAppCheck(): Promise<void> {
  if (appCheckReady) return Promise.resolve();
  if (appCheckReadyPromise) return appCheckReadyPromise;

  appCheckReadyPromise = (async () => {
    if (!appCheckInstance) return;
    console.log("[AppCheck] Warming up — fetching initial token...");
    try {
      const result = await getToken(appCheckInstance, false);
      if (result.token) {
        appCheckReady = true;
        console.log("[AppCheck] Warm-up OK, token length:", result.token.length);
      }
    } catch (err: any) {
      console.warn("[AppCheck] Warm-up failed (will retry on upload):", err?.message);
    }
  })();

  return appCheckReadyPromise;
}

warmUpAppCheck();

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function ensureAppCheckToken(): Promise<void> {
  if (!appCheckInstance) {
    console.error("[AppCheck] ensureAppCheckToken: instance is null, skipping");
    return;
  }

  if (!appCheckReady) {
    console.log("[AppCheck] Token not ready yet, waiting 2s for handshake...");
    await delay(2000);
  }

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[AppCheck] Requesting token (attempt ${attempt}/${maxRetries}, forceRefresh=${attempt > 1})...`);
      const result = await getToken(appCheckInstance, attempt > 1);
      if (!result.token) {
        throw new Error("getToken returned empty token");
      }
      appCheckReady = true;
      console.log("[AppCheck] Token OK, length:", result.token.length);
      return;
    } catch (err: any) {
      console.error(`[AppCheck] Attempt ${attempt} failed:`, err?.code, err?.message);
      if (attempt < maxRetries) {
        console.log(`[AppCheck] Retrying in ${attempt * 1500}ms...`);
        await delay(attempt * 1500);
      } else {
        console.error("[AppCheck] All attempts exhausted. Full error:", err);
        throw new Error(`App Check verification failed after ${maxRetries} attempts: ${err?.message || "Unknown"}. Please refresh.`);
      }
    }
  }
}

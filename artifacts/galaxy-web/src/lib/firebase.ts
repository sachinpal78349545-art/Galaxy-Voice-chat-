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
  debugTokenSet: !!(self as any).FIREBASE_APPCHECK_DEBUG_TOKEN,
});

let appCheckInstance: AppCheck | null = null;
try {
  appCheckInstance = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider("6LeBPqssAAAAACKXUtcHmVeZMK2IrqhS4dwkWRY"),
    isTokenAutoRefreshEnabled: true,
  });
  console.log("[AppCheck] Initialized OK, debug:", isDev);
} catch (err) {
  console.error("[AppCheck] Init FAILED, retrying:", err);
  try {
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = DEBUG_TOKEN;
    appCheckInstance = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider("6LeBPqssAAAAACKXUtcHmVeZMK2IrqhS4dwkWRY"),
      isTokenAutoRefreshEnabled: true,
    });
    console.log("[AppCheck] Retry init succeeded");
  } catch (retryErr) {
    console.error("[AppCheck] Retry also FAILED:", retryErr);
  }
}

export const appCheck = appCheckInstance;

let cachedToken: string | null = null;
let warmUpDone = false;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  if (!appCheckInstance) return;
  console.log("[AppCheck] Warm-up: fetching initial token...");
  try {
    const result = await getToken(appCheckInstance, false);
    if (result.token) {
      cachedToken = result.token;
      warmUpDone = true;
      console.log("[AppCheck] Warm-up OK, token length:", result.token.length);
    }
  } catch (err: any) {
    console.warn("[AppCheck] Warm-up failed:", err?.message);
  }
})();

export async function getVerifiedToken(): Promise<string> {
  if (!appCheckInstance) {
    console.warn("[AppCheck] getVerifiedToken: instance is null, uploads may fail");
    return "";
  }

  if (!warmUpDone) {
    console.log("[AppCheck] Token not ready, waiting 2s for handshake...");
    await delay(2000);
  }

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const forceRefresh = attempt > 1;
      console.log(`[AppCheck] getVerifiedToken attempt ${attempt}/${maxRetries}, forceRefresh=${forceRefresh}`);
      const result = await getToken(appCheckInstance, forceRefresh);
      if (!result.token) {
        throw new Error("getToken returned empty token");
      }
      cachedToken = result.token;
      warmUpDone = true;
      console.log(`[AppCheck] getVerifiedToken SUCCESS, length: ${result.token.length}, starts: ${result.token.substring(0, 30)}...`);
      return result.token;
    } catch (err: any) {
      console.error(`[AppCheck] getVerifiedToken attempt ${attempt} FAILED:`, err?.code, err?.message);
      if (attempt < maxRetries) {
        const waitMs = attempt * 1500;
        console.log(`[AppCheck] Retrying in ${waitMs}ms...`);
        await delay(waitMs);
      } else {
        console.error("[AppCheck] All attempts exhausted:", err);
        throw new Error(`App Check verification failed after ${maxRetries} attempts: ${err?.message || "Unknown"}`);
      }
    }
  }
  return "";
}

export async function ensureAppCheckToken(): Promise<void> {
  await getVerifiedToken();
}

import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaEnterpriseProvider, CustomProvider, getToken, AppCheck } from "firebase/app-check";

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

console.log("[AppCheck] Environment:", {
  hostname: window.location.hostname,
  isDev,
  isReplit,
  mode: import.meta.env.MODE,
});

let appCheckInstance: AppCheck | null = null;
try {
  if (isDev) {
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = DEBUG_TOKEN;

    const debugProvider = new CustomProvider({
      getToken: () => {
        console.log("[AppCheck] CustomProvider returning debug token");
        return Promise.resolve({
          token: DEBUG_TOKEN,
          expireTimeMillis: Date.now() + 3600000,
        });
      },
    });

    appCheckInstance = initializeAppCheck(app, {
      provider: debugProvider,
      isTokenAutoRefreshEnabled: true,
    });
    console.log("[AppCheck] Initialized with CustomProvider (debug token)");
  } else {
    appCheckInstance = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider("6LeBPqssAAAAACKXUtcHmVeZMK2IrqhS4dwkWRY"),
      isTokenAutoRefreshEnabled: true,
    });
    console.log("[AppCheck] Initialized with reCAPTCHA Enterprise (production)");
  }
} catch (err) {
  console.error("[AppCheck] Init FAILED:", err);
}

export const appCheck = appCheckInstance;

export async function ensureAppCheckToken(): Promise<void> {
  if (!appCheckInstance) {
    console.error("[AppCheck] ensureAppCheckToken called but appCheckInstance is null");
    return;
  }
  try {
    console.log("[AppCheck] Requesting token (forceRefresh=true)...");
    const result = await getToken(appCheckInstance, true);
    if (!result.token) {
      console.error("[AppCheck] getToken returned empty token object:", JSON.stringify(result));
      throw new Error("App Check returned empty token");
    }
    console.log("[AppCheck] Token acquired OK, length:", result.token.length, "starts:", result.token.substring(0, 20) + "...");
  } catch (err: any) {
    console.error("[AppCheck] getToken FAILED:");
    console.error("[AppCheck]   name:", err?.name);
    console.error("[AppCheck]   message:", err?.message);
    console.error("[AppCheck]   code:", err?.code);
    console.error("[AppCheck]   stack:", err?.stack);
    throw new Error(`App Check verification failed: ${err?.message || "Unknown error"}. Refresh and try again.`);
  }
}

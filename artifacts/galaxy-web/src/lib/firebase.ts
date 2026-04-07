import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage, ref as storageRef, getDownloadURL } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider, getToken, AppCheck } from "firebase/app-check";

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

(self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = isDev ? DEBUG_TOKEN : undefined;
(window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = isDev ? DEBUG_TOKEN : undefined;

const globalTokenSet = typeof (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN === "string"
  && (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN === DEBUG_TOKEN;

console.log("[AppCheck] Environment:", {
  hostname: window.location.hostname,
  isDev,
  isReplit,
});
console.log(`[AppCheck] AppCheck Global Debug Token Set: ${globalTokenSet ? "Yes" : "No"}`);

let appCheckInstance: AppCheck | null = null;
try {
  appCheckInstance = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider("6LeBPqssAAAAACKXUtcHmVeZMK2IrqhS4dwkWRY"),
    isTokenAutoRefreshEnabled: true,
  });
  console.log("[AppCheck] Initialized with ReCaptchaV3Provider, debug:", isDev);
} catch (err) {
  console.error("[AppCheck] Init FAILED:", err);
  try {
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = DEBUG_TOKEN;
    console.log("[AppCheck] Re-set debug token on self, retrying init...");
    appCheckInstance = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider("6LeBPqssAAAAACKXUtcHmVeZMK2IrqhS4dwkWRY"),
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
    console.warn("[AppCheck] Warm-up token failed, will retry on upload:", err?.message);
    await delay(3000);
    try {
      const retry = await getToken(appCheckInstance!, true);
      if (retry.token) {
        cachedToken = retry.token;
        warmUpDone = true;
        console.log("[AppCheck] Warm-up retry OK, token length:", retry.token.length);
      }
    } catch (retryErr: any) {
      console.warn("[AppCheck] Warm-up retry also failed:", retryErr?.message);
    }
  }
})();

export async function getVerifiedToken(): Promise<string> {
  if (!appCheckInstance) {
    console.warn("[AppCheck] getVerifiedToken: no instance");
    return "";
  }

  if (!warmUpDone) {
    console.log("[AppCheck] Token not ready, waiting 2s for handshake...");
    await delay(2000);
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const forceRefresh = attempt > 1;
      console.log(`[AppCheck] getVerifiedToken attempt ${attempt}/3, force=${forceRefresh}`);
      const result = await getToken(appCheckInstance, forceRefresh);
      if (!result.token) throw new Error("Empty token");
      cachedToken = result.token;
      warmUpDone = true;
      console.log(`[AppCheck] Token OK, length: ${result.token.length}`);
      return result.token;
    } catch (err: any) {
      console.error(`[AppCheck] Attempt ${attempt} failed:`, err?.code, err?.message);
      if (attempt < 3) {
        const waitMs = attempt === 1 ? 3000 : 3000;
        console.log(`[AppCheck] Waiting ${waitMs}ms before retry...`);
        await delay(waitMs);
      } else {
        console.error("[AppCheck] All 3 attempts exhausted:", err);
        throw new Error(`App Check failed after 3 attempts: ${err?.message}`);
      }
    }
  }
  return "";
}

const STORAGE_BUCKET = firebaseConfig.storageBucket;

export interface UploadResult {
  url: string;
}

export async function uploadWithAppCheck(
  fileOrBlob: File | Blob,
  path: string,
  contentType?: string,
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  const appCheckToken = await getVerifiedToken();
  const user = auth.currentUser;
  const authToken = user ? await user.getIdToken(true) : null;

  const hasAppCheck = !!appCheckToken;
  const hasAuth = !!authToken;
  console.log(`[Upload] Headers attached: AppCheck=${hasAppCheck ? "Yes" : "No"}, Auth=${hasAuth ? "Yes" : "No"}`);
  console.log(`[Upload] Path: ${path}, Size: ${((fileOrBlob.size || 0) / 1024).toFixed(1)}KB`);

  if (!hasAppCheck) {
    console.warn("[Upload] No App Check token — upload may be rejected");
  }

  const encodedPath = encodeURIComponent(path);
  const uploadUrl = `https://firebasestorage.googleapis.com/upload/storage/v1/b/${STORAGE_BUCKET}/o?uploadType=media&name=${encodedPath}`;

  const mimeType = contentType
    || (fileOrBlob instanceof File ? fileOrBlob.type : null)
    || "application/octet-stream";

  const headers: Record<string, string> = {
    "Content-Type": mimeType,
  };
  if (appCheckToken) {
    headers["X-Firebase-AppCheck"] = appCheckToken;
  }
  if (authToken) {
    headers["Authorization"] = `Firebase ${authToken}`;
  }

  console.log(`[Upload] Sending to Firebase Storage REST API...`);
  console.log(`[Upload] X-Firebase-AppCheck header length: ${appCheckToken?.length || 0}`);

  return new Promise<UploadResult>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl);

    Object.entries(headers).forEach(([k, v]) => xhr.setRequestHeader(k, v));

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          onProgress(pct);
        }
      };
    }

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          console.log("[Upload] REST upload success, getting download URL...");
          const sRef = storageRef(storage, path);
          const url = await getDownloadURL(sRef);
          console.log("[Upload] Download URL obtained");
          resolve({ url });
        } catch (urlErr) {
          console.error("[Upload] getDownloadURL failed, using fallback:", urlErr);
          try {
            const resp = JSON.parse(xhr.responseText);
            const token = resp?.downloadTokens;
            if (token) {
              const fallbackUrl = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodedPath}?alt=media&token=${token}`;
              resolve({ url: fallbackUrl });
            } else {
              reject(urlErr);
            }
          } catch { reject(urlErr); }
        }
      } else {
        console.error(`[Upload] REST upload failed: ${xhr.status} ${xhr.statusText}`);
        console.error("[Upload] Response body:", xhr.responseText);
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText} — ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => {
      console.error("[Upload] XHR network error");
      reject(new Error("Network error during upload"));
    };

    xhr.send(fileOrBlob);
  });
}

export async function ensureAppCheckToken(): Promise<void> {
  await getVerifiedToken();
}

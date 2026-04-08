import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";

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

// ----- App Check DISABLED for testing -----
// To re-enable, uncomment the block below and import:
//   import { initializeAppCheck, ReCaptchaV3Provider, getToken } from "firebase/app-check";
//
// (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = "ec8ffa53-77e7-4771-bc83-342174ea5237";
// const appCheckInstance = initializeAppCheck(app, {
//   provider: new ReCaptchaV3Provider("6LeBPqssAAAAACKXUtcHmVeZMK2IrqhS4dwkWRY"),
//   isTokenAutoRefreshEnabled: true,
// });
console.log("[Firebase] App Check BYPASSED — direct uploads enabled");

export interface UploadResult {
  url: string;
}

export async function uploadWithAppCheck(
  fileOrBlob: File | Blob,
  path: string,
  contentType?: string,
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  console.log("[Upload] App Check bypassed. Starting direct upload...");
  console.log(`[Upload] Path: ${path}, Size: ${((fileOrBlob.size || 0) / 1024).toFixed(1)}KB`);

  const sRef = storageRef(storage, path);
  const mimeType = contentType
    || (fileOrBlob instanceof File ? fileOrBlob.type : null)
    || "application/octet-stream";

  return new Promise<UploadResult>((resolve, reject) => {
    const task = uploadBytesResumable(sRef, fileOrBlob, { contentType: mimeType });

    task.on("state_changed",
      (snap) => {
        const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        console.log(`[Upload] Progress: ${pct}% (${snap.bytesTransferred}/${snap.totalBytes})`);
        if (onProgress) onProgress(pct);
      },
      (err) => {
        console.error("[Upload] uploadBytesResumable FAILED:", err);
        reject(err);
      },
      async () => {
        try {
          console.log("[Upload] Upload complete, getting download URL...");
          const url = await getDownloadURL(task.snapshot.ref);
          console.log("[Upload] Success! URL obtained.");
          resolve({ url });
        } catch (e) {
          console.error("[Upload] getDownloadURL failed:", e);
          reject(e);
        }
      }
    );
  });
}

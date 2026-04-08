import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";

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

console.log("[Firebase] Initialized — no App Check, direct uploads only");

export interface UploadResult {
  url: string;
}

export async function uploadWithAppCheck(
  fileOrBlob: File | Blob,
  path: string,
  contentType?: string,
  _onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  const sizeKB = ((fileOrBlob.size || 0) / 1024).toFixed(1);
  console.log(`DEBUG: Starting Direct Upload — path=${path}, size=${sizeKB}KB`);

  const sRef = storageRef(storage, path);
  const metadata = contentType ? { contentType } : undefined;

  await uploadBytes(sRef, fileOrBlob, metadata);
  console.log("[Upload] uploadBytes complete, getting download URL...");

  const url = await getDownloadURL(sRef);
  console.log("[Upload] Done! URL:", url.substring(0, 80) + "...");

  return { url };
}

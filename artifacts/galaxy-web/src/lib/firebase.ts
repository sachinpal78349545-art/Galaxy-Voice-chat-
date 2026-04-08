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

console.log("[Firebase] Init OK — bucket:", firebaseConfig.storageBucket);
console.log("[Firebase] Auth domain:", firebaseConfig.authDomain);
console.log("[Firebase] Current user:", auth.currentUser?.uid ?? "none (not signed in yet)");

export interface UploadResult {
  url: string;
}

export async function directUpload(
  fileOrBlob: File | Blob,
  path: string,
  contentType?: string,
  _onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  const sizeKB = ((fileOrBlob.size || 0) / 1024).toFixed(1);
  const user = auth.currentUser;

  console.log("=== DEBUG: Starting Direct Upload ===");
  console.log("[Upload] Path:", path);
  console.log("[Upload] Size:", sizeKB, "KB");
  console.log("[Upload] Content-Type:", contentType || (fileOrBlob instanceof File ? fileOrBlob.type : "application/octet-stream"));
  console.log("[Upload] Bucket:", firebaseConfig.storageBucket);
  console.log("[Upload] User UID:", user?.uid ?? "ANONYMOUS");
  console.log("[Upload] User email:", user?.email ?? "none");

  const sRef = storageRef(storage, path);
  console.log("[Upload] Storage ref fullPath:", sRef.fullPath);
  console.log("[Upload] Storage ref bucket:", sRef.bucket);

  const metadata = contentType ? { contentType } : undefined;

  try {
    const snapshot = await uploadBytes(sRef, fileOrBlob, metadata);
    console.log("[Upload] uploadBytes SUCCESS");
    console.log("[Upload] Bytes transferred:", snapshot.metadata.size);
    console.log("[Upload] Full path:", snapshot.metadata.fullPath);

    const url = await getDownloadURL(sRef);
    console.log("[Upload] Download URL obtained:", url.substring(0, 100));
    return { url };
  } catch (err: any) {
    console.error("=== UPLOAD FAILED — FULL ERROR ===");
    console.error("[Upload] Error name:", err?.name);
    console.error("[Upload] Error code:", err?.code);
    console.error("[Upload] Error message:", err?.message);
    console.error("[Upload] Error serverResponse:", err?.serverResponse);
    console.error("[Upload] Error customData:", JSON.stringify(err?.customData));
    console.error("[Upload] Full error object:", err);
    throw err;
  }
}

export const uploadWithAppCheck = directUpload;

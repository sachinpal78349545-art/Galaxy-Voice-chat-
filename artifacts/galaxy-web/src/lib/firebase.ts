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

console.log("[Firebase] Init OK");
console.log("[Firebase] Bucket:", firebaseConfig.storageBucket);
console.log("[Firebase] Project:", firebaseConfig.projectId);

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
  const ct = contentType || (fileOrBlob instanceof File ? fileOrBlob.type : "application/octet-stream");

  console.log("SUCCESS: Starting direct Blob upload without App Check.");
  console.log("[Upload] path:", path, "| size:", sizeKB, "KB | type:", ct);
  console.log("[Upload] user:", user?.uid ?? "ANONYMOUS (no auth)");

  const sRef = storageRef(storage, path);
  console.log("[Upload] ref.bucket:", sRef.bucket, "| ref.fullPath:", sRef.fullPath);

  try {
    const snapshot = await uploadBytes(sRef, fileOrBlob, { contentType: ct });
    console.log("[Upload] uploadBytes SUCCESS — bytes:", snapshot.metadata.size);

    const url = await getDownloadURL(sRef);
    console.log("[Upload] Download URL:", url.substring(0, 100));
    return { url };
  } catch (err: any) {
    console.error("=== UPLOAD FAILED ===");
    console.error("[Upload] code:", err?.code);
    console.error("[Upload] message:", err?.message);
    console.error("[Upload] serverResponse:", err?.serverResponse);
    console.error("[Upload] status:", err?.status);
    console.error("[Upload] full:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
    throw err;
  }
}

export const uploadWithAppCheck = directUpload;

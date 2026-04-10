import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { uploadToCloudinary } from "./cloudinary";

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

console.log("[Firebase] Init OK");
console.log("[Firebase] Project:", firebaseConfig.projectId);

export interface UploadResult {
  url: string;
}

export async function directUpload(
  fileOrBlob: File | Blob,
  _path: string,
  _contentType?: string,
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  const sizeKB = ((fileOrBlob.size || 0) / 1024).toFixed(1);
  console.log("[Upload] Cloudinary upload | size:", sizeKB, "KB");

  const url = await uploadToCloudinary(fileOrBlob, onProgress);
  console.log("[Upload] Cloudinary URL:", url.substring(0, 100));
  return { url };
}

export const uploadWithAppCheck = directUpload;

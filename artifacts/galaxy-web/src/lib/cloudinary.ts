const CLOUD_NAME = "dz1bhfpkc";
const UPLOAD_PRESET = "profile_pics";
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
const AUTO_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

function optimizedUrl(url: string, width = 400, height = 400): string {
  return url.replace("/upload/", `/upload/w_${width},h_${height},c_fill,q_auto,f_auto/`);
}

export async function uploadToCloudinary(
  file: File | Blob,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const isAudio =
    (file instanceof File && file.type.startsWith("audio/")) ||
    (file instanceof Blob && (file as any).type?.startsWith("audio/"));

  const endpoint = isAudio ? AUTO_UPLOAD_URL : UPLOAD_URL;

  onProgress?.(20);

  const response = await fetch(endpoint, {
    method: "POST",
    body: formData,
  });

  onProgress?.(80);

  if (!response.ok) {
    const errText = await response.text();
    console.error("[Cloudinary] Upload failed:", response.status, errText);
    throw new Error(`Cloudinary upload failed: ${response.status}`);
  }

  const data = await response.json();
  onProgress?.(100);

  const rawUrl: string = data.secure_url;

  if (isAudio) {
    return rawUrl;
  }

  return optimizedUrl(rawUrl);
}

export function getOptimizedUrl(url: string, width = 400, height = 400): string {
  if (!url.includes("cloudinary.com")) return url;
  if (url.includes("/upload/w_") || url.includes("/upload/c_")) return url;
  return optimizedUrl(url, width, height);
}

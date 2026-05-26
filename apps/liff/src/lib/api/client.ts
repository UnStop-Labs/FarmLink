import axios from "axios";
import { getLiffAccessToken } from "../liff/liff-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

// ============================================================
// API Client — typed wrappers over the REST API
// ============================================================

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
});

// Attach LIFF access token to every request
apiClient.interceptors.request.use((config) => {
  const token = getLiffAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Retry once on network error
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error.response && error.config && !error.config.__retried) {
      error.config.__retried = true;
      await new Promise((r) => setTimeout(r, 1000));
      return apiClient.request(error.config);
    }
    return Promise.reject(error);
  }
);

// --- Farms ---

export async function fetchFarms() {
  const { data } = await apiClient.get("/api/farms");
  return data;
}

export async function fetchFarm(farmId: string) {
  const { data } = await apiClient.get(`/api/farms/${farmId}`);
  return data;
}

export async function createFarm(payload: {
  name: string;
  crop_type: string;
  province?: string;
  line_user_id?: string;
}) {
  const { data } = await apiClient.post("/api/farms", payload);
  return data;
}

export async function updateFarmBoundary(
  farmId: string,
  polygon: { type: "Polygon"; coordinates: [number, number][][] }
) {
  const { data } = await apiClient.put(`/api/farms/${farmId}`, { polygon });
  return data;
}

// --- Satellite ---

export async function fetchNdviSeries(farmId: string, days = 90) {
  const { data } = await apiClient.get(
    `/api/satellite/farm/${farmId}/ndvi-series?days=${days}`
  );
  return data;
}

export async function fetchAnomalies(farmId: string) {
  const { data } = await apiClient.get(
    `/api/satellite/farm/${farmId}/anomalies`
  );
  return data;
}

export async function submitAnomalyFeedback(
  anomalyId: string,
  confirmed: boolean,
  feedback?: string
) {
  const { data } = await apiClient.post(
    `/api/satellite/anomalies/${anomalyId}/feedback`,
    { confirmed, feedback }
  );
  return data;
}

// --- Upload ---

export async function getPresignedUploadUrl(
  fileType: string,
  folder: "photos" | "voice" = "photos"
) {
  const { data } = await apiClient.post("/api/upload/presign", {
    file_type: fileType,
    folder,
  });
  return data as { upload_url: string; key: string; public_url: string };
}

/** Upload a file directly to S3 using presigned URL */
export async function uploadFileToS3(
  file: File | Blob,
  uploadUrl: string
): Promise<void> {
  await axios.put(uploadUrl, file, {
    headers: { "Content-Type": file instanceof File ? file.type : "image/jpeg" },
    timeout: 60_000,
  });
}

// --- Sync ---

export async function syncBatch(payload: unknown) {
  const { data } = await apiClient.post("/api/sync", payload);
  return data;
}

export default apiClient;

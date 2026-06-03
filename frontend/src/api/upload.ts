// File upload API — sends multipart/form-data to the backend upload endpoint.
// The backend stores it in Supabase Storage (or locally as fallback) and returns a URL.

const BASE_URL = "/api";

export interface UploadResponse {
  url: string;
  filename: string;
}

export async function uploadFile(file: File): Promise<UploadResponse> {
  const token = localStorage.getItem("access_token");
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData, // no Content-Type header — browser sets it with boundary
  });

  if (!res.ok) {
    let detail = "Upload failed";
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // no JSON body
    }
    throw new Error(detail);
  }

  return res.json();
}

import { api } from "@/lib/api";

interface UploadResult {
  url: string;
  thumbnail: string;
}

export const uploadApi = {
  async uploadPhoto(cvId: string, file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append("photo", file);

    const res = await api.post(`/upload/photo/${cvId}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.data;
  },

  async deletePhoto(cvId: string): Promise<void> {
    await api.delete(`/upload/photo/${cvId}`);
  },
};

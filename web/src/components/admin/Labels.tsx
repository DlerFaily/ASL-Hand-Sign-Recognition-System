import { useEffect, useState } from "react";
import apiClient from "../../cfg/api";

interface Label {
  id: number;
  name: string;
  example_image: string | null;
}

export default function Labels() {
  const [labels, setLabels] = useState<Label[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient
      .get("/api/models/labels/")
      .then((res) => setLabels(res.data.labels || []))
      .finally(() => setLoading(false));
  }, []);

  const handleImageUpload = async (labelId: number, file: File) => {
    const formData = new FormData();
    formData.append("image", file);

    try {
      await apiClient.post(`/api/models/labels/${labelId}/upload-image/`, formData);
      const res = await apiClient.get("/api/models/labels/");
      setLabels(res.data.labels || []);
    } catch (err) {
      alert("Upload failed.");
      console.error(err);
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (labels.length === 0) {
    return <div className="p-4">No labels</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4 capitalize">Labels</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {labels.map((label) => (
          <div key={label.id} className="bg-white rounded shadow p-4 flex flex-col items-center">
            <div className="mb-2 text-lg font-semibold capitalize">{label.name}</div>
            {label.example_image ? (
              <img
                src={label.example_image}
                alt={label.name}
                className="w-32 h-32 object-cover rounded mb-2 border"
              />
            ) : (
              <div className="w-32 h-32 flex items-center justify-center bg-gray-100 rounded mb-2 border text-gray-400">
                No image
              </div>
            )}
            <label className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mt-2">
              Upload Photo
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleImageUpload(label.id, e.target.files[0]);
                  }
                }}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}
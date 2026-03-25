import apiClient from "../cfg/api";

export interface TrainedModel {
    id: number;
    name: string;
    is_active: boolean;
    f1_score: number;
    accuracy: number;
    confusion_matrix: number[][];
    recall: number;
    precision: number;
    previous_model: number | null;
}

interface GetModelsResponse {
    models: TrainedModel[];
}

export async function getModels(): Promise<TrainedModel[]> {
    const response = await apiClient.get<GetModelsResponse>("/api/models/");
    return response.data.models;
}

export async function activateModel(id: number): Promise<any> {
    const response = await apiClient.put(`/api/models/${id}/select/`);
    return response.data;
}

export async function trainModel(file: File, epochs: number = 10): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('epochs', String(epochs));

    const response = await apiClient.post(`/api/models/train/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
}
export async function deleteModel(id: number): Promise<any> {
    const response = await apiClient.delete(`/api/models/${id}/`);
    return response.data;
}

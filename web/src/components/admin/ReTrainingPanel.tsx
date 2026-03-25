import React, { useState, useEffect } from 'react';
import apiClient from '@/cfg/api';
import type { Model } from '../../types/model';
import type { RetrainResult } from '../../types/retrainResult';
import { RetrainingContainer } from '../ui/RetrainingContainer';

interface ReTrainingPanelProps {
  onModelUpdate?: () => void;
}

export default function Retraining({ onModelUpdate }: ReTrainingPanelProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [epochs, setEpochs] = useState(10);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RetrainResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get('/api/models/')
      .then(res => setModels(res.data.models || []))
      .catch(err => console.error("Failed to load models", err));
  }, []);

  // Fetch models again after retraining is done
  useEffect(() => {
    if (result) {
      apiClient.get('/api/models/')
        .then(res => setModels(res.data.models || []))
        .catch(err => console.error("Failed to reload models after retraining", err));
    }
  }, [result]);

  const handleRetrain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModel || !file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('epochs', epochs.toString());

    try {
      const response = await apiClient.post(`/api/models/${selectedModel.id}/retrain/`, formData);
      setResult(response.data);

      if (onModelUpdate) {
        onModelUpdate();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetView = () => {
    setSelectedModel(null);
    setResult(null);
    setFile(null);
    setError(null);
  };

  return (
    <RetrainingContainer
      models={models}
      selectedModel={selectedModel}
      file={file}
      epochs={epochs}
      loading={loading}
      result={result}
      error={error}
      onModelSelect={setSelectedModel}
      onFileChange={setFile}
      onEpochsChange={setEpochs}
      onRetrain={handleRetrain}
      onReset={resetView}
    />
  );
}
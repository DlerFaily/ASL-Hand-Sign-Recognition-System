import React from 'react';
import type { Model } from '../../types/model';
import type { RetrainResult } from '../../types/retrainResult';

interface RetrainingContainerProps {
  models: Model[];
  selectedModel: Model | null;
  file: File | null;
  epochs: number;
  loading: boolean;
  result: RetrainResult | null;
  error: string | null;
  showTrainingForm?: boolean;
  formTitle?: string;
  onModelSelect: (model: Model) => void;
  onFileChange: (file: File | null) => void;
  onEpochsChange: (epochs: number) => void;
  onRetrain: (e: React.FormEvent) => void;
  onReset: () => void;
}

export function RetrainingContainer({
  models,
  selectedModel,
  file,
  epochs,
  loading,
  result,
  error,
  showTrainingForm,
  formTitle,
  onModelSelect,
  onFileChange,
  onEpochsChange,
  onRetrain,
  onReset,
}: RetrainingContainerProps) {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {(!showTrainingForm) ? (
        <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Retraining Center</h3>
      ) : (
        <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">Training Center</h3>
      )}

      {(!selectedModel && !showTrainingForm) ? (
        // Model list
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {models.length === 0 ? (
            <div className="col-span-full text-center py-8 text-gray-500">
              No models found.
            </div>
          ) : (
            models.map((model) => (
              <div
                key={model.id}
                className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors flex flex-col justify-between"
                onClick={() => onModelSelect(model)}
              >
                <div className="font-bold text-sm text-gray-600">ID: {model.id}</div>
                <div
                  className="font-semibold text-gray-800 line-clamp-2 break-words"
                  title={model.name}
                >
                  {model.name}
                </div>

                <div className="text-blue-600 text-sm mt-2">Click to Retrain →</div>
              </div>
            ))
          )}
        </div>
      ) : (
        // Form (used for retraining or new training)
        <div className="space-y-6">
          {!showTrainingForm && (
            <button
              className="flex items-center cursor-pointer text-blue-600 hover:text-blue-800 transition-colors"
              onClick={onReset}
            >
              ← Back to Models
            </button>
          )}

          <div className="bg-gray-50 p-6 rounded-lg">
            <h4 className="text-xl font-semibold text-gray-800 mb-4">
              {showTrainingForm ? (formTitle ?? 'Train New Model') : `Retrain: ${selectedModel?.name}`}
            </h4>

            {!result ? (
              <form onSubmit={onRetrain} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload CSV Data
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    className="cursor-pointer w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => onFileChange(e.target.files ? e.target.files[0] : null)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Epochs
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={epochs}
                    onChange={(e) => onEpochsChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                    ! {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  disabled={loading || !file}
                >
                  {loading ? "Processing..." : (showTrainingForm ? 'Start Training' : 'Start Retraining')}
                </button>
              </form>
            ) : (
              // Success view
              <div className="text-center space-y-4">
                <div className="text-green-500 text-4xl">✓</div>
                <h3 className="text-xl font-semibold text-gray-800">Retraining Complete!</h3>
                <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="text-sm text-gray-600">Total Samples</div>
                    <div className="text-lg font-semibold text-gray-800">{result.total_samples}</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border">
                    <div className="text-sm text-gray-600">Epochs</div>
                    <div className="text-lg font-semibold text-gray-800">{result.epochs}</div>
                  </div>
                </div>
                <button
                  className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 transition-colors"
                  onClick={onReset}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
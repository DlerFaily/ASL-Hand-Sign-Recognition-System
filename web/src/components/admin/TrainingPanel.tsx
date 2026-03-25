import React, { useState } from 'react';
import { trainModel } from '../../services/models';
import type { RetrainResult } from '../../types/retrainResult';
import { RetrainingContainer } from '../ui/RetrainingContainer';

interface TrainingPanelProps {
  onModelUpdate?: () => void;
}
export default function TrainingPanel({ onModelUpdate }: TrainingPanelProps) {
	const [file, setFile] = useState<File | null>(null);
	const [epochs, setEpochs] = useState<number>(10);
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState<RetrainResult | null>(null);
	const [error, setError] = useState<string | null>(null);

	const handleRetrain = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!file) return setError('Please select a CSV file to train.');

		setLoading(true);
		setError(null);
		setResult(null);

		try {
			const resp = await trainModel(file, epochs);
			setResult(resp as RetrainResult);

			if (onModelUpdate) {
				onModelUpdate();
			}
		} catch (err: any) {
			setError(err?.response?.data?.error || err?.message || 'Training request failed');
		} finally {
			setLoading(false);
		}
	};

	const reset = () => {
		setFile(null);
		setEpochs(10);
		setResult(null);
		setError(null);
	};

	return (
		<RetrainingContainer
			models={[]}
			selectedModel={null}
			file={file}
			epochs={epochs}
			loading={loading}
			result={result}
			error={error}
			onModelSelect={() => {}}
			onFileChange={setFile}
			onEpochsChange={setEpochs}
			onRetrain={handleRetrain}
			onReset={reset}
			showTrainingForm={true}
			formTitle="Train New Model"
		/>
	);
}
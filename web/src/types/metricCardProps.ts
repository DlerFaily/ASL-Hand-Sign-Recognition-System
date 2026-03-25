export type MainProps = {
  modelsAvailable: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  activeModelName?: string | null;
  activeModelId?: number | null;
  previousModelId?: number | null;
  confusionMatrix?: number[][];
  labels?: string[];
}
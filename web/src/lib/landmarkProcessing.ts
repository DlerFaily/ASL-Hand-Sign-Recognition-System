import type { Point } from '../types/point';

export const SEQ_LEN = 30;
export const NUM_LANDMARKS = 21;
export const FEATURES_PER_FRAME = NUM_LANDMARKS * 3 // 63 features per frame

// Extract landmark vectors with wrist as base (matching Python implementation)
export const extractLandmarkVectors = (landmarks: number[]): number[] => {
  if (landmarks.length !== 63) return [];

  // Convert flat array back to coordinate objects
  const coords: Point[] = [];
  for (let i = 0; i < NUM_LANDMARKS; i++) {
    coords.push({
      x: landmarks[i * 3],
      y: landmarks[i * 3 + 1],
      z: landmarks[i * 3 + 2]
    });
  }

  // Defining reference points
  const wrist = coords[0];
  const middleKnuckle = coords[9];
  
  const scale = Math.sqrt(
    Math.pow(middleKnuckle.x - wrist.x, 2) +
    Math.pow(middleKnuckle.y - wrist.y, 2) +
    Math.pow(middleKnuckle.z - wrist.z, 2)
  );

  // Avoid division by zero
  if (scale === 0) return [];

  const vectors: number[] = [];

  // Center and normalize
  for (let i = 0; i < NUM_LANDMARKS; i++) {
    const curr = coords[i];

    const dx = (curr.x - wrist.x) / scale;
    const dy = (curr.y - wrist.y) / scale;
    const dz = (curr.z - wrist.z) / scale;

    vectors.push(dx, dy, dz);
  }
  return vectors;
};

export const interpolateSequence = (sequence: number[][], targetLen: number): number[][] => {
  const currentLen = sequence.length;
  if (currentLen === targetLen) return sequence;

  const interpolated: number[][] = [];
  for (let i = 0; i < targetLen; i++) {
    const pos = (i * (currentLen - 1)) / (targetLen - 1);
    const lowerIndex = Math.floor(pos);
    const upperIndex = Math.min(Math.ceil(pos), currentLen - 1);
    const weight = pos - lowerIndex;

    const lowerFrame = sequence[lowerIndex];
    const upperFrame = sequence[upperIndex];

    const interpolatedFrame = lowerFrame.map((val, idx) => 
      (1 - weight) * val + weight * upperFrame[idx]
    );

    interpolated.push(interpolatedFrame);
  }

  return interpolated;
};

export const processSequence = (buffer: number[][]): number[][] => {
  const bufferLen = buffer.length;

  if (bufferLen === 0) {
    return [];
  }

  if (bufferLen < SEQ_LEN) {
    return interpolateSequence(buffer, SEQ_LEN);
  }

  if (bufferLen > SEQ_LEN && bufferLen <= 2 * SEQ_LEN) {
    const step = bufferLen / SEQ_LEN;
    const downsampled: number[][] = [];
    for (let i = 0; i < SEQ_LEN; i++) {
      const index = Math.floor(i * step);
      downsampled.push(buffer[index]);
    }
    return downsampled;
  }

  if (bufferLen > 2 * SEQ_LEN) {
    return [];
  }

  return buffer;
};
import { SEQ_LEN, NUM_LANDMARKS} from './landmarkProcessing';
import type { CollectedData } from '../types/collectedData';

export const exportToCSV = (collectedData: CollectedData[]): void => {
  if (collectedData.length === 0) {
    return;
  }

  // Generate CSV header matching Python format
  const header: string[] = [];
  
  // Generate column names for each frame and each pair
  for (let frame = 0; frame < SEQ_LEN; frame++) {
    for (let i = 0; i < NUM_LANDMARKS; i++) {
        header.push(`frame${frame}_dx_${i}`);
        header.push(`frame${frame}_dy_${i}`);
        header.push(`frame${frame}_dz_${i}`);
    }
  }
  
  // Add label column at the end
  header.push('label');
  
  // Generate CSV rows
  const rows = collectedData.map(item => {
    // Flatten the sequence buffer (30 frames × 630 features = 18,900 values)
    const flattened: number[] = [];
    for (const frame of item.data) {
      flattened.push(...frame);
    }
    
    // Add label at the end
    return [...flattened, item.label].join(',');
  });

  const csv = [header.join(','), ...rows].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `landmarks_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
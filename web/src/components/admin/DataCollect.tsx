import { useState, useCallback, useEffect, useRef } from 'react';
import { WebCam } from '../Webcam';
import { SEQ_LEN, FEATURES_PER_FRAME, extractLandmarkVectors, processSequence } from '../../lib/landmarkProcessing';
import { exportToCSV as exportDataToCSV } from '../../lib/exportToCSV';
import type { CollectedData } from '../../types/collectedData';
import type { MessageType } from '../../types/message';

interface DataCollectionProps {
  onDataCollected?: (data: CollectedData) => void;
}

export default function DataCollection({ onDataCollected }: DataCollectionProps) {
  const [label, setLabel] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [frameCount, setFrameCount] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  const [messageType, setMessageType] = useState<MessageType>('info');
  const [showDiscardPrompt, setShowDiscardPrompt] = useState<boolean>(false);
  const [collectedCount, setCollectedCount] = useState<number>(0);
  const [handDetected, setHandDetected] = useState<boolean>(false);
  const [collectedData, setCollectedData] = useState<CollectedData[]>([]);

  const sequenceBufferRef = useRef<number[][]>([]);

  const handleLandmarksDetected = useCallback((landmarks: number[] | null) => {
    // Update hand detection status
    if (landmarks === null || landmarks.length !== 63) {
      setHandDetected(false);

      // If recording and hand is lost, stop recording and show error
      if (isRecording) {
        setIsRecording(false);
        sequenceBufferRef.current = [];
        setFrameCount(0);
        setMessage('Hand lost during recording! Recording stopped and discarded.');
        setMessageType('error');
      }
      return;
    }

    setHandDetected(true);

    if (!isRecording) {
      return;
    }

    // Extract pairwise distance vectors
    const vectors = extractLandmarkVectors(landmarks);

    if (vectors.length === FEATURES_PER_FRAME) {
      sequenceBufferRef.current.push(vectors);
      setFrameCount(sequenceBufferRef.current.length);
    }
  }, [isRecording]);

  const handleStartStopRecording = () => {
    const normalizedLabel = label.trim().toLowerCase();
    if (!normalizedLabel) {
      setMessage('Please enter a label before recording.');
      setMessageType('error');
      return;
    }
    const exists = collectedData.some(d => d.label === normalizedLabel);

    if (!handDetected) {
      setMessage('No hand detected! Please show your hand to the camera.');
      setMessageType('error');
      return;
    }

    if (!isRecording) {
      setIsRecording(true);
      sequenceBufferRef.current = [];
      setFrameCount(0);

      if (exists) {
        setMessage(`Adding samples to existing category: "${normalizedLabel}"`);
      } else {
        setMessage('Recording started. Make your sign and hold it!');
      }
      setMessageType('info');
    } else {
      setIsRecording(false);
      setMessage('Recording stopped. Processing...');
      setMessageType('info');

      const originalLength = sequenceBufferRef.current.length;
      const processed = processSequence(sequenceBufferRef.current);

      if (processed.length === 0) {
        setMessage(`Too many frames (${originalLength}). Maximum is ${2 * SEQ_LEN}. Sequence discarded.`);
        setMessageType('error');
        sequenceBufferRef.current = [];
        setFrameCount(0);
        return;
      }

      if (originalLength < SEQ_LEN) {
        setMessage(`Interpolated sequence from ${originalLength} to ${SEQ_LEN} frames.`);
        setMessageType('info');
      } else if (originalLength > SEQ_LEN && originalLength <= 2 * SEQ_LEN) {
        setMessage(`Downsampled sequence from ${originalLength} to ${SEQ_LEN} frames.`);
        setMessageType('info');
      }

      if (processed.length === SEQ_LEN) {
        sequenceBufferRef.current = processed;
        setShowDiscardPrompt(true);
      }
    }
  };
  
  const handleSave = () => {
    const buffer = sequenceBufferRef.current;

    if (buffer.length !== SEQ_LEN) {
      setMessage(`Need ${SEQ_LEN} frames, currently have ${buffer.length}`);
      setMessageType('error');
      return;
    }

    const normalizedLabel = label.trim().toLowerCase();
    const data: CollectedData = {
      label: normalizedLabel,
      data: buffer,
      frameCount: buffer.length,
      timestamp: new Date().toISOString()
    };

    if (onDataCollected) {
      onDataCollected(data);
    }

    setCollectedData(prev => [...prev, data]);
    setMessage(`Saved sequence for label: ${normalizedLabel}`); 
    setMessageType('success');
    setCollectedCount(prev => prev + 1);
    sequenceBufferRef.current = [];
    setFrameCount(0);
    setShowDiscardPrompt(false);
  };

  const handleDiscard = () => {
    sequenceBufferRef.current = [];
    setFrameCount(0);
    setShowDiscardPrompt(false);
    setMessage('Sequence discarded.');
    setMessageType('info');
  };

  const handleReset = () => {
    setLabel('');
    sequenceBufferRef.current = [];
    setFrameCount(0);
    setIsRecording(false);
    setMessage('');
    setCollectedCount(0);
    setCollectedData([]);
    setShowDiscardPrompt(false);
  };

  const handleExportToCSV = () => {
    if (collectedData.length === 0) {
      setMessage('No data to export. Collect some samples first.');
      setMessageType('error');
      return;
    }

    exportDataToCSV(collectedData);
    setMessage(`✓ Exported ${collectedData.length} samples to CSV (${SEQ_LEN} frames × ${FEATURES_PER_FRAME} features per sample)`);
    setMessageType('success');
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.code === 'Space' && !showDiscardPrompt) {
        event.preventDefault();
        handleStartStopRecording();
      } else if (event.code === 'KeyD' && showDiscardPrompt) {
        event.preventDefault();
        handleDiscard();
      } else if (event.code === 'KeyS' && showDiscardPrompt) {
        event.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [label, isRecording, showDiscardPrompt, handDetected]);

  const getMessageClasses = (): string => {
    const baseClasses = 'p-4 mb-4 rounded border';
    if (messageType === 'error') return `${baseClasses} bg-red-50 border-red-500 text-red-900`;
    if (messageType === 'success') return `${baseClasses} bg-green-50 border-green-500 text-green-900`;
    return `${baseClasses} bg-blue-50 border-blue-500 text-blue-900`;
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Data Collection</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="space-y-4 md:col-span-1">
          <div>
            <label className="block mb-1 text-sm font-medium">Sign Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., A, B, Hello"
              disabled={isRecording}
              className="p-2 w-full border border-gray-300 rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div className={`p-3 rounded border ${isRecording ? 'bg-red-50 border-red-500' : 'bg-green-50 border-green-500'}`}>
            <div className="text-sm">
              <strong>Status:</strong>
            </div>
            <div className="text-sm text-gray-700">
              Label: {label || '(none)'} · Samples: {collectedCount} · Frames: {frameCount}/{SEQ_LEN}
            </div>
            <div className="text-sm mt-1">
              {isRecording ? '🔴 RECORDING' : '⚪ READY'} {handDetected ? ' · ✓ Hand Detected' : ' · ✗ No Hand'}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleStartStopRecording}
              disabled={!label.trim() && !isRecording}
              className={`px-4 py-2 text-white rounded font-semibold ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} disabled:bg-gray-400 disabled:cursor-not-allowed`}
            >
              {isRecording ? 'Stop (SPACE)' : 'Start (SPACE)'}
            </button>

            <button onClick={handleReset} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Reset</button>

            <button onClick={handleExportToCSV} disabled={collectedCount === 0} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed">
              Export CSV ({collectedCount})
            </button>
          </div>

          {message && (
            <div className={getMessageClasses()}>
              {message}
            </div>
          )}

          {showDiscardPrompt && (
            <div className="p-4 bg-orange-50 border-2 border-orange-500 rounded space-y-2">
              <div className="font-bold text-sm">Sequence captured! ({SEQ_LEN} frames × {FEATURES_PER_FRAME} features)</div>
              <div className="flex gap-2">
                <button onClick={handleSave} className="px-3 py-2 bg-green-500 text-white rounded">Save (S)</button>
                <button onClick={handleDiscard} className="px-3 py-2 bg-red-500 text-white rounded">Discard (D)</button>
              </div>
            </div>
          )}

          <div className="p-3 bg-gray-50 rounded text-sm">
            <strong>Instructions: </strong>
             <ol className="mt-2 list-decimal list-inside text-sm space-y-1">
              <li>Enter a label and make sure your hand is visible.</li>
              <li>Press SPACE (or click Start) to record; Gesture the labelled sign.</li>
              <li>Press SPACE to stop recording; S to save the sequence; D to discard it.</li>
              <li>Continue to do this until you have the desired amount of sample.</li>
              <li>You can clear all samples stored using the button "Reset"</li>
              <li>Once done, export to CSV using the button, save the file and go to Retraing, if you want to retrain a model.</li>
            </ol>
          </div>
        </div>

        {/* Right column: Webcam + detailed instructions */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <div className="bg-gray-50 rounded p-2 flex items-center justify-center w-full">
            <div className="overflow-hidden rounded-lg">
              <WebCam
                onLandmarksDetected={handleLandmarksDetected}
                setHandDetected={setHandDetected}
                isActive={true}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
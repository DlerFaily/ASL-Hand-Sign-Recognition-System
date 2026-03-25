import React, { useState, useRef } from 'react';

interface FileUploaderProps {
  onUpload: (file: File) => Promise<void>;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onUpload }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSelectClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  //--------------------------------------------------------------------------------------------------------------------------------
  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  //--------------------------------------------------------------------------------------------------------------------------------

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await onUpload(selectedFile);
      alert("Upload Successful!");
      setSelectedFile(null);
    } catch (error) {
      console.error("Error:", error);
      alert((error as any)?.message || "Error uploading file.");
    }
  };

  return (
    <div className="text-center w-full">
      <div
        className={`border-2 border-dashed p-10 rounded-lg bg-gray-50 mt-5 transition-all duration-200 ${isDragging ? 'border-green-500 bg-green-50 scale-105' : 'border-gray-300'
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p className="text-gray-600 mb-4">
          {isDragging ? 'Drop it here!' : 'Drag & Drop files here or click select'}
        </p>

        <button
          className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded font-bold"
          onClick={handleSelectClick}
        >
          Select Files
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        {selectedFile && (
          <div className="mt-5 pt-5 border-t border-gray-200">
            <p className="text-sm text-gray-700">Selected: <strong>{selectedFile.name}</strong></p>
            <button
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded mt-3"
              onClick={handleUpload}
            >
              Confirm Upload
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUploader;
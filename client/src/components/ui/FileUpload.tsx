import React, { useRef, useState } from 'react';
import { uploadData } from 'aws-amplify/storage';
import LoadingSpinner from './LoadingSpinner';

interface Props {
  accept?: string;
  path: string;
  onUploadComplete: (s3Key: string) => void;
  label?: string;
}

export default function FileUpload({ accept = '.csv,.xlsx,.xls', path, onUploadComplete, label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setIsUploading(true);
    try {
      const key = `${path}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      await uploadData({ path: key, data: file }).result;
      setUploadedName(file.name);
      onUploadComplete(key);
    } catch (e) {
      setError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        border: '2px dashed #d1d5db',
        borderRadius: 8,
        padding: '24px 16px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'border-color 0.2s',
        background: '#f9fafb',
      }}
    >
      <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={handleChange} />

      {isUploading ? (
        <LoadingSpinner label="Uploading..." />
      ) : uploadedName ? (
        <div>
          <div style={{ color: '#16a34a', fontWeight: 600, marginBottom: 4 }}>✓ {uploadedName}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Click to replace</div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📂</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{label ?? 'Click or drag file here'}</div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>Accepted: {accept}</div>
        </div>
      )}

      {error && <div style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{error}</div>}
    </div>
  );
}

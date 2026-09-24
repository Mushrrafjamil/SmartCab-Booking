'use client';

import { useRef, useState, DragEvent, ChangeEvent } from 'react';
import { Upload, X } from 'lucide-react';

interface FileUploadProps {
  label: string;
  accept?: string;
  onChange: (file: File | null) => void;
  preview?: boolean;
}

export default function FileUpload({ label, accept = 'image/jpeg,image/png,image/webp', onChange, preview = true }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File | null) => {
    if (f && f.size > 5 * 1024 * 1024) return alert('Max file size is 5MB');
    setFile(f);
    onChange(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(f ? URL.createObjectURL(f) : null);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0] || null);
  };

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed p-4 transition ${dragOver ? 'border-amber-500 bg-amber-50' : 'border-slate-300 hover:border-amber-400'}`}
      >
        {previewUrl ? (
          <div className="relative">
            <img src={previewUrl} alt="Preview" className="h-24 w-24 rounded-lg object-cover" />
            <button type="button" onClick={(e) => { e.stopPropagation(); handleFile(null); }}
              className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white">
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 text-slate-400" />
            <p className="mt-2 text-sm text-slate-500">Drag & drop or click to upload</p>
            <p className="text-xs text-slate-400">JPG, PNG, WEBP · Max 5MB</p>
          </>
        )}
        <input ref={inputRef} type="file" accept={accept} className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleFile(e.target.files?.[0] || null)} />
      </div>
      {file && <p className="mt-1 text-xs text-slate-500">{file.name}</p>}
    </div>
  );
}

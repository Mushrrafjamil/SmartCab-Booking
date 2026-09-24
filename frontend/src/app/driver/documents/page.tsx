'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { driverService, API_BASE } from '@/services';
import { toast } from '@/components/auth/Toast';
import { Upload, FileText, Trash2, Eye, Download, Loader2 } from 'lucide-react';

interface DocEntry {
  label: string;
  url: string | null;
}

const DOC_TYPES = [
  { key: 'license-front', label: 'Driving License (Front)' },
  { key: 'license-back', label: 'Driving License (Back)' },
  { key: 'aadhaar-front', label: 'Aadhaar Card (Front)' },
  { key: 'aadhaar-back', label: 'Aadhaar Card (Back)' },
  { key: 'pan', label: 'PAN Card' },
  { key: 'rc-book', label: 'RC Book' },
  { key: 'insurance', label: 'Vehicle Insurance' },
];

const fileUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  const base = API_BASE.replace(/\/api\/?$/, '');
  return `${base}${path}`;
};

export default function DriverDocumentsPage() {
  const [documents, setDocuments] = useState<Record<string, DocEntry>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    try {
      const { data } = await driverService.getDocuments();
      setDocuments(data.documents || {});
    } catch {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (docType: string, file: File) => {
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
      toast.error('Only JPG, PNG, WEBP, or PDF files allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5 MB');
      return;
    }

    setUploading(docType);
    try {
      const { data } = await driverService.uploadDocument(docType, file);
      setDocuments(data.documents || {});
      toast.success(`${DOC_TYPES.find((d) => d.key === docType)?.label || 'Document'} uploaded`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Upload failed';
      toast.error(msg);
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (docType: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      const { data } = await driverService.deleteDocument(docType);
      setDocuments(data.documents || {});
      toast.success('Document deleted');
    } catch {
      toast.error('Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Documents</h1>
      <p className="mb-6 text-sm text-slate-500">Upload JPG, PNG, WEBP, or PDF (max 5 MB)</p>

      <div className="space-y-3">
        {DOC_TYPES.map(({ key, label }) => {
          const doc = documents[key];
          const url = fileUrl(doc?.url || null);
          const isPdf = url?.endsWith('.pdf');
          const busy = uploading === key;

          return (
            <div key={key} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="font-medium text-slate-900">{label}</p>
                    <p className="text-xs text-slate-500">{url ? 'Uploaded' : 'Not uploaded'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {url && (
                    <>
                      <a href={url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                        <Eye className="h-4 w-4" /> View
                      </a>
                      <a href={url} download
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                        <Download className="h-4 w-4" /> Download
                      </a>
                      <button onClick={() => handleDelete(key)}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" /> Delete
                      </button>
                    </>
                  )}
                  <input
                    ref={(el) => { fileRefs.current[key] = el; }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(key, file);
                      e.target.value = '';
                    }}
                  />
                  <button
                    disabled={busy}
                    onClick={() => fileRefs.current[key]?.click()}
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4" />
                    {busy ? 'Uploading…' : url ? 'Replace' : 'Upload'}
                  </button>
                </div>
              </div>

              {url && !isPdf && (
                <img src={url} alt={label} className="mt-3 max-h-32 rounded-lg border border-slate-100 object-contain" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

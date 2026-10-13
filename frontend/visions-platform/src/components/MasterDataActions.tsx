import { useRef, useState } from 'react';
import { Download, Plus, Upload } from 'lucide-react';
import { getAuthHeaders } from '../lib/auth';

type Resource = 'regions' | 'centres' | 'students';

export default function MasterDataActions({ resource, onAdd, onUploaded, showAdd = true }: { resource: Resource; onAdd: () => void; onUploaded: () => void; showAdd?: boolean }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  const exportExcel = async () => {
    const response = await fetch(resource === 'students' ? '/api/students/export/' : `/api/masters/${resource}/export/`, { headers: getAuthHeaders() });
    if (!response.ok) {
      setMessage('Unable to export Excel data.');
      return;
    }
    const link = document.createElement('a');
    link.href = URL.createObjectURL(await response.blob());
    link.download = `${resource}.xlsx`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const uploadExcel = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setMessage('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(resource === 'students' ? '/api/students/bulk-upload/' : `/api/masters/${resource}/bulk-upload/`, { method: 'POST', headers: getAuthHeaders(), body: formData });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.file?.[0] || payload?.detail || 'Unable to upload Excel data.');
      setMessage(`${payload.created} created, ${payload.updated} updated, ${payload.skipped} unchanged.`);
      onUploaded();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to upload Excel data.');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button type="button" onClick={exportExcel} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
        <Download size={16} /> Import as Excel
      </button>
      <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 disabled:opacity-60">
        <Upload size={16} /> {uploading ? 'Uploading...' : 'Bulk Upload'}
      </button>
      {showAdd ? <button type="button" onClick={onAdd} title={`Add ${resource === 'regions' ? 'Region' : resource === 'centres' ? 'Centre' : 'Student'}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-700">
        <Plus size={18} />
      </button> : null}
      <input ref={fileInput} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(event) => uploadExcel(event.target.files?.[0])} />
      {message ? <p className="w-full text-right text-xs text-slate-600">{message}</p> : null}
    </div>
  );
}
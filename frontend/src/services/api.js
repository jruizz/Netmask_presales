const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function apiFetch(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : null;
  if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
  return data;
}

export async function apiDownload(path, token) {
  const res = await fetch(`${API_BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Error ${res.status} al descargar el archivo`);
  const disposition = res.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="(.+)"/);
  const filename = match ? match[1] : 'documento';
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

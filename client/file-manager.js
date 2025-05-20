const API_BASE = 'http://localhost:8000/api';

// 上傳檔案
export async function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('檔案上傳失敗');
  }
}

// 獲取檔案列表
export async function fetchFileList() {
  const response = await fetch(`${API_BASE}/files`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('無法獲取檔案列表');
  }

  return await response.json();
}

// 下載檔案
export async function downloadFile(fileName) {
  const response = await fetch(`${API_BASE}/download?file=${encodeURIComponent(fileName)}`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('檔案下載失敗');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
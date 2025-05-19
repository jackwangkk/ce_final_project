export function showToast(message, type = 'info') {
  // 建立提示元素
  const toast = document.createElement('div');
  toast.innerText = message;
  toast.style.position = 'fixed';
  toast.style.bottom = '30px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.padding = '12px 24px';
  toast.style.background = type === 'error' ? '#e74c3c' : (type === 'success' ? '#27ae60' : '#333');
  toast.style.color = '#fff';
  toast.style.borderRadius = '6px';
  toast.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
  toast.style.zIndex = 9999;
  toast.style.fontSize = '16px';
  toast.style.opacity = '0.95';

  document.body.appendChild(toast);

  // 幾秒後自動消失
  setTimeout(() => {
    toast.remove();
  }, 2000);
}
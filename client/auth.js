// auth.js - 用戶認證模組
import { showToast } from './ui.js'; // 假設有 UI 工具函數
//import { generateQRCode } from './qrcode.js';

// 認證狀態管理
let currentUser = null;
let authToken = localStorage.getItem('authToken') || null;

// API 基礎設定
const API_BASE = 'http://localhost:8000/api';
const HEADERS = {
  'Content-Type': 'application/json',
};

// 錯誤處理器
function handleError(error, fallbackMessage = '發生未知錯誤') {
  const message = error.response?.data?.error || fallbackMessage;
  showToast(message, 'error');
  throw new Error(message);
}

// 用戶註冊 (含 2FA 初始化)
export async function registerUser(username, password) {
  try {
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) throw await response.json();
    /*
    const data = await response.json();
    
    // 顯示 2FA QR Code
    if (data.otpauth_url) {
      generateQRCode('qrcode-container', data.otpauth_url);
      return { needs2FA: true, tempToken: data.temp_token };
    }
    */

    showToast('註冊成功', 'success');
    return { success: true };
  } catch (error) {
    return handleError(error, '註冊失敗');
  }
}

// 登入與 2FA 驗證整合
export async function loginUser(username, password, otp = null) {
  try {
    const body = { username, password };
    if (otp) body.otp = otp;

    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(body),
    });

    if (!response.ok) throw await response.json();

    const { token, user } = await response.json();
    /*
    const { token, user, requires2FA } = await response.json();

    if (requires2FA) {
      return { requires2FA: true };
    }
    */

    // 儲存認證狀態
    authToken = token;
    currentUser = user;
    localStorage.setItem('authToken', token);

    showToast(`歡迎回來，${user.username}`);
    return { success: true };
  } catch (error) {
    return handleError(error, '登入失敗');
  }
}

// 2FA 綁定流程
export async function setup2FA(verificationCode) {
  try {
    const response = await fetch(`${API_BASE}/enable-2fa`, {
      method: 'POST',
      headers: {
        ...HEADERS,
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ code: verificationCode }),
    });

    if (!response.ok) throw await response.json();

    showToast('2FA 已成功啟用', 'success');
    return { success: true };
  } catch (error) {
    return handleError(error, '2FA 綁定失敗');
  }
}

// 權杖驗證與自動刷新
export async function validateToken() {
  if (!authToken) return false;

  try {
    const response = await fetch(`${API_BASE}/validate-token`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (!response.ok) throw new Error('Invalid token');
    
    const { user } = await response.json();
    currentUser = user;
    return true;
  } catch (error) {
    logoutUser();
    return false;
  }
}

// 登出功能
export function logoutUser() {
  authToken = null;
  currentUser = null;
  localStorage.removeItem('authToken');
  showToast('已登出系統');
}

// 取得當前用戶狀態
export function getCurrentUser() {
  return currentUser;
}

// 封裝認證請求
export async function authFetch(url, options = {}) {
  const headers = {
    ...options.headers,
    Authorization: `Bearer ${authToken}`,
  };

  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    logoutUser();
    window.location.href = '/login';
    return;
  }

  return response;
}

// 初始化認證狀態
(async function initAuth() {
  if (authToken) {
    const isValid = await validateToken();
    if (!isValid) logoutUser();
  }
})();
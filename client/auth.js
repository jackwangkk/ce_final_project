// auth.js - Fixed User Authentication Module
import { showToast } from './ui.js';

// Authentication state management
let currentUser = null;
let authToken = null;

// API base configuration
const API_BASE = 'http://localhost:8000/api';
const HEADERS = {
  'Content-Type': 'application/json',
};

// Error handler
function handleError(error, fallbackMessage = 'Unknown error occurred') {
  console.error('Auth error:', error);
  const message = error.response?.data?.error || error.message || fallbackMessage;
  showToast(message, 'error');
  throw new Error(message);
}

/**
 * Save private key to IndexedDB
 * @param {CryptoKey} privateKey - RSA private key
 * @param {string} userId - User ID
 */
async function savePrivateKeyToIndexedDB(privateKey, userId) {
  try {
    console.log('Saving private key to IndexedDB...');
    
    // Export private key to PKCS8 format
    const exportedKey = await window.crypto.subtle.exportKey("pkcs8", privateKey);

    // Open IndexedDB
    const dbRequest = indexedDB.open("KeyStorage", 1);

    return new Promise((resolve, reject) => {
      dbRequest.onupgradeneeded = function (event) {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("keys")) {
          db.createObjectStore("keys", { keyPath: "id" });
        }
      };

      dbRequest.onsuccess = function (event) {
        const db = event.target.result;
        const transaction = db.transaction("keys", "readwrite");
        const store = transaction.objectStore("keys");

        // Save private key with userId as id
        const putRequest = store.put({ id: userId, key: exportedKey });
        
        putRequest.onsuccess = function() {
          console.log(`Private key saved to IndexedDB with id: ${userId}`);
          resolve();
        };
        
        putRequest.onerror = function() {
          reject(new Error("Failed to save private key"));
        };
      };

      dbRequest.onerror = function () {
        reject(new Error("Cannot access IndexedDB"));
      };
    });
  } catch (error) {
    console.error('Error saving private key:', error);
    throw error;
  }
}

/**
 * Get private key from IndexedDB
 * @param {string} userId - User ID
 * @returns {Promise<CryptoKey>} RSA private key
 */
async function getPrivateKeyFromIndexedDB(userId) {
  const dbRequest = indexedDB.open("KeyStorage", 1);

  return new Promise((resolve, reject) => {
    dbRequest.onsuccess = function (event) {
      const db = event.target.result;
      const transaction = db.transaction("keys", "readonly");
      const store = transaction.objectStore("keys");
      const getRequest = store.get(userId);

      getRequest.onsuccess = async function () {
        if (getRequest.result) {
          try {
            const keyBuffer = getRequest.result.key;

            // Import private key
            const privateKey = await window.crypto.subtle.importKey(
              "pkcs8",
              keyBuffer,
              { name: "RSA-OAEP", hash: "SHA-256" },
              true,
              ["decrypt"]
            );
            resolve(privateKey);
          } catch (error) {
            reject(new Error("Failed to import private key"));
          }
        } else {
          reject(new Error("Private key not found"));
        }
      };

      getRequest.onerror = function () {
        reject(new Error("Failed to read private key"));
      };
    };

    dbRequest.onerror = function () {
      reject(new Error("Cannot access IndexedDB"));
    };
  });
}

/**
 * User registration with RSA key generation
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise<Object>} Registration result
 */
export async function registerUser(username, password) {
  try {
    console.log('Starting user registration...');
    
    // Step 1: Generate RSA key pair
    console.log('Generating RSA key pair...');
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true, // Extractable
      ["encrypt", "decrypt"]
    );
    console.log('RSA key pair generated successfully');

    // Step 2: Save private key to IndexedDB
    console.log('Saving private key to IndexedDB...');
    await savePrivateKeyToIndexedDB(keyPair.privateKey, username);

    // Step 3: Export public key for server
    console.log('Exporting public key...');
    const publicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKey)));

    // Step 4: Send registration request to server
    console.log('Sending registration request to server...');
    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ 
        username, 
        password, 
        public_key: publicKeyBase64 
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Registration failed');
    }

    const data = await response.json();
    console.log('Registration successful');
    showToast('Registration successful! You can now log in.', 'success');
    
    return { success: true, data };
  } catch (error) {
    console.error('Registration failed:', error);
    return handleError(error, 'Registration failed');
  }
}

/**
 * User login
 * @param {string} username - Username
 * @param {string} password - Password
 * @param {string} otp - Optional OTP code
 * @returns {Promise<Object>} Login result
 */
export async function loginUser(username, password, otp = null) {
  try {
    console.log('Starting user login...');
    
    const body = { username, password };
    if (otp) body.otp = otp;

    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Login failed');
    }

    const { token, user } = await response.json();

    // Store authentication state in memory (not localStorage)
    authToken = token;
    currentUser = user;

    console.log('Login successful');
    showToast(`Welcome back, ${user.username}!`, 'success');
    
    return { success: true, user, token };
  } catch (error) {
    console.error('Login failed:', error);
    return handleError(error, 'Login failed');
  }
}

/**
 * Logout user
 */
export function logoutUser() {
  authToken = null;
  currentUser = null;
  console.log('User logged out');
  showToast('Logged out successfully', 'info');
}

/**
 * Get current user
 * @returns {Object|null} Current user object or null
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Get current auth token
 * @returns {string|null} Current auth token or null
 */
export function getAuthToken() {
  return authToken;
}

/**
 * Check if user is authenticated
 * @returns {boolean} True if authenticated
 */
export function isAuthenticated() {
  return !!(authToken && currentUser);
}

/**
 * Make authenticated request
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export async function authFetch(url, options = {}) {
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${authToken}`,
  };

  const response = await fetch(url, { ...options, headers });
  
  if (response.status === 401) {
    logoutUser();
    throw new Error('Authentication required');
  }

  return response;
}

console.log('Auth module loaded successfully');
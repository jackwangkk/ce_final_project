// auth_debug.js - Debug version with detailed logging

// Simple toast function for debugging
function simpleToast(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  alert(`${type.toUpperCase()}: ${message}`);
}

// Authentication state
let currentUser = null;
let authToken = null;

const API_BASE = 'http://localhost:8000/api';

/**
 * User registration with detailed debugging
 */
export async function registerUser(username, password) {
  console.log('=== STARTING REGISTRATION DEBUG ===');
  
  try {
    // Step 1: Validate inputs
    console.log('Step 1: Validating inputs...');
    if (!username || !password) {
      throw new Error('Username and password required');
    }
    console.log('✅ Inputs validated');

    // Step 2: Test crypto API availability
    console.log('Step 2: Testing crypto API...');
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('Web Crypto API not available');
    }
    console.log('✅ Crypto API available');

    // Step 3: Generate RSA key pair
    console.log('Step 3: Starting RSA key generation...');
    console.log('This may take a few seconds...');
    
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );
    
    console.log('✅ RSA key pair generated successfully!');
    console.log('Public key:', keyPair.publicKey);
    console.log('Private key:', keyPair.privateKey);

    // Step 4: Export public key
    console.log('Step 4: Exporting public key...');
    const publicKeyData = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    console.log('✅ Public key exported');
    
    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyData)));
    console.log('✅ Public key converted to base64');
    console.log('Public key length:', publicKeyBase64.length);

    // Step 5: Save private key to IndexedDB
    console.log('Step 5: Saving private key to IndexedDB...');
    await savePrivateKeyToIndexedDB(keyPair.privateKey, username);
    console.log('✅ Private key saved to IndexedDB');

    // Step 6: Send to server
    console.log('Step 6: Sending registration to server...');
    console.log('API URL:', `${API_BASE}/register`);
    
    const requestBody = {
      username: username,
      password: password,
      public_key: publicKeyBase64
    };
    console.log('Request body:', requestBody);

    const response = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error response:', errorText);
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ Server response:', result);

    simpleToast('Registration successful!', 'success');
    console.log('=== REGISTRATION COMPLETED SUCCESSFULLY ===');
    
    return { success: true };

  } catch (error) {
    console.error('❌ REGISTRATION FAILED:', error);
    console.error('Error stack:', error.stack);
    simpleToast(`Registration failed: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Save private key to IndexedDB with debugging
 */
async function savePrivateKeyToIndexedDB(privateKey, userId) {
  console.log('Saving private key to IndexedDB...');
  
  try {
    // Export private key
    console.log('Exporting private key...');
    const exportedKey = await window.crypto.subtle.exportKey("pkcs8", privateKey);
    console.log('✅ Private key exported');

    // Open IndexedDB
    console.log('Opening IndexedDB...');
    const dbRequest = indexedDB.open("KeyStorage", 1);

    return new Promise((resolve, reject) => {
      dbRequest.onupgradeneeded = function (event) {
        console.log('Creating IndexedDB object store...');
        const db = event.target.result;
        if (!db.objectStoreNames.contains("keys")) {
          db.createObjectStore("keys", { keyPath: "id" });
          console.log('✅ Object store created');
        }
      };

      dbRequest.onsuccess = function (event) {
        console.log('IndexedDB opened successfully');
        const db = event.target.result;
        const transaction = db.transaction("keys", "readwrite");
        const store = transaction.objectStore("keys");

        const putRequest = store.put({ id: userId, key: exportedKey });
        
        putRequest.onsuccess = function() {
          console.log('✅ Private key saved to IndexedDB');
          resolve();
        };
        
        putRequest.onerror = function(event) {
          console.error('❌ Failed to save private key:', event);
          reject(new Error("Failed to save private key"));
        };
      };

      dbRequest.onerror = function (event) {
        console.error('❌ IndexedDB error:', event);
        reject(new Error("Cannot access IndexedDB"));
      };
    });
  } catch (error) {
    console.error('❌ Error in savePrivateKeyToIndexedDB:', error);
    throw error;
  }
}

/**
 * Simple login function
 */
export async function loginUser(username, password) {
  console.log('=== STARTING LOGIN ===');
  
  try {
    console.log('Sending login request...');
    
    const response = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    console.log('Login response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Login error:', errorText);
      throw new Error(`Login failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('Login result:', result);

    authToken = result.token;
    currentUser = result.user;

    simpleToast('Login successful!', 'success');
    console.log('=== LOGIN COMPLETED ===');
    
    return { success: true, user: result.user };

  } catch (error) {
    console.error('❌ LOGIN FAILED:', error);
    simpleToast(`Login failed: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Get current user
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Logout
 */
export function logoutUser() {
  authToken = null;
  currentUser = null;
  console.log('User logged out');
}

console.log('🔧 DEBUG AUTH MODULE LOADED');
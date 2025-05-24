// file_manager.js - Fixed File Manager with Encryption

const API_BASE = 'http://localhost:8000/api';

/**
 * Upload encrypted file
 */
export async function uploadFile(file, username) {
  try {
    console.log('Starting encrypted file upload...');
    
    // Step 1: Generate AES key and encrypt file
    const aesKey = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const fileBuffer = await file.arrayBuffer();
    const encryptedData = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      fileBuffer
    );
    
    // Step 2: Get user's public key
    const pubKeyResponse = await fetch(`${API_BASE}/user-public-key?username=${username}`);
    if (!pubKeyResponse.ok) throw new Error('Failed to get public key');
    const { public_key } = await pubKeyResponse.json();
    
    // Import public key
    const publicKeyBuffer = Uint8Array.from(atob(public_key), c => c.charCodeAt(0));
    const publicKey = await crypto.subtle.importKey(
      "spki",
      publicKeyBuffer,
      { name: "RSA-OAEP", hash: "SHA-256" },
      true,
      ["encrypt"]
    );
    
    // Step 3: Encrypt AES key with RSA
    const rawAESKey = await crypto.subtle.exportKey("raw", aesKey);
    const encryptedAESKey = await crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      publicKey,
      rawAESKey
    );
    
    // Step 4: Store encrypted key in KMS
    const encryptedKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedAESKey)));
    const ivBase64 = btoa(String.fromCharCode(...iv));
    
    const storeKeyResponse = await fetch(`${API_BASE}/store-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        filename: file.name,
        encrypted_key: encryptedKeyBase64,
        iv: ivBase64
      }),
    });
    
    if (!storeKeyResponse.ok) throw new Error('Failed to store key');
    
    // Step 5: Upload encrypted file
    const formData = new FormData();
    const encryptedBlob = new Blob([encryptedData]);
    formData.append('file', encryptedBlob, `${file.name}.encrypted`);
    
    const uploadResponse = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!uploadResponse.ok) throw new Error('File upload failed');
    
    console.log('File uploaded successfully');
    return { success: true };
    
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
}

/**
 * Get file list from KMS
 */
export async function fetchFileList(username) {
  try {
    const response = await fetch(`${API_BASE}/user-files?username=${username}`);
    if (!response.ok) throw new Error('Failed to get file list');
    
    const { files } = await response.json();
    return files.map(f => f.filename);
  } catch (error) {
    console.error('Failed to get file list:', error);
    return [];
  }
}

/**
 * Download and decrypt file
 */
export async function downloadFile(fileName, username) {
  try {
    console.log('Starting encrypted file download...');
    
    // Step 1: Get encrypted key from KMS
    const keyResponse = await fetch(`${API_BASE}/request-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, filename: fileName }),
    });
    
    if (!keyResponse.ok) throw new Error('Failed to get encryption key');
    const { encrypted_key, iv } = await keyResponse.json();
    
    // Step 2: Download encrypted file
    const fileResponse = await fetch(`${API_BASE}/download?file=${encodeURIComponent(fileName + '.encrypted')}`);
    if (!fileResponse.ok) throw new Error('Failed to download file');
    const encryptedFileData = await fileResponse.arrayBuffer();
    
    // Step 3: Get private key from IndexedDB
    const privateKey = await getPrivateKeyFromIndexedDB(username);
    
    // Step 4: Decrypt AES key
    const encryptedKeyBuffer = Uint8Array.from(atob(encrypted_key), c => c.charCodeAt(0));
    const rawAESKey = await crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      encryptedKeyBuffer
    );
    
    const aesKey = await crypto.subtle.importKey(
      "raw",
      rawAESKey,
      { name: "AES-GCM" },
      true,
      ["decrypt"]
    );
    
    // Step 5: Decrypt file
    const ivBuffer = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
    const decryptedData = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBuffer },
      aesKey,
      encryptedFileData
    );
    
    // Step 6: Download file
    const blob = new Blob([decryptedData]);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    
    console.log('File downloaded successfully');
    
  } catch (error) {
    console.error('Download failed:', error);
    throw error;
  }
}

/**
 * Get private key from IndexedDB
 */
async function getPrivateKeyFromIndexedDB(userId) {
  return new Promise((resolve, reject) => {
    const dbRequest = indexedDB.open("KeyStorage", 1);
    
    dbRequest.onsuccess = function(event) {
      const db = event.target.result;
      const transaction = db.transaction("keys", "readonly");
      const store = transaction.objectStore("keys");
      const getRequest = store.get(userId);
      
      getRequest.onsuccess = async function() {
        if (getRequest.result) {
          try {
            const keyBuffer = getRequest.result.key;
            const privateKey = await crypto.subtle.importKey(
              "pkcs8",
              keyBuffer,
              { name: "RSA-OAEP", hash: "SHA-256" },
              true,
              ["decrypt"]
            );
            resolve(privateKey);
          } catch (error) {
            reject(error);
          }
        } else {
          reject(new Error("Private key not found"));
        }
      };
      
      getRequest.onerror = () => reject(new Error("Failed to read private key"));
    };
    
    dbRequest.onerror = () => reject(new Error("Cannot access IndexedDB"));
  });
}
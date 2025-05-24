// kmsController.js - Key Management Service Backend
// This module handles storing and retrieving encrypted AES keys

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// File to store encrypted keys
const KEYS_FILE = path.join(__dirname, 'encrypted_keys.json');

/**
 * Initialize keys storage file if it doesn't exist
 */
function initializeKeysFile() {
  if (!fs.existsSync(KEYS_FILE)) {
    console.log('Creating encrypted_keys.json file...');
    fs.writeFileSync(KEYS_FILE, JSON.stringify({}), 'utf8');
  }
}

/**
 * Read encrypted keys from storage
 * @returns {Object} All stored encrypted keys
 */
function readEncryptedKeys() {
  try {
    initializeKeysFile();
    const data = fs.readFileSync(KEYS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading encrypted keys:', error);
    return {};
  }
}

/**
 * Write encrypted keys to storage
 * @param {Object} keys - Encrypted keys object to save
 */
function writeEncryptedKeys(keys) {
  try {
    fs.writeFileSync(KEYS_FILE, JSON.stringify(keys, null, 2), 'utf8');
    console.log('Encrypted keys saved successfully');
  } catch (error) {
    console.error('Error writing encrypted keys:', error);
    throw error;
  }
}

/**
 * API Endpoint: Store encrypted AES key
 * POST /api/store-key
 * 
 * Expected body:
 * {
 *   "username": "user123",
 *   "filename": "document.pdf",
 *   "encrypted_key": "base64-encoded-encrypted-aes-key",
 *   "iv": "base64-encoded-initialization-vector"
 * }
 */
exports.storeKey = (req, res) => {
  try {
    console.log('Received request to store encrypted key');
    
    // 1. Extract data from request body
    const { username, filename, encrypted_key, iv } = req.body;
    
    // 2. Validate required fields
    if (!username || !filename || !encrypted_key || !iv) {
      console.error('Missing required fields in store-key request');
      return res.status(400).json({
        error: 'Missing required fields: username, filename, encrypted_key, iv'
      });
    }
    
    console.log(`Storing key for user: ${username}, file: ${filename}`);
    
    // 3. Read existing encrypted keys
    const encryptedKeys = readEncryptedKeys();
    
    // 4. Create user entry if it doesn't exist
    if (!encryptedKeys[username]) {
      encryptedKeys[username] = {};
      console.log(`Created new user entry for: ${username}`);
    }
    
    // 5. Generate unique key ID for this file
    const keyId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    
    // 6. Store the encrypted key with metadata
    encryptedKeys[username][filename] = {
      keyId: keyId,
      encrypted_key: encrypted_key, // RSA-encrypted AES key (base64)
      iv: iv, // Initialization vector (base64)
      timestamp: timestamp,
      filename: filename
    };
    
    // 7. Save to file
    writeEncryptedKeys(encryptedKeys);
    
    console.log(`Key stored successfully with ID: ${keyId}`);
    
    // 8. Return success response
    res.status(200).json({
      success: true,
      message: 'Key stored successfully',
      keyId: keyId
    });
    
  } catch (error) {
    console.error('Error in storeKey:', error);
    res.status(500).json({
      error: 'Internal server error while storing key',
      details: error.message
    });
  }
};

/**
 * API Endpoint: Request encrypted AES key
 * POST /api/request-key
 * 
 * Expected body:
 * {
 *   "username": "user123",
 *   "filename": "document.pdf"
 * }
 */
exports.requestKey = (req, res) => {
  try {
    console.log('Received request to retrieve encrypted key');
    
    // 1. Extract data from request body
    const { username, filename } = req.body;
    
    // 2. Validate required fields
    if (!username || !filename) {
      console.error('Missing required fields in request-key request');
      return res.status(400).json({
        error: 'Missing required fields: username, filename'
      });
    }
    
    console.log(`Retrieving key for user: ${username}, file: ${filename}`);
    
    // 3. Read encrypted keys from storage
    const encryptedKeys = readEncryptedKeys();
    
    // 4. Check if user exists
    if (!encryptedKeys[username]) {
      console.error(`User not found: ${username}`);
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    // 5. Check if file key exists for user
    if (!encryptedKeys[username][filename]) {
      console.error(`File key not found: ${filename} for user: ${username}`);
      return res.status(404).json({
        error: 'File key not found'
      });
    }
    
    // 6. Get the encrypted key data
    const keyData = encryptedKeys[username][filename];
    
    console.log(`Key retrieved successfully for file: ${filename}`);
    
    // 7. Return encrypted key and IV
    res.status(200).json({
      success: true,
      keyId: keyData.keyId,
      encrypted_key: keyData.encrypted_key, // RSA-encrypted AES key
      iv: keyData.iv, // Initialization vector
      filename: keyData.filename,
      timestamp: keyData.timestamp
    });
    
  } catch (error) {
    console.error('Error in requestKey:', error);
    res.status(500).json({
      error: 'Internal server error while retrieving key',
      details: error.message
    });
  }
};

/**
 * API Endpoint: List all files for a user (optional - for debugging)
 * GET /api/user-files?username=user123
 */
exports.getUserFiles = (req, res) => {
  try {
    const { username } = req.query;
    
    if (!username) {
      return res.status(400).json({
        error: 'Missing username parameter'
      });
    }
    
    const encryptedKeys = readEncryptedKeys();
    
    if (!encryptedKeys[username]) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    // Return list of files for this user
    const userFiles = Object.keys(encryptedKeys[username]).map(filename => ({
      filename: filename,
      keyId: encryptedKeys[username][filename].keyId,
      timestamp: encryptedKeys[username][filename].timestamp
    }));
    
    res.status(200).json({
      success: true,
      username: username,
      files: userFiles
    });
    
  } catch (error) {
    console.error('Error in getUserFiles:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

/**
 * API Endpoint: Delete a key (optional - for cleanup)
 * DELETE /api/delete-key
 * 
 * Expected body:
 * {
 *   "username": "user123",
 *   "filename": "document.pdf"
 * }
 */
exports.deleteKey = (req, res) => {
  try {
    const { username, filename } = req.body;
    
    if (!username || !filename) {
      return res.status(400).json({
        error: 'Missing required fields: username, filename'
      });
    }
    
    const encryptedKeys = readEncryptedKeys();
    
    if (!encryptedKeys[username] || !encryptedKeys[username][filename]) {
      return res.status(404).json({
        error: 'Key not found'
      });
    }
    
    // Delete the key
    delete encryptedKeys[username][filename];
    
    // If user has no more files, delete user entry
    if (Object.keys(encryptedKeys[username]).length === 0) {
      delete encryptedKeys[username];
    }
    
    writeEncryptedKeys(encryptedKeys);
    
    console.log(`Key deleted for user: ${username}, file: ${filename}`);
    
    res.status(200).json({
      success: true,
      message: 'Key deleted successfully'
    });
    
  } catch (error) {
    console.error('Error in deleteKey:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

// Initialize keys file on module load
initializeKeysFile();
console.log('KMS Controller initialized successfully');
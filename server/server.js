// server_updated.js - Updated Server with KMS Integration

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fileUpload = require('express-fileupload');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');


const app = express();
const PORT = 8000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(fileUpload());

// Import controllers
const userController = require('./userController');
const fileController = require('./fileController');
// const kmsController = require('./kmsController');

console.log('Starting server with encryption support...');

// ==================== USER AUTHENTICATION APIs ====================

// User registration API
app.post('/api/register', userController.register);

// User login API  
app.post('/api/login', userController.login);

// Get user's public key API
app.get('/api/user-public-key', userController.getUserPublicKey);

// // 生成 2FA 密鑰並返回 QR Code
// app.post('/api/generate-2fa-secret', async (req, res) => {
//   const { username } = req.body;

//   if (!username) {
//     return res.status(400).json({ error: 'Missing username parameter' });
//   }

//   const secret = speakeasy.generateSecret({ name: `2FA-Test (${username})` });
//   const otpAuthUrl = `otpauth://totp/${username}?secret=${secret.base32}&issuer=YourAppName`;

//   // 生成 QR Code
//   const qrCodeDataUrl = await qrcode.toDataURL(otpAuthUrl);

//   // 模擬存儲密鑰（正式環境應存儲到資料庫）
//   global.userSecrets = global.userSecrets || {};
//   global.userSecrets[username] = secret.base32;

//   res.status(200).json({ qrCode: qrCodeDataUrl, secret: secret.base32 });
// });

app.post('/api/verify-otp', (req, res) => {
  const { username, otp } = req.body;

  if (!username || !otp) {
    return res.status(400).json({ error: 'Missing username or OTP' });
  }

  const secret = global.userSecrets?.[username];
  if (!secret) {
    return res.status(404).json({ error: 'User not found or 2FA not set up' });
  }

  const isValid = speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: otp,
    window: 1, // 容忍時間偏移
  });

  if (isValid) {
    res.status(200).json({ message: 'OTP verified successfully' });
  } else {
    res.status(400).json({ error: 'Invalid OTP' });
  }
});

// ==================== FILE MANAGEMENT APIs ====================

// Upload file API (handles both regular and encrypted files)
// app.post('/api/upload', fileController.uploadFile);
app.post('/api/upload', (req, res) => {
  console.log('Received upload request');
  fileController.uploadFile(req, res);
});

// Download file API (handles both regular and encrypted files)
app.get('/api/download', fileController.downloadFile);

// Get file list API
app.get('/api/files', (req, res) => {
  console.log('Received request for file list');
  fileController.getUserFiles(req, res);
});
// ==================== KMS (Key Management Service) APIs ====================

// // Store encrypted AES key
// // POST /api/store-key
// // Body: { username, filename, encrypted_key, iv }
// app.post('/api/store-key', (req, res) => {
//   console.log('KMS: Received store-key request');
//   kmsController.storeKey(req, res);
// });

// // Request encrypted AES key
// // POST /api/request-key  
// // Body: { username, filename }
// app.post('/api/request-key', (req, res) => {
//   console.log('KMS: Received request-key request');
//   kmsController.requestKey(req, res);
// });

// // Get list of files for a user (from KMS)
// // GET /api/user-files?username=user123
// app.get('/api/user-files', (req, res) => {
//   console.log('KMS: Received user-files request');
//   kmsController.getUserFiles(req, res);
// });

// // Delete encrypted key
// // DELETE /api/delete-key
// // Body: { username, filename }
// app.delete('/api/delete-key', (req, res) => {
//   console.log('KMS: Received delete-key request');
//   kmsController.deleteKey(req, res);
// });

// ==================== HEALTH CHECK API ====================

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Server with encryption support is running',
    timestamp: new Date().toISOString(),
    services: {
      fileManager: 'OK',
      kms: 'OK',
      userAuth: 'OK'
    }
  });
});

// ==================== STATIC FILES ====================

// Serve static files from client directory
app.use(express.static(__dirname + '/../client'));

// ==================== ERROR HANDLING ====================

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    error: 'API endpoint not found',
    path: req.originalUrl
  });
});

// ==================== SERVER STARTUP ====================

app.listen(PORT, () => {
  console.log(`=== ENCRYPTED FILE SERVER STARTED ===`);
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`=== Available API Endpoints ===`);
  console.log(`Authentication:`);
  console.log(`  POST /api/register - User registration with RSA key generation`);
  console.log(`  POST /api/login - User login`);
  console.log(`  GET  /api/user-public-key - Get user's RSA public key`);
  console.log(`File Management:`);
  console.log(`  POST /api/upload - Upload encrypted files`);
  console.log(`  GET  /api/download - Download encrypted files`);
  console.log(`  GET  /api/files - List all files`);
  console.log(`Key Management Service (KMS):`);
  console.log(`  POST /api/store-key - Store encrypted AES key`);
  console.log(`  POST /api/request-key - Retrieve encrypted AES key`);
  console.log(`  GET  /api/user-files - List user's encrypted files`);
  console.log(`  DELETE /api/delete-key - Delete encrypted key`);
  console.log(`System:`);
  console.log(`  GET  /api/health - Health check`);
  console.log(`=====================================`);
});
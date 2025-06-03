const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const kmsController = require('./kmsController');

const app = express();
const PORT = 9000; // KMS server runs on a different port

// Middleware
app.use(cors());
app.use(bodyParser.json());

// ==================== KMS APIs ====================

// Store RSA keys
// POST /api/store-RSA-Keys
// Body: {username, publicKey, privateKey}
app.post('/api/store-RSA-Keys', (req, res) => {
  console.log('KMS: Received store-RSA-Keys request');
  kmsController.storeRSAKey(req, res);
});

// Retrieve RSA keys
// GET /api/get-RSA-Keys
// Query: { username }
app.get('/api/get-RSA-Keys', (req, res) => {
  console.log('KMS: Received get-RSA-Keys request');
  kmsController.getRSAKey(req, res);
});

// Get user public key
// GET /api/user-public-key
app.get('/api/user-public-key', (req, res) => {
  console.log('KMS: Received user-public-key request');
  kmsController.getUserPublicKey(req, res);
});

// Store encrypted AES key
// POST /api/store-key
// Body: { username, filename, encrypted_key, iv }
app.post('/api/store-key', (req, res) => {
  console.log('KMS: Received store-key request');
  kmsController.storeKey(req, res);
});

// Request encrypted AES key
// POST /api/request-key  
// Body: { username, filename }
app.post('/api/request-key', (req, res) => {
  console.log('KMS: Received request-key request');
  kmsController.requestKey(req, res);
});

// Delete encrypted key
// DELETE /api/delete-key
// Body: { username, filename }
app.delete('/api/delete-key', (req, res) => {
  console.log('KMS: Received delete-key request');
  kmsController.deleteKey(req, res);
});


// ==================== SERVER STARTUP ====================

app.listen(PORT, () => {
  console.log(`KMS Server running at http://localhost:${PORT}`);
  console.log('KMS APIs are ready to handle requests');
  console.log('Available endpoints:');
  console.log('1. POST /api/store-RSA-Keys - Store RSA keys');
  console.log('2. GET /api/get-RSA-Keys - Retrieve RSA keys');
  console.log('3. POST /api/store-key - Store encrypted AES key');
  console.log('4. POST /api/request-key - Request encrypted AES key');
  console.log('5. DELETE /api/delete-key - Delete encrypted key');
  console.log('6. GET /api/health - Health check endpoint');
  console.log('7. GET /api/user-files - List all files for a user');
  console.log('8. GET /api/files - Get file list');
  console.log('9. GET /api/health - Health check for KMS');
});
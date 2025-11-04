const API_BASE = 'http://localhost:8000/api';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// File to store encrypted keys
const FILE_PATH = path.join(__dirname, 'file.json');

function initializeFileStorage() {
  if (!fs.existsSync(FILE_PATH)) {
    console.log('Creating file.json storage...');
    fs.writeFileSync(FILE_PATH, JSON.stringify([]), 'utf8');
  }
}

/**
 * Read file storage
 * @returns {Object} All stored files
 */
function readFileStorage() {
  try {
    initializeFileStorage();
    const data = fs.readFileSync(FILE_PATH, 'utf8');
    return JSON.parse(data);
  }
  catch (error) {
    console.error('Error reading file storage:', error);
    return [];
  }
}

/**
 * Write file storage
 * @param {Object} files - Files object to save
 */
function writeFileStorage(files) {
  try {
    fs.writeFileSync(FILE_PATH, JSON.stringify(files, null, 2), 'utf8');
    console.log('File storage updated successfully');
  } catch (error) {
    console.error('Error writing file storage:', error);
    throw error;
  }
}

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

    const fileStorage = readFileStorage();

    if (!fileStorage[username]) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    // Return list of files for this user
    const userFiles = Object.keys(fileStorage[username]).map(filename => ({
      filename: filename,
      keyId: fileStorage[username][filename].keyId,
      timestamp: fileStorage[username][filename].timestamp
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
 * API Endpoint: Upload file
 * POST /api/upload
 */
exports.uploadFile = (req, res) => {
  try {
    const file = req.files.file; // 假設使用 express-fileupload 中間件
    const { username } = req.body;

    if (!file || !username) {
      return res.status(400).json({
        error: 'Missing required fields: file, username'
      });
    }

    const fileStorage = readFileStorage();

    // 如果用戶不存在，創建用戶條目
    if (!fileStorage[username]) {
      fileStorage[username] = {};
    }

    // 生成檔案的唯一 ID
    const fileId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    // 存儲檔案資訊
    fileStorage[username][file.name] = {
      fileId: fileId,
      filename: file.name,
      size: file.size,
      mimetype: file.mimetype,
      timestamp: timestamp
    };

    // 更新檔案存儲
    writeFileStorage(fileStorage);

    // 將檔案保存到伺服器
    const uploadPath = path.join(__dirname, 'uploads', file.name);
    file.mv(uploadPath, (err) => {
      if (err) {
        console.error('Error saving file:', err);
        return res.status(500).json({
          error: 'Failed to save file'
        });
      }

      res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        fileId: fileId
      });
    });
  } catch (error) {
    console.error('Error in uploadFile:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};

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
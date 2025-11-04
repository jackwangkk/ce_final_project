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
    const parsedData = JSON.parse(data);
    return Array.isArray(parsedData) ? {} : parsedData; // 如果是陣列，返回空物件
  } catch (error) {
    console.error('Error reading file storage:', error);
    return {}; // 返回空物件作為預設值
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
    //console.log('Received upload request:', req.body); // 打印請求的 body
    //console.log('Received file:', req.files); // 打印接收到的檔案

    const file = req.files.file; // 假設使用 express-fileupload 中間件
    const { username } = req.body;

    if (!file || !username) {
      console.log('Missing required fields: file or username'); // 打印錯誤原因
      return res.status(400).json({
        error: 'Missing required fields: file, username'
      });
    }

    const fileStorage = readFileStorage();
    //console.log('Current file storage:', fileStorage); // 打印目前的檔案存儲狀態

    // 如果用戶不存在，創建用戶條目
    if (!fileStorage[username]) {
      console.log(`Creating new entry for user: ${username}`); // 打印用戶創建訊息
      fileStorage[username] = {};
    }


    // 生成檔案的唯一 ID
    const originalFileName = file.name.replace('.encrypted', '');
    const fileId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    console.log(`Generated file ID: ${fileId}, Timestamp: ${timestamp}`); // 打印檔案 ID 和時間戳

    // 存儲檔案資訊
    fileStorage[username][originalFileName] = {
      fileId: fileId,
      filename: originalFileName,
      size: file.size,
      mimetype: file.mimetype,
      timestamp: timestamp
    };
    //console.log('Updated file storage:', fileStorage); // 打印更新後的檔案存儲狀態

    // 更新檔案存儲
    writeFileStorage(fileStorage);

    // 將檔案保存到伺服器
    const uploadPath = path.join(__dirname, 'uploads', file.name);
    console.log(`Saving file to path: ${uploadPath}`); // 打印檔案保存路徑

    file.mv(uploadPath, (err) => {
      if (err) {
        console.error('Error saving file:', err); // 打印保存檔案的錯誤
        return res.status(500).json({
          error: 'Failed to save file'
        });
      }

      console.log(`File uploaded successfully: ${file.name}`); // 打印成功訊息
      res.status(200).json({
        success: true,
        message: 'File uploaded successfully',
        fileId: fileId
      });
    });
  } catch (error) {
    console.error('Error in uploadFile:', error); // 打印捕獲的錯誤
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
};
// // 上傳檔案
// exports.uploadFile = (req, res) => {
//   const file = req.files.file;
//   const uploadPath = path.join(__dirname, 'uploads', file.name);

//   file.mv(uploadPath, (err) => {
//     if (err) {
//       return res.status(500).send(err);
//     }
//     res.json({ message: '檔案上傳成功' });
//   });
// };

// 下載檔案
exports.downloadFile = (req, res) => {
  const fileName = req.query.file;
  const filePath = path.join(__dirname, 'uploads', fileName);

  res.download(filePath, (err) => {
    if (err) {
      return res.status(500).send(err);
    }
  });
};

// 獲取檔案列表
exports.getFileList = (req, res) => {
  const uploadDir = path.join(__dirname, 'uploads');
  const files = fs.readdirSync(uploadDir);
  res.json(files);
};
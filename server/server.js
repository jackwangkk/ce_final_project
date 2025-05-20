const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 8000;

app.use(cors());
app.use(bodyParser.json());
app.use(fileUpload());

// 匯入 userController
const userController = require('./userController');
const fileUpload = require('express-fileupload'); // 確保已安裝 express-fileupload
const fileController = require('./fileController');

// 註冊 API
app.post('/api/register', userController.register);

// 登入 API
app.post('/api/login', userController.login);

// 上傳檔案 API
app.post('/api/upload', fileController.uploadFile);

// 下載檔案 API
app.get('/api/download', fileController.downloadFile);

// 獲取檔案列表 API
app.get('/api/files', fileController.getFileList);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
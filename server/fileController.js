const fs = require('fs');
const path = require('path');

// 上傳檔案
exports.uploadFile = (req, res) => {
  const file = req.files.file;
  const uploadPath = path.join(__dirname, 'uploads', file.name);

  file.mv(uploadPath, (err) => {
    if (err) {
      return res.status(500).send(err);
    }
    res.json({ message: '檔案上傳成功' });
  });
};

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
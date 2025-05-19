const fs = require('fs');
const speakeasy = require('speakeasy');
const path = require('path');

// 模擬金鑰儲存
const KEY_DB_PATH = path.join(__dirname, 'keys.json');

// 儲存金鑰（接收前端傳來的 RSA 加密後金鑰）
function storeKey(fileId, wrappedKey, owner, allowedUsers = []) {
  const keys = loadKeys();
  
  keys.push({
    fileId,
    wrappedKey: Buffer.from(wrappedKey).toString('base64'), // 轉為可儲存格式
    owner,
    allowedUsers,
    createdAt: new Date().toISOString()
  });

  fs.writeFileSync(KEY_DB_PATH, JSON.stringify(keys, null, 2));
}

// 請求金鑰（含 2FA 驗證）
function requestKey(fileId, userId, otp) {
  const keys = loadKeys();
  const keyRecord = keys.find(k => k.fileId === fileId);
  
  // 權限檢查
  if (keyRecord.owner !== userId && !keyRecord.allowedUsers.includes(userId)) {
    throw new Error('權限不足');
  }

  // 2FA 驗證
  if (!validateOTP(userId, otp)) {
    throw new Error('OTP 驗證失敗');
  }

  return Buffer.from(keyRecord.wrappedKey, 'base64');
}

// 驗證 OTP（簡化版）
function validateOTP(userId, otp) {
  // 實際應從資料庫讀取用戶的 2FA secret
  const userSecret = get2FASecretFromDB(userId); 
  return speakeasy.totp.verify({
    secret: userSecret,
    encoding: 'base32',
    token: otp,
    window: 1 // 允許前後 1 個時間窗
  });
}
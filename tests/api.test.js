const request = require('supertest');
const app = require('../server/server');
const crypto = require('../client/crypto');

describe('KMS 整合測試', () => {
  let testFileId = 'test_123';
  let testUser = { username: 'test_user', password: 'p@ssw0rd' };

  beforeAll(async () => {
    // 註冊測試用戶
    await request(app)
      .post('/register')
      .send(testUser);
  });

  test('完整加密上傳流程', async () => {
    // 模擬文件加密
    const mockFile = new TextEncoder().encode("ZeroTrust Test Data");
    const { encryptedData, iv, key } = await crypto.encryptFile(mockFile);
    
    // 上傳加密文件
    const uploadRes = await request(app)
      .post('/upload')
      .send({
        fileId: testFileId,
        encryptedData: Buffer.from(encryptedData).toString('base64'),
        iv: Buffer.from(iv).toString('base64')
      });
    
    expect(uploadRes.statusCode).toBe(201);

    // 儲存金鑰到 KMS
    const kmsRes = await request(app)
      .post('/kms/store-key')
      .send({
        fileId: testFileId,
        wrappedKey: await crypto.wrapKeyForKMS(key, kmsPublicKey) // 需預先載入公鑰
      });
    
    expect(kmsRes.body.message).toMatch(/金鑰已儲存/);
  });
});
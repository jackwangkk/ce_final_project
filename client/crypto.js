// 生成 AES-GCM 金鑰並加密文件
export async function encryptFile(file) {
  try {
    // 生成 AES 金鑰
    const aesKey = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    
    // 生成初始化向量
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // 加密文件內容
    const encryptedData = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      file
    );
    
    return {
      key: aesKey,
      iv: iv,
      encryptedData: new Uint8Array(encryptedData)
    };
  } catch (error) {
    console.error("加密失敗:", error);
    throw error;
  }
}

// 用 KMS 公鑰包裝 AES 金鑰
export async function wrapKeyForKMS(aesKey, publicKey) {
  return window.crypto.subtle.wrapKey(
    "raw",         // 匯出格式
    aesKey,        // 要包裝的金鑰
    publicKey,     // KMS 的 RSA 公鑰
    { name: "RSA-OAEP" }
  );
}
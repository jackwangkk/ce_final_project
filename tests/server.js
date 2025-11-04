const express = require('express');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const USERS_PATH = path.join(__dirname, 'users.json');
const users = JSON.parse(fs.readFileSync(USERS_PATH));

// 註冊帳號並產生 TOTP secret
app.post('/register', async (req, res) => {
  const { username } = req.body;
  if (users[username]) return res.status(400).json({ error: 'User exists' });

  const secret = speakeasy.generateSecret({ name: `2FA-Test (${username})` });
  users[username] = { secret: secret.base32 };
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));

  const qr = await qrcode.toDataURL(secret.otpauth_url);
  res.json({ qr });
});

// 驗證 OTP 密碼
app.post('/verify', (req, res) => {
  const { username, token } = req.body;
  const user = users[username];
  if (!user) return res.status(404).json({ error: 'User not found' });

  const verified = speakeasy.totp.verify({
    secret: user.secret,
    encoding: 'base32',
    token
  });

  res.json({ verified });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));

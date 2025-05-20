const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

// 用戶資料檔案路徑
const USERS_DB_PATH = path.join(__dirname, '../config/dummy-db/users.json');

// 讀取用戶資料
function loadUsers() {
  if (!fs.existsSync(USERS_DB_PATH)) return [];
  const data = fs.readFileSync(USERS_DB_PATH, 'utf-8');
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

// 寫入用戶資料
function saveUsers(users) {
  fs.writeFileSync(USERS_DB_PATH, JSON.stringify(users, null, 2));
}

// 註冊
exports.register = async (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: '用戶已存在' });
  }
  const hash = await bcrypt.hash(password, 10);
  users.push({ username, password: hash , public_key: req.body.public_key });
  saveUsers(users);
  res.json({ message: '註冊成功' });
};

// 登入
exports.login = async (req, res) => {
  const { username, password } = req.body;
  const users = loadUsers();
  const user = users.find(u => u.username === username);
  if (!user) {
    return res.status(401).json({ error: '帳號或密碼錯誤' });
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: '帳號或密碼錯誤' });
  }
  res.json({ token: 'dummy-token', user: { username } });
};
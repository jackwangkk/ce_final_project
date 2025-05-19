const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 8000;

app.use(cors());
app.use(bodyParser.json());

// 匯入 userController
const userController = require('./userController');

// 註冊 API
app.post('/api/register', userController.register);

// 登入 API
app.post('/api/login', userController.login);

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
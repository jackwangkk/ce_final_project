// userController.js - User Authentication Controller with Public Key Support

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// File to store users
const USERS_FILE = path.join(__dirname, 'users.json');
const JWT_SECRET = 'your-secret-key'; // In production, use environment variable

/**
 * Initialize users file if it doesn't exist
 */
function initializeUsersFile() {
  if (!fs.existsSync(USERS_FILE)) {
    console.log('Creating users.json file...');
    fs.writeFileSync(USERS_FILE, JSON.stringify([]), 'utf8');
  }
}

/**
 * Read users from storage
 * @returns {Array} Array of user objects
 */
function readUsers() {
  try {
    initializeUsersFile();
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users:', error);
    return [];
  }
}

/**
 * Write users to storage
 * @param {Array} users - Array of user objects to save
 */
function writeUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    console.log('Users saved successfully');
  } catch (error) {
    console.error('Error writing users:', error);
    throw error;
  }
}

/**
 * User Registration
 * POST /api/register
 * 
 * Expected body:
 * {
 *   "username": "user123",
 *   "password": "password123",
 *   "public_key": "base64-encoded-rsa-public-key"
 * }
 */
exports.register = async (req, res) => {
  try {
    console.log('Received registration request');
    
    const { username, password, public_key } = req.body;
    
    // Validate required fields
    if (!username || !password || !public_key) {
      console.error('Missing required fields in registration');
      return res.status(400).json({
        error: 'Missing required fields: username, password, public_key'
      });
    }
    
    console.log(`Registering user: ${username}`);
    
    // Read existing users
    const users = readUsers();
    
    // Check if user already exists
    const existingUser = users.find(user => user.username === username);
    if (existingUser) {
      console.error(`User already exists: ${username}`);
      return res.status(400).json({
        error: 'Username already exists'
      });
    }
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('Password hashed successfully');
    
    // Create new user object
    const newUser = {
      id: users.length + 1,
      username: username,
      password: hashedPassword,
      public_key: public_key, // Store RSA public key
      created_at: new Date().toISOString()
    };
    
    // Add user to array and save
    users.push(newUser);
    writeUsers(users);
    
    console.log(`User registered successfully: ${username}`);
    
    // Return success (don't include sensitive data)
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        created_at: newUser.created_at
      }
    });
    
  } catch (error) {
    console.error('Error in register:', error);
    res.status(500).json({
      error: 'Internal server error during registration',
      details: error.message
    });
  }
};

/**
 * User Login
 * POST /api/login
 * 
 * Expected body:
 * {
 *   "username": "user123",
 *   "password": "password123"
 * }
 */
exports.login = async (req, res) => {
  try {
    console.log('Received login request');
    
    const { username, password } = req.body;
    
    // Validate required fields
    if (!username || !password) {
      console.error('Missing required fields in login');
      return res.status(400).json({
        error: 'Missing required fields: username, password'
      });
    }
    
    console.log(`Login attempt for user: ${username}`);
    
    // Read users and find user
    const users = readUsers();
    const user = users.find(u => u.username === username);
    
    if (!user) {
      console.error(`User not found: ${username}`);
      return res.status(401).json({
        error: 'Invalid username or password'
      });
    }
    
    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.error(`Invalid password for user: ${username}`);
      return res.status(401).json({
        error: 'Invalid username or password'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username 
      },
      JWT_SECRET,
      { expiresIn: '24h' } // Token expires in 24 hours
    );
    
    console.log(`User logged in successfully: ${username}`);
    
    // Return success with token
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        username: user.username,
        created_at: user.created_at
      }
    });
    
  } catch (error) {
    console.error('Error in login:', error);
    res.status(500).json({
      error: 'Internal server error during login',
      details: error.message
    });
  }
};

/**
 * Get User's Public Key
 * GET /api/user-public-key?username=user123
 */
exports.getUserPublicKey = (req, res) => {
  try {
    console.log('Received getUserPublicKey request');
    
    const { username } = req.query;
    
    // Validate required parameter
    if (!username) {
      console.error('Missing username parameter');
      return res.status(400).json({
        error: 'Missing username parameter'
      });
    }
    
    console.log(`Getting public key for user: ${username}`);
    
    // Read users and find user
    const users = readUsers();
    const user = users.find(u => u.username === username);
    
    if (!user) {
      console.error(`User not found: ${username}`);
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    if (!user.public_key) {
      console.error(`No public key found for user: ${username}`);
      return res.status(404).json({
        error: 'Public key not found for user'
      });
    }
    
    console.log(`Public key retrieved for user: ${username}`);
    
    // Return public key
    res.status(200).json({
      success: true,
      username: username,
      public_key: user.public_key
    });
    
  } catch (error) {
    console.error('Error in getUserPublicKey:', error);
    res.status(500).json({
      error: 'Internal server error while getting public key',
      details: error.message
    });
  }
};

/**
 * Verify JWT Token (middleware function)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
exports.verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      return res.status(401).json({
        error: 'Access token required'
      });
    }
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({
          error: 'Invalid or expired token'
        });
      }
      
      req.user = decoded; // Add user info to request
      next();
    });
    
  } catch (error) {
    console.error('Error in verifyToken:', error);
    res.status(500).json({
      error: 'Internal server error during token verification'
    });
  }
};

/**
 * Get Current User Info (requires authentication)
 * GET /api/me
 */
exports.getCurrentUser = (req, res) => {
  try {
    // req.user is set by verifyToken middleware
    const { userId, username } = req.user;
    
    // Read users and find current user
    const users = readUsers();
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }
    
    // Return user info (without sensitive data)
    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        created_at: user.created_at
      }
    });
    
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};

// Initialize users file on module load
initializeUsersFile();
console.log('User Controller initialized successfully');
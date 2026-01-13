// User Authentication Service Implementation
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { User } = require('../models/User');
const { sendWelcomeEmail } = require('../services/emailService');

class AuthService {
  constructor() {
    this.saltRounds = 12;
    this.jwtSecret = process.env.JWT_SECRET;
  }

  async registerUser(userData) {
    const { email, password, firstName, lastName } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User already exists with this email');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, this.saltRounds);

    // Create new user
    const newUser = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      isVerified: false,
      createdAt: new Date()
    });

    const savedUser = await newUser.save();

    // Send welcome email
    await sendWelcomeEmail(savedUser.email, savedUser.firstName);

    // Generate verification token
    const verificationToken = this.generateToken({
      userId: savedUser._id,
      type: 'verification'
    });

    return {
      user: this.sanitizeUser(savedUser),
      verificationToken
    };
  }

  async loginUser(email, password) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    if (!user.isVerified) {
      throw new Error('Please verify your email before logging in');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = this.generateToken({
      userId: user._id,
      type: 'access'
    });

    const refreshToken = this.generateToken({
      userId: user._id,
      type: 'refresh'
    }, '7d');

    return {
      user: this.sanitizeUser(user),
      accessToken,
      refreshToken
    };
  }

  generateToken(payload, expiresIn = '1h') {
    return jwt.sign(payload, this.jwtSecret, { expiresIn });
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  sanitizeUser(user) {
    const { password, ...sanitizedUser } = user.toObject();
    return sanitizedUser;
  }
}

module.exports = new AuthService();
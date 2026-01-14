const express = require('express');
const rateLimit = require('express-rate-limit');
const authService = require('../services/authService');
const authMiddleware = require('../middleware/authMiddleware');
const { validateRegistration, validateLogin } = require('../validators/authValidators');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later'
});

// User registration endpoint
router.post('/register', authLimiter, async (req, res) => {
  try {
    const validationErrors = validateRegistration(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        errors: validationErrors
      });
    }

    const result = await authService.registerUser(req.body);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification.',
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// User login endpoint
router.post('/login', authLimiter, async (req, res) => {
  try {
    const validationErrors = validateLogin(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        errors: validationErrors
      });
    }

    const result = await authService.loginUser(req.body.email, req.body.password);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        accessToken: result.accessToken
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
});

// Email verification endpoint
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const decoded = authService.verifyToken(token);

    if (decoded.type !== 'verification') {
      throw new Error('Invalid verification token');
    }

    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { isVerified: true },
      { new: true }
    );

    if (!user) {
      throw new Error('User not found');
    }

    res.json({
      success: true,
      message: 'Email verified successfully. You can now log in.'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// Token refresh endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      throw new Error('Refresh token not provided');
    }

    const decoded = authService.verifyToken(refreshToken);

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid refresh token');
    }

    const newAccessToken = authService.generateToken({
      userId: decoded.userId,
      type: 'access'
    });

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
});

// OAuth2 Social Login endpoints
router.get('/oauth/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const supportedProviders = ['google', 'github', 'facebook', 'linkedin'];

    if (!supportedProviders.includes(provider)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported OAuth provider'
      });
    }

    const authUrl = await authService.generateOAuthUrl(provider, req.query.redirect_uri);

    res.json({
      success: true,
      data: {
        authUrl,
        provider,
        state: authUrl.split('state=')[1]?.split('&')[0]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.get('/oauth/:provider/callback', async (req, res) => {
  try {
    const { provider } = req.params;
    const { code, state } = req.query;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code required'
      });
    }

    const result = await authService.handleOAuthCallback(provider, code, state);

    // Set refresh token as httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      message: `Successfully authenticated with ${provider}`,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        isNewUser: result.isNewUser
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Link OAuth account to existing user
router.post('/oauth/link/:provider', authMiddleware, async (req, res) => {
  try {
    const { provider } = req.params;
    const { code } = req.body;

    const result = await authService.linkOAuthAccount(req.userId, provider, code);

    res.json({
      success: true,
      message: `Successfully linked ${provider} account`,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Unlink OAuth account
router.delete('/oauth/unlink/:provider', authMiddleware, async (req, res) => {
  try {
    const { provider } = req.params;

    await authService.unlinkOAuthAccount(req.userId, provider);

    res.json({
      success: true,
      message: `Successfully unlinked ${provider} account`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Logout endpoint
router.post('/logout', authMiddleware, (req, res) => {
  res.clearCookie('refreshToken');
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Get current user profile
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
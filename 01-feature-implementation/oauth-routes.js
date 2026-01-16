const express = require('express');
const passport = require('passport');
const OAuthProvider = require('./oauth-provider');

const router = express.Router();
const oauthProvider = new OAuthProvider();

/**
 * OAuth Social Login Routes
 */

// Get available OAuth providers
router.get('/providers', (req, res) => {
  const providers = oauthProvider.getAvailableProviders();
  res.json({
    success: true,
    data: { providers }
  });
});

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=oauth_failed' }),
  (req, res) => {
    // Successful authentication
    res.redirect('/dashboard?welcome=true');
  }
);

// GitHub OAuth routes
router.get('/github',
  passport.authenticate('github', { scope: ['user:email'] })
);

router.get('/github/callback',
  passport.authenticate('github', { failureRedirect: '/login?error=oauth_failed' }),
  (req, res) => {
    res.redirect('/dashboard?welcome=true');
  }
);

// Facebook OAuth routes
router.get('/facebook',
  passport.authenticate('facebook', { scope: ['email'] })
);

router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login?error=oauth_failed' }),
  (req, res) => {
    res.redirect('/dashboard?welcome=true');
  }
);

// Disconnect OAuth provider
router.delete('/disconnect/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    await oauthProvider.disconnectProvider(userId, provider);

    res.json({
      success: true,
      message: `${provider} account disconnected successfully`
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
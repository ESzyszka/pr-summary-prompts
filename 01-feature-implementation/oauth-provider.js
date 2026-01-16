const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;

/**
 * OAuth Social Login Provider
 * Implements Google, GitHub, and Facebook authentication strategies
 */
class OAuthProvider {
  constructor() {
    this.strategies = new Map();
    this.initializeStrategies();
  }

  /**
   * Initialize OAuth strategies for social login
   */
  initializeStrategies() {
    // Google OAuth Strategy
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/auth/google/callback',
        scope: ['profile', 'email']
      }, this.handleOAuthCallback.bind(this, 'google')));

      this.strategies.set('google', {
        name: 'Google',
        scope: ['profile', 'email'],
        enabled: true
      });
    }

    // GitHub OAuth Strategy
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      passport.use(new GitHubStrategy({
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: '/auth/github/callback',
        scope: ['user:email']
      }, this.handleOAuthCallback.bind(this, 'github')));

      this.strategies.set('github', {
        name: 'GitHub',
        scope: ['user:email'],
        enabled: true
      });
    }

    // Facebook OAuth Strategy
    if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
      passport.use(new FacebookStrategy({
        clientID: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        callbackURL: '/auth/facebook/callback',
        profileFields: ['id', 'emails', 'name', 'picture.type(large)']
      }, this.handleOAuthCallback.bind(this, 'facebook')));

      this.strategies.set('facebook', {
        name: 'Facebook',
        scope: ['email'],
        enabled: true
      });
    }

    // Configure passport serialization
    passport.serializeUser((user, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
      try {
        const user = await this.findUserById(id);
        done(null, user);
      } catch (error) {
        done(error, null);
      }
    });
  }

  /**
   * Handle OAuth callback and create/update user
   */
  async handleOAuthCallback(provider, accessToken, refreshToken, profile, done) {
    try {
      const email = this.extractEmail(profile);
      const userData = this.extractUserData(provider, profile);

      // Check if user exists
      let user = await this.findUserByEmail(email);

      if (user) {
        // Update existing user's OAuth info
        user = await this.updateUserOAuth(user.id, provider, {
          providerId: profile.id,
          accessToken,
          refreshToken,
          lastLogin: new Date()
        });
      } else {
        // Create new user from OAuth profile
        user = await this.createUserFromOAuth(provider, userData, {
          providerId: profile.id,
          accessToken,
          refreshToken
        });
      }

      return done(null, user);

    } catch (error) {
      console.error(`OAuth ${provider} authentication error:`, error);
      return done(error, null);
    }
  }

  /**
   * Extract email from OAuth profile
   */
  extractEmail(profile) {
    if (profile.emails && profile.emails.length > 0) {
      return profile.emails[0].value;
    }
    throw new Error('No email address provided by OAuth provider');
  }

  /**
   * Extract user data from OAuth profile
   */
  extractUserData(provider, profile) {
    const userData = {
      email: this.extractEmail(profile),
      firstName: '',
      lastName: '',
      avatar: '',
      provider
    };

    switch (provider) {
      case 'google':
        userData.firstName = profile.name?.givenName || '';
        userData.lastName = profile.name?.familyName || '';
        userData.avatar = profile.photos?.[0]?.value || '';
        break;

      case 'github':
        const name = profile.displayName?.split(' ') || [''];
        userData.firstName = name[0] || '';
        userData.lastName = name.slice(1).join(' ') || '';
        userData.avatar = profile.photos?.[0]?.value || '';
        break;

      case 'facebook':
        userData.firstName = profile.name?.givenName || '';
        userData.lastName = profile.name?.familyName || '';
        userData.avatar = profile.photos?.[0]?.value || '';
        break;
    }

    return userData;
  }

  /**
   * Create user from OAuth profile
   */
  async createUserFromOAuth(provider, userData, oauthData) {
    const user = {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      avatar: userData.avatar,
      emailVerified: true, // OAuth emails are pre-verified
      isActive: true,
      oauthProviders: {
        [provider]: {
          id: oauthData.providerId,
          accessToken: oauthData.accessToken,
          refreshToken: oauthData.refreshToken,
          connectedAt: new Date()
        }
      },
      createdAt: new Date(),
      lastLogin: new Date()
    };

    // In a real application, save to database
    return await this.saveUser(user);
  }

  /**
   * Update existing user's OAuth information
   */
  async updateUserOAuth(userId, provider, oauthData) {
    const updateData = {
      lastLogin: new Date(),
      [`oauthProviders.${provider}`]: {
        id: oauthData.providerId,
        accessToken: oauthData.accessToken,
        refreshToken: oauthData.refreshToken,
        lastUsed: new Date()
      }
    };

    // In a real application, update in database
    return await this.updateUser(userId, updateData);
  }

  /**
   * Get available OAuth providers
   */
  getAvailableProviders() {
    return Array.from(this.strategies.entries()).map(([key, config]) => ({
      id: key,
      name: config.name,
      enabled: config.enabled,
      loginUrl: `/auth/${key}`,
      callbackUrl: `/auth/${key}/callback`
    }));
  }

  /**
   * Disconnect OAuth provider from user account
   */
  async disconnectProvider(userId, provider) {
    const user = await this.findUserById(userId);

    if (!user || !user.oauthProviders?.[provider]) {
      throw new Error('Provider not connected to this account');
    }

    // Check if user has other login methods
    const hasPassword = !!user.password;
    const otherProviders = Object.keys(user.oauthProviders).filter(p => p !== provider);

    if (!hasPassword && otherProviders.length === 0) {
      throw new Error('Cannot disconnect last login method. Set a password first.');
    }

    // Remove OAuth provider
    const updateData = {
      [`oauthProviders.${provider}`]: null
    };

    return await this.updateUser(userId, updateData);
  }

  // Mock database methods (replace with actual database calls)
  async findUserByEmail(email) {
    // Mock implementation
    return null;
  }

  async findUserById(id) {
    // Mock implementation
    return null;
  }

  async saveUser(userData) {
    // Mock implementation
    return { id: 'mock-id', ...userData };
  }

  async updateUser(userId, updateData) {
    // Mock implementation
    return { id: userId, ...updateData };
  }
}

module.exports = OAuthProvider;
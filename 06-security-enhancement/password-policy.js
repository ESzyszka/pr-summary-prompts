const bcrypt = require('bcryptjs');

class EnhancedPasswordPolicy {
  constructor() {
    this.config = {
      minLength: 12,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      preventCommonPasswords: true,
      preventUserDataInPassword: true,
      maxRepeatingChars: 3,
      historyCount: 12, // Prevent reusing last 12 passwords
      maxAge: 90, // Days before password expires
      lockoutThreshold: 5, // Failed attempts before lockout
      lockoutDuration: 30 // Minutes
    };

    this.commonPasswords = new Set([
      'password123', 'admin123', 'qwerty123', 'letmein123',
      'welcome123', 'password!', 'admin!', 'qwerty!', 'letmein!'
    ]);
  }

  async validatePassword(password, userInfo = {}) {
    const errors = [];

    // Length validation
    if (password.length < this.config.minLength) {
      errors.push(`Password must be at least ${this.config.minLength} characters long`);
    }

    if (password.length > this.config.maxLength) {
      errors.push(`Password must be no more than ${this.config.maxLength} characters long`);
    }

    // Character composition validation
    if (this.config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (this.config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (this.config.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (this.config.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Security validations
    if (this.config.preventCommonPasswords && this.isCommonPassword(password)) {
      errors.push('This password is too common. Please choose a more unique password');
    }

    if (this.config.preventUserDataInPassword && this.containsUserData(password, userInfo)) {
      errors.push('Password cannot contain personal information like name or email');
    }

    if (this.hasExcessiveRepeatingChars(password)) {
      errors.push(`Password cannot have more than ${this.config.maxRepeatingChars} consecutive identical characters`);
    }

    // Check against password history
    if (userInfo.passwordHistory && await this.isPasswordReused(password, userInfo.passwordHistory)) {
      errors.push(`Password cannot be one of your last ${this.config.historyCount} passwords`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      strength: this.calculatePasswordStrength(password)
    };
  }

  isCommonPassword(password) {
    return this.commonPasswords.has(password.toLowerCase());
  }

  containsUserData(password, userInfo) {
    const sensitiveData = [
      userInfo.firstName,
      userInfo.lastName,
      userInfo.email?.split('@')[0],
      userInfo.username
    ].filter(Boolean);

    const passwordLower = password.toLowerCase();

    return sensitiveData.some(data =>
      data.length >= 3 && passwordLower.includes(data.toLowerCase())
    );
  }

  hasExcessiveRepeatingChars(password) {
    let count = 1;
    for (let i = 1; i < password.length; i++) {
      if (password[i] === password[i - 1]) {
        count++;
        if (count > this.config.maxRepeatingChars) {
          return true;
        }
      } else {
        count = 1;
      }
    }
    return false;
  }

  async isPasswordReused(newPassword, passwordHistory) {
    for (const oldPasswordHash of passwordHistory) {
      if (await bcrypt.compare(newPassword, oldPasswordHash)) {
        return true;
      }
    }
    return false;
  }

  calculatePasswordStrength(password) {
    let score = 0;

    // Base score for length
    score += Math.min(password.length * 2, 20);

    // Character diversity
    if (/[a-z]/.test(password)) score += 5;
    if (/[A-Z]/.test(password)) score += 5;
    if (/\d/.test(password)) score += 5;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 10;

    // Bonus for mixed character types
    const charTypes = [
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[!@#$%^&*(),.?":{}|<>]/.test(password)
    ].filter(Boolean).length;

    if (charTypes >= 3) score += 10;
    if (charTypes === 4) score += 10;

    // Penalty for common patterns
    if (/123|abc|qwe/i.test(password)) score -= 10;
    if (/(.)\1{2,}/.test(password)) score -= 5;

    score = Math.max(0, Math.min(100, score));

    if (score >= 80) return 'Very Strong';
    if (score >= 60) return 'Strong';
    if (score >= 40) return 'Medium';
    if (score >= 20) return 'Weak';
    return 'Very Weak';
  }

  isPasswordExpired(user) {
    if (!user.passwordChangedAt) return true;

    const daysSinceChange = (Date.now() - new Date(user.passwordChangedAt)) / (1000 * 60 * 60 * 24);
    return daysSinceChange > this.config.maxAge;
  }

  shouldLockAccount(user) {
    if (!user.failedLoginAttempts || user.failedLoginAttempts.length === 0) {
      return false;
    }

    const recentAttempts = user.failedLoginAttempts.filter(
      attempt => Date.now() - new Date(attempt) < this.config.lockoutDuration * 60 * 1000
    );

    return recentAttempts.length >= this.config.lockoutThreshold;
  }

  async hashPassword(password) {
    return await bcrypt.hash(password, 14); // Increased cost factor for better security
  }
}

module.exports = EnhancedPasswordPolicy;
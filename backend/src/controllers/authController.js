const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshTokenSession = require('../models/RefreshTokenSession');
const { ROLE_PERMISSIONS } = require('../utils/constants');
const { logAudit } = require('../utils/auditLogger');

/**
 * Helper to generate JWT Access Token
 */
const generateAccessToken = (user, permissions) => {
  const payload = {
    id: user._id,
    userId: user._id,
    role: user.role,
    permissions
  };
  const secret = process.env.JWT_SECRET || 'cbrt_super_secret_jwt_key_2026';
  const expiresIn = process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '15m';

  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Helper to generate a secure random Refresh Token string
 */
const generateRefreshTokenString = () => {
  return crypto.randomBytes(40).toString('hex');
};

/**
 * Helper to hash Refresh Token using SHA-256
 */
const hashRefreshToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Helper to calculate effective user permissions
 */
const getEffectivePermissions = (user) => {
  const defaultPerms = ROLE_PERMISSIONS[user.role] || [];
  const customPerms = user.permissions || [];
  return Array.from(new Set([...defaultPerms, ...customPerms]));
};

// @desc    Register a new user account
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { username, fullName, email, password, role, phone } = req.body;

    if (!username || !email || !password || !fullName || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: username, email, password, fullName, phone'
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email or username already exists'
      });
    }

    const user = await User.create({
      username: username.toLowerCase(),
      fullName,
      email: email.toLowerCase(),
      password,
      role: role || 'CUSTOMER',
      phone,
      isActive: true
    });

    const permissions = getEffectivePermissions(user);
    const accessToken = generateAccessToken(user, permissions);

    await logAudit({
      actorId: user._id,
      action: 'USER_REGISTER',
      resource: 'User',
      resourceId: user._id.toString(),
      result: 'SUCCESS',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });

    res.status(201).json({
      success: true,
      accessToken,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        phone: user.phone,
        permissions
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user & create RefreshTokenSession
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { username, email, password, deviceName } = req.body;
    const loginIdentifier = (username || email || '').trim().toLowerCase();

    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username/email and password'
      });
    }

    const emailAliases = {
      'manager@cbrt.com': 'mgr@cbrt.com',
      'coordinator@cbrt.com': 'coord@cbrt.com',
      'specialist@cbrt.com': 'spec@cbrt.com',
      'driver@cbrt.com': 'drv@cbrt.com',
      'escort@cbrt.com': 'esc@cbrt.com',
      'customer@cbrt.com': 'custa@cbrt.com'
    };

    const targetEmail = emailAliases[loginIdentifier] || loginIdentifier;

    const user = await User.findOne({
      $or: [
        { email: loginIdentifier },
        { email: targetEmail },
        { username: loginIdentifier }
      ]
    }).select('+password');

    if (!user || !(await user.matchPassword(password))) {
      await logAudit({
        actorId: user ? user._id : null,
        action: 'USER_LOGIN',
        resource: 'User',
        resourceId: loginIdentifier,
        result: 'FAILURE',
        errorMessage: 'Invalid login credentials',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      await logAudit({
        actorId: user._id,
        action: 'USER_LOGIN',
        resource: 'User',
        resourceId: user._id.toString(),
        result: 'DENIED',
        errorMessage: 'User account is inactive/deactivated',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      return res.status(403).json({
        success: false,
        message: 'User account has been deactivated'
      });
    }

    const permissions = getEffectivePermissions(user);
    const accessToken = generateAccessToken(user, permissions);

    // Generate & Hash Refresh Token
    const rawRefreshToken = generateRefreshTokenString();
    const refreshTokenHash = hashRefreshToken(rawRefreshToken);

    const refreshExpiresDays = parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS || '7', 10);
    const expiresAt = new Date(Date.now() + refreshExpiresDays * 24 * 60 * 60 * 1000);

    // Create RefreshTokenSession for per-device revocation
    await RefreshTokenSession.create({
      userId: user._id,
      refreshTokenHash,
      deviceName: deviceName || req.get('User-Agent') || 'Unknown Device',
      ipAddress: req.ip || req.connection.remoteAddress || '0.0.0.0',
      expiresAt,
      isRevoked: false
    });

    await logAudit({
      actorId: user._id,
      action: 'USER_LOGIN',
      resource: 'User',
      resourceId: user._id.toString(),
      result: 'SUCCESS',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        permissions
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Refresh Access Token using Refresh Token Session
// @route   POST /api/v1/auth/refresh
// @access  Public
exports.refresh = async (req, res, next) => {
  try {
    const rawRefreshToken = req.body.refreshToken || req.headers['x-refresh-token'];

    if (!rawRefreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    const refreshTokenHash = hashRefreshToken(rawRefreshToken);
    const session = await RefreshTokenSession.findOne({ refreshTokenHash });

    if (!session) {
      await logAudit({
        action: 'TOKEN_REFRESH',
        resource: 'RefreshTokenSession',
        resourceId: 'N/A',
        result: 'FAILURE',
        errorMessage: 'Matching refresh session not found',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token session'
      });
    }

    if (session.isRevoked) {
      await logAudit({
        actorId: session.userId,
        action: 'TOKEN_REFRESH',
        resource: 'RefreshTokenSession',
        resourceId: session._id.toString(),
        result: 'DENIED',
        errorMessage: 'Refresh token session is revoked',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      return res.status(401).json({
        success: false,
        message: 'Refresh token session has been revoked'
      });
    }

    if (session.expiresAt < new Date()) {
      await logAudit({
        actorId: session.userId,
        action: 'TOKEN_REFRESH',
        resource: 'RefreshTokenSession',
        resourceId: session._id.toString(),
        result: 'FAILURE',
        errorMessage: 'Refresh token session has expired',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      return res.status(401).json({
        success: false,
        message: 'Refresh token session has expired'
      });
    }

    const user = await User.findById(session.userId);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is inactive or no longer exists'
      });
    }

    const permissions = getEffectivePermissions(user);
    const newAccessToken = generateAccessToken(user, permissions);

    res.json({
      success: true,
      accessToken: newAccessToken
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user & revoke current RefreshTokenSession
// @route   POST /api/v1/auth/logout
// @access  Public / Private
exports.logout = async (req, res, next) => {
  try {
    const rawRefreshToken = req.body.refreshToken || req.headers['x-refresh-token'];

    if (rawRefreshToken) {
      const refreshTokenHash = hashRefreshToken(rawRefreshToken);
      const session = await RefreshTokenSession.findOne({ refreshTokenHash });

      if (session) {
        session.isRevoked = true;
        await session.save();

        await logAudit({
          actorId: session.userId,
          action: 'USER_LOGOUT',
          resource: 'RefreshTokenSession',
          resourceId: session._id.toString(),
          result: 'SUCCESS',
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent')
        });
      }
    } else if (req.user) {
      // If user is authenticated, revoke all active sessions for this device IP or latest active
      const latestSession = await RefreshTokenSession.findOne({
        userId: req.user._id,
        isRevoked: false
      }).sort({ createdAt: -1 });

      if (latestSession) {
        latestSession.isRevoked = true;
        await latestSession.save();
      }

      await logAudit({
        actorId: req.user._id,
        action: 'USER_LOGOUT',
        resource: 'User',
        resourceId: req.user._id.toString(),
        result: 'SUCCESS',
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/v1/auth/profile
// @access  Private
exports.getProfile = async (req, res, next) => {
  try {
    const permissions = getEffectivePermissions(req.user);
    res.json({
      success: true,
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        fullName: req.user.fullName,
        role: req.user.role,
        phone: req.user.phone,
        isActive: req.user.isActive,
        permissions
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update current user profile
// @route   PUT /api/v1/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { fullName, phone } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { fullName, phone },
      { new: true, runValidators: true }
    ).select('-password');

    const permissions = getEffectivePermissions(user);

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        phone: user.phone,
        permissions
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Change current user password
// @route   PUT /api/v1/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    const user = await User.findById(req.user.id).select('+password');

    if (!(await user.matchPassword(currentPassword))) {
      return res.status(400).json({
        success: false,
        message: 'Incorrect current password'
      });
    }

    user.password = newPassword;
    await user.save();

    await logAudit({
      actorId: user._id,
      action: 'PASSWORD_CHANGE',
      resource: 'User',
      resourceId: user._id.toString(),
      result: 'SUCCESS',
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent')
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
};

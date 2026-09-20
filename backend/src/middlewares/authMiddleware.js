const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ROLE_PERMISSIONS } = require('../utils/constants');
const { logAudit } = require('../utils/auditLogger');

/**
 * Middleware to authenticate requests using JWT Access Token
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no access token provided'
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'cbrt_super_secret_jwt_key_2026';
    const decoded = jwt.verify(token, secret);

    const userId = decoded.id || decoded.userId;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user account no longer exists'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user account has been deactivated'
      });
    }

    // Calculate effective permissions combining role mapping & individual user permissions
    const defaultPermissions = ROLE_PERMISSIONS[user.role] || [];
    const customPermissions = user.permissions || [];
    const effectivePermissions = Array.from(new Set([...defaultPermissions, ...customPermissions]));

    user.effectivePermissions = effectivePermissions;
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, access token is invalid or has expired'
    });
  }
};

/**
 * Alias for protect middleware
 */
const authenticate = protect;

/**
 * Granular Permission Checking Middleware
 * @param {string} requiredPermission - Permission string from Master Spec (e.g. 'booking:approve')
 */
const checkPermission = (requiredPermission) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthenticated: User context missing'
      });
    }

    const permissions = req.user.effectivePermissions || [];
    const hasPermission = permissions.includes(requiredPermission);

    if (!hasPermission) {
      await logAudit({
        actorId: req.user._id,
        action: 'AUTHORIZATION_CHECK',
        resource: req.baseUrl + req.path,
        resourceId: req.params.id || 'N/A',
        result: 'DENIED',
        errorMessage: `Missing required permission '${requiredPermission}' for role '${req.user.role}'`,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent')
      });

      return res.status(403).json({
        success: false,
        message: `Forbidden: Missing required permission '${requiredPermission}'`
      });
    }

    next();
  };
};

/**
 * Role-based Authorization Middleware (Backward Compatibility)
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return async (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      if (req.user) {
        await logAudit({
          actorId: req.user._id,
          action: 'ROLE_AUTHORIZATION_CHECK',
          resource: req.baseUrl + req.path,
          resourceId: 'N/A',
          result: 'DENIED',
          errorMessage: `Role '${req.user.role}' is not allowed to access this resource`,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent')
        });
      }

      return res.status(403).json({
        success: false,
        message: `Forbidden: Role '${req.user ? req.user.role : 'Guest'}' is not authorized to access this route`
      });
    }
    next();
  };
};

module.exports = {
  protect,
  authenticate,
  checkPermission,
  authorize
};

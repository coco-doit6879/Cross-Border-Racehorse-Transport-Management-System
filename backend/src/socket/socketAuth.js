const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ROLE_PERMISSIONS } = require('../utils/constants');
const { logAudit } = require('../utils/auditLogger');

/**
 * Socket.io Authentication Middleware
 * Authenticates socket connection using JWT token from handshake auth or headers
 */
const socketAuthMiddleware = async (socket, next) => {
  try {
    let token = null;

    if (socket.handshake.auth && socket.handshake.auth.token) {
      token = socket.handshake.auth.token;
    } else if (socket.handshake.headers && socket.handshake.headers.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      } else {
        token = authHeader;
      }
    }

    if (!token) {
      await logAudit({
        action: 'SOCKET_AUTH_FAILURE',
        resource: 'Socket.io',
        resourceId: socket.id,
        result: 'DENIED',
        errorMessage: 'Missing access token in socket handshake',
        ipAddress: socket.handshake.address
      });
      return next(new Error('Authentication error: Access token is required'));
    }

    const secret = process.env.JWT_SECRET || 'cbrt_super_secret_jwt_key_2026';
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (jwtErr) {
      await logAudit({
        action: 'SOCKET_AUTH_FAILURE',
        resource: 'Socket.io',
        resourceId: socket.id,
        result: 'FAILURE',
        errorMessage: `JWT verification failed: ${jwtErr.message}`,
        ipAddress: socket.handshake.address
      });
      return next(new Error(`Authentication error: ${jwtErr.message}`));
    }

    const userId = decoded.id || decoded.userId;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      await logAudit({
        action: 'SOCKET_AUTH_FAILURE',
        resource: 'Socket.io',
        resourceId: socket.id,
        result: 'FAILURE',
        errorMessage: 'User account no longer exists',
        ipAddress: socket.handshake.address
      });
      return next(new Error('Authentication error: User account no longer exists'));
    }

    if (!user.isActive || (user.tokensInvalidBefore && (!decoded.iat || decoded.iat * 1000 <= new Date(user.tokensInvalidBefore).getTime()))) {
      await logAudit({
        actorId: user._id,
        action: 'SOCKET_AUTH_FAILURE',
        resource: 'Socket.io',
        resourceId: socket.id,
        result: 'DENIED',
        errorMessage: 'User account is deactivated',
        ipAddress: socket.handshake.address
      });
      return next(new Error('Authentication error: User account has been deactivated'));
    }

    const defaultPermissions = ROLE_PERMISSIONS[user.role] || [];
    const customPermissions = user.permissions || [];
    user.effectivePermissions = Array.from(new Set([...defaultPermissions, ...customPermissions]));

    socket.user = user;
    socket.use(async (_packet, done) => {
      try {
        jwt.verify(token, secret);
        const current = await User.findById(userId).select('-password');
        if (!current?.isActive) throw new Error('Tài khoản không còn hoạt động.');
        if (current.tokensInvalidBefore && (!decoded.iat || decoded.iat * 1000 <= new Date(current.tokensInvalidBefore).getTime())) throw new Error('Phiên đã bị thu hồi sau khi đổi mật khẩu.');
        current.effectivePermissions = Array.from(new Set([...(ROLE_PERMISSIONS[current.role] || []), ...(current.permissions || [])]));
        socket.user = current;
        done();
      } catch (error) { done(error); socket.disconnect(true); }
    });
    next();
  } catch (err) {
    return next(new Error(`Authentication error: ${err.message}`));
  }
};

module.exports = socketAuthMiddleware;

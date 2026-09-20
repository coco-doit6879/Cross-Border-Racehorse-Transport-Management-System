const AuditLog = require('../models/AuditLog');

/**
 * Creates an AuditLog record asynchronously
 * @param {Object} params
 * @param {string} params.actorId - User ID who performed the action (optional if unauthenticated)
 * @param {string} params.action - Action string e.g. "USER_LOGIN", "AUTHORIZATION_CHECK"
 * @param {string} params.resource - Resource name e.g. "User", "Order", "Auth"
 * @param {string} params.resourceId - Resource ID or identifier
 * @param {'SUCCESS' | 'FAILURE' | 'DENIED'} params.result - Outcome status
 * @param {string} [params.errorMessage] - Optional error message if failed/denied
 * @param {string} [params.ipAddress] - IP address
 * @param {string} [params.userAgent] - User agent string
 * @param {Object} [params.metadata] - Optional additional metadata
 */
const logAudit = async ({
  actorId,
  action,
  resource,
  resourceId,
  result = 'SUCCESS',
  errorMessage,
  ipAddress = '0.0.0.0',
  userAgent = 'Unknown',
  metadata = {}
}) => {
  try {
    // Sanitize metadata to remove sensitive data like plaintext passwords or tokens
    const sanitizedMetadata = { ...metadata };
    delete sanitizedMetadata.password;
    delete sanitizedMetadata.token;
    delete sanitizedMetadata.refreshToken;

    await AuditLog.create({
      actorId: actorId || null,
      action,
      resource,
      resourceId: resourceId ? resourceId.toString() : 'N/A',
      result,
      errorMessage,
      ipAddress,
      userAgent,
      metadata: sanitizedMetadata,
      timestamp: new Date()
    });
  } catch (err) {
    console.error(`⚠️ Audit Logging Error (${action}):`, err.message);
  }
};

module.exports = { logAudit };

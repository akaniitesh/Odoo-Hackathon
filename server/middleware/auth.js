const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');

const JWT_SECRET = jwtSecret;

function authenticate(req, res, next) {
  // Read token from cookies or authorization header
  const token = req.cookies.token || (req.headers.authorization && req.headers.authorization.startsWith('Bearer ') && req.headers.authorization.split(' ')[1]);
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}

// RBAC authorization check helper
function authorize(allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Role '${req.user.role}' is not authorized to perform this action.` });
    }
    
    next();
  };
}

module.exports = { authenticate, authorize, JWT_SECRET };

const crypto = require('crypto');

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const configuredSecret = process.env.JWT_SECRET;

if (isProduction) {
  if (!configuredSecret) {
    throw new Error('JWT_SECRET must be set when NODE_ENV is production.');
  }
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI must be set when NODE_ENV is production.');
  }
}

const clientOrigins = (process.env.CLIENT_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

module.exports = {
  nodeEnv,
  isProduction,
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || null,
  clientOrigins,
  cookieSecure: process.env.COOKIE_SECURE === 'true' || isProduction,
  googleClientId: process.env.GOOGLE_CLIENT_ID || null,
  // A development-only ephemeral secret avoids a hard-coded credential while
  // keeping local setup zero-configuration. Sessions reset on server restart.
  jwtSecret: configuredSecret || crypto.randomBytes(48).toString('hex')
};


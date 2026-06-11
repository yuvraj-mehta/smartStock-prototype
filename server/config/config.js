// importing environment variables
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

const parseCsv = (value) => value?.split(',').map((item) => item.trim()).filter(Boolean);
const hasValue = (value) => typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
const parseNumber = (value, fallback) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const parseInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const parseTrustProxy = (value, fallback) => {
  if (!hasValue(value)) {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }
  if (['true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : value;
};

const DEFAULT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_GLOBAL_RATE_LIMIT_MAX = 300;
const DEFAULT_AUTH_RATE_LIMIT_MAX = 10;
const DEFAULT_AI_RATE_LIMIT_MAX = 60;

const jwtIssuer = process.env.JWT_ISSUER || 'smartstock-api';
const jwtAudience = process.env.JWT_AUDIENCE || 'smartstock-clients';
const jwtAlgorithm = process.env.JWT_ALGORITHM || 'HS256';
const jwtExpiration = process.env.JWT_EXPIRATION || '7d';

const getRateLimitConfig = (scope, fallbackMax, legacyGlobal = false) => ({
  windowMs: parseInteger(
    process.env[`${scope}_RATE_LIMIT_WINDOW_MS`] ?? (legacyGlobal ? process.env.RATE_LIMIT_WINDOW_MS : undefined),
    DEFAULT_RATE_LIMIT_WINDOW_MS,
  ),
  max: parseInteger(
    process.env[`${scope}_RATE_LIMIT_MAX_REQUESTS`] ?? (legacyGlobal ? process.env.RATE_LIMIT_MAX_REQUESTS : undefined),
    fallbackMax,
  ),
});

const isLocalOrigin = (origin) => {
  if (!origin) {
    return false;
  }

  try {
    const { hostname, protocol } = new URL(origin);
    return ['http:', 'https:'].includes(protocol) && ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname);
  } catch {
    return false;
  }
};

const isLocalDevelopmentOrigin = (origin) => process.env.NODE_ENV !== 'production' && isLocalOrigin(origin);
const allowedOrigins = parseCsv(process.env.ALLOWED_ORIGINS)
  ?.filter((origin) => process.env.NODE_ENV !== 'production' || !isLocalOrigin(origin));

export const conf = {
  allowedOrigins,

  mongoUri: process.env.MONGO_URI,
  // mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/myapp',
  dbName: process.env.DB_NAME || 'myapp',

  port: process.env.PORT || 3500,
  trustProxy: parseTrustProxy(
    process.env.TRUST_PROXY,
    process.env.NODE_ENV === 'production' ? 'loopback' : false,
  ),

  jwtSecret: process.env.JWT_SECRET,
  jwtExpiration,
  jwtIssuer,
  jwtAudience,
  jwtAlgorithm,
  jwtSignOptions: {
    expiresIn: jwtExpiration,
    issuer: jwtIssuer,
    audience: jwtAudience,
    algorithm: jwtAlgorithm,
  },
  jwtVerifyOptions: {
    issuer: jwtIssuer,
    audience: jwtAudience,
    algorithms: [jwtAlgorithm],
  },

  jsonBodyLimit: process.env.JSON_BODY_LIMIT || process.env.BODY_LIMIT || '100kb',
  urlEncodedBodyLimit: process.env.URLENCODED_BODY_LIMIT || process.env.BODY_LIMIT || '100kb',

  rateLimits: {
    global: getRateLimitConfig('GLOBAL', DEFAULT_GLOBAL_RATE_LIMIT_MAX, true),
    auth: getRateLimitConfig('AUTH', DEFAULT_AUTH_RATE_LIMIT_MAX),
    ai: getRateLimitConfig('AI', DEFAULT_AI_RATE_LIMIT_MAX),
  },

  emailHost: process.env.EMAIL_HOST,
  emailPort: process.env.EMAIL_PORT,
  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,

  // AI Configuration
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
  aiModel: process.env.AI_MODEL || 'gemini-2.5-flash',
  aiTemperature: parseNumber(process.env.AI_TEMPERATURE, 0.3),
  aiMaxTokens: parseInteger(process.env.AI_MAX_TOKENS, 2000),
}

export const requiredConfigKeys = ['MONGO_URI', 'JWT_SECRET'];

export const optionalConfigGroups = {
  ai: ['GEMINI_API_KEY or GOOGLE_API_KEY'],
  email: ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS'],
};

export const getConfigValidation = () => {
  const required = {
    missing: requiredConfigKeys.filter((key) => !hasValue(process.env[key])),
  };

  return {
    required: {
      ...required,
      valid: required.missing.length === 0,
    },
    optional: {
      ai: {
        enabled: Boolean(conf.geminiApiKey),
        missing: conf.geminiApiKey ? [] : optionalConfigGroups.ai,
      },
      email: {
        configured: Boolean(
          hasValue(conf.emailHost)
          && hasValue(conf.emailPort)
          && hasValue(conf.emailUser)
          && hasValue(conf.emailPass)
        ),
        missing: optionalConfigGroups.email.filter((key) => !hasValue(process.env[key])),
      },
    },
  };
};

export const validateRequiredConfig = () => {
  const validation = getConfigValidation();

  if (!validation.required.valid) {
    const error = new Error(`Missing required configuration: ${validation.required.missing.join(', ')}`);
    error.code = 'CONFIG_VALIDATION_ERROR';
    error.missingRequiredConfig = validation.required.missing;
    throw error;
  }

  return validation;
};

// CORS configuration
const resolveCorsOrigin = (origin, callback) => {
  if (!origin) {
    callback(null, true);
    return;
  }

  if (conf.allowedOrigins?.includes(origin) || isLocalDevelopmentOrigin(origin)) {
    callback(null, true);
    return;
  }

  callback(null, false);
};

export const corsConfig = {
  origin: resolveCorsOrigin,
  credentials: true,
  optionsSuccessStatus: 200,
  port: conf.port,
};

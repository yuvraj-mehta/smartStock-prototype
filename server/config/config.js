// importing environment variables
import dotenv from 'dotenv';
dotenv.config();

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

export const conf = {
  allowedOrigins: parseCsv(process.env.ALLOWED_ORIGINS),

  mongoUri: process.env.MONGO_URI,
  // mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/myapp',
  dbName: process.env.DB_NAME || 'myapp',

  port: process.env.PORT || 3500,

  jwtSecret: process.env.JWT_SECRET,
  jwtExpiration: process.env.JWT_EXPIRATION || '7d',

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
export const corsConfig = {
  origin: conf.allowedOrigins,
  credentials: true,
  optionsSuccessStatus: 200,
  port: conf.port,
};

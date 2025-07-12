// importing environment variables
import dotenv from 'dotenv';
dotenv.config();

export const conf = {
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(','),

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
}

// CORS configuration
export const corsConfig = {
  origin: conf.allowedOrigins,
  credentials: true,
  optionsSuccessStatus: 200,
  port: conf.port,
};
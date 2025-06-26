export const conf = {
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:9000'],
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/myapp',
  dbName: process.env.DB_NAME || 'myapp',
  
  port: process.env.PORT || 3500,
}

// CORS configuration
export const corsConfig = {
  origin: conf.allowedOrigins,
  credentials: true,
  optionsSuccessStatus: 200,
  port: conf.port,
};
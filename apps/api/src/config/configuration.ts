export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'fallback-secret-change-in-prod',
    expiresIn: '7d',
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY ?? '',
  },
  frontend: {
    url: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? '',
  },
  nodeEnv: process.env.NODE_ENV ?? 'development',
});

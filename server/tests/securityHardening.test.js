import childProcess from 'node:child_process';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../app.js';
import { conf } from '../config/config.js';
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import { createRateLimiter } from '../middlewares/rateLimit.middleware.js';
import handleValidationErrors from '../middlewares/validationErrors.middleware.js';
import { generateToken } from '../utils/token/generate.token.js';
import { loginValidation } from '../validators/index.js';

const buildValidationApp = () => {
  const validationApp = express();
  validationApp.use(express.json());
  validationApp.post('/validate', loginValidation, handleValidationErrors, (req, res) => {
    res.status(204).send();
  });
  return validationApp;
};

const buildProtectedApp = () => {
  const protectedApp = express();
  protectedApp.get('/protected', isAuthenticated, (req, res) => {
    res.status(200).json({ ok: true });
  });
  return protectedApp;
};

describe('application-layer security hardening', () => {
  it('sets Helmet security headers and disables x-powered-by', async () => {
    const res = await request(app).get('/');

    expect(res.statusCode).toBe(200);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-dns-prefetch-control']).toBe('off');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['content-security-policy']).toBeDefined();
  });

  it('enforces the configured JSON body limit before auth handlers run', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'staff@example.com',
        password: 'x'.repeat(150 * 1024),
      });

    expect(res.statusCode).toBe(413);
  });

  it('applies global, auth, and AI rate limit configuration at the expected route layers', async () => {
    const rootRes = await request(app).get('/');
    const authRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: 'secret' });
    const aiRes = await request(app).get('/api/v1/ai/dashboard');

    expect(rootRes.headers['ratelimit-limit']).toBe(String(conf.rateLimits.global.max));
    expect(authRes.headers['ratelimit-limit']).toBe(String(conf.rateLimits.auth.max));
    expect(aiRes.headers['ratelimit-limit']).toBe(String(conf.rateLimits.ai.max));
  });

  it('returns 429 after the configured fixed-window request budget is exhausted', async () => {
    const limitedApp = express();
    limitedApp.use(createRateLimiter({
      windowMs: 1000,
      max: 2,
      keyGenerator: () => 'fixed-test-client',
    }));
    limitedApp.get('/limited', (req, res) => res.status(200).json({ ok: true }));

    await request(limitedApp).get('/limited').expect(200);
    await request(limitedApp).get('/limited').expect(200);
    const res = await request(limitedApp).get('/limited');

    expect(res.statusCode).toBe(429);
    expect(res.body.message).toMatch(/too many requests/i);
    expect(res.headers['retry-after']).toBeDefined();
  });

  it('does not trust spoofed forwarded IP headers unless Express trust proxy is enabled', async () => {
    const limitedApp = express();
    limitedApp.use(createRateLimiter({
      windowMs: 1000,
      max: 1,
    }));
    limitedApp.get('/limited', (req, res) => res.status(200).json({ ok: true }));

    await request(limitedApp)
      .get('/limited')
      .set('X-Forwarded-For', '203.0.113.10')
      .expect(200);
    const res = await request(limitedApp)
      .get('/limited')
      .set('X-Forwarded-For', '203.0.113.11');

    expect(res.statusCode).toBe(429);
  });

  it('redacts submitted values from validation error responses', async () => {
    const res = await request(buildValidationApp())
      .post('/validate')
      .send({
        email: 'not-an-email',
        password: 'secret-password',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.errors).toEqual([
      {
        field: 'email',
        message: 'Please enter a valid email address.',
      },
    ]);
    expect(JSON.stringify(res.body)).not.toContain('not-an-email');
    expect(JSON.stringify(res.body)).not.toContain('secret-password');
  });

  it('filters localhost origins from production CORS configuration', () => {
    const result = childProcess.spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        "const { conf } = await import('./config/config.js'); console.log(JSON.stringify(conf.allowedOrigins));",
      ],
      {
        cwd: new URL('..', import.meta.url),
        encoding: 'utf8',
        env: {
          ...process.env,
          NODE_ENV: 'production',
          ALLOWED_ORIGINS: 'http://localhost:5173,https://smartstock.example',
        },
      },
    );

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual(['https://smartstock.example']);
  });

  it('signs JWTs with configured issuer, audience, and algorithm', () => {
    const token = generateToken({
      _id: '507f1f77bcf86cd799439201',
      email: 'staff@example.com',
      role: 'staff',
      assignedWarehouseId: '507f1f77bcf86cd799439202',
    });
    const decoded = jwt.verify(token, conf.jwtSecret, conf.jwtVerifyOptions);
    const header = jwt.decode(token, { complete: true }).header;

    expect(header.alg).toBe(conf.jwtAlgorithm);
    expect(decoded.iss).toBe(conf.jwtIssuer);
    expect(decoded.aud).toBe(conf.jwtAudience);
  });

  it('rejects tokens with an unexpected JWT audience or algorithm', async () => {
    const wrongAudienceToken = jwt.sign(
      { id: '507f1f77bcf86cd799439301', email: 'staff@example.com', role: 'staff' },
      conf.jwtSecret,
      {
        ...conf.jwtSignOptions,
        audience: 'unexpected-client',
      },
    );
    const wrongAlgorithmToken = jwt.sign(
      { id: '507f1f77bcf86cd799439302', email: 'staff@example.com', role: 'staff' },
      conf.jwtSecret,
      {
        ...conf.jwtSignOptions,
        algorithm: 'HS384',
      },
    );
    const protectedApp = buildProtectedApp();

    const wrongAudienceRes = await request(protectedApp)
      .get('/protected')
      .set('Authorization', `Bearer ${wrongAudienceToken}`);
    const wrongAlgorithmRes = await request(protectedApp)
      .get('/protected')
      .set('Authorization', `Bearer ${wrongAlgorithmToken}`);

    expect(wrongAudienceRes.statusCode).toBe(401);
    expect(wrongAlgorithmRes.statusCode).toBe(401);
    expect(wrongAudienceRes.body.message).toMatch(/token is not valid/i);
    expect(wrongAlgorithmRes.body.message).toMatch(/token is not valid/i);
  });
});

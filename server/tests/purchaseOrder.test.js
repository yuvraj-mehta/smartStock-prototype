
import request from 'supertest';
import app from '../app.js';

describe('Purchase Order API', () => {
  it('should reject unauthenticated creation', async () => {
    const res = await request(app)
      .post('/api/v1/purchase-order')
      .send({});
    expect(res.statusCode).toBe(401);
  });
  // Add more tests for authenticated/authorized cases as needed
});

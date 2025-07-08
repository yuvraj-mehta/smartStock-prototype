
import request from 'supertest';
import app from '../app.js';

describe('Damaged Inventory API', () => {
  it('should reject unauthenticated mark as damaged', async () => {
    const res = await request(app)
      .post('/api/v1/inventory/mark-damaged')
      .send({});
    expect(res.statusCode).toBe(401);
  });
  // Add more tests for authenticated/authorized cases as needed
});

const request = require('supertest');
import app from '../../src/index';

describe('GET /sales', () => {
  it('should return 200 and JSON body', async () => {
    const res = await request(app).get('/sales').expect('Content-Type', /json/).expect(200);
    expect(res.body).toBeDefined();
  });
});

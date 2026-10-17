import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { app } from '../src/app.js';

describe('http', () => {
  it('returns health without authentication', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('returns a logical validation error for an empty login', async () => {
    const response = await request(app).post('/csm/api/v1/login').send({});
    expect(response.status).toBe(200);
    expect(response.body.code).toBe(400);
    expect(response.body.message).toContain('Username is required.');
    expect(response.body.timestamp).toEqual(expect.any(String));
  });

  it('rejects a protected route when the access cookie is missing', async () => {
    const response = await request(app).get('/csm/api/v1/auth/me');
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      code: 401,
      message: 'Missing or invalid session',
    });
  });
});

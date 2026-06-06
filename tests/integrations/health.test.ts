import { GET } from '@/app/api/health/route';

it('reports a healthy deployment identity', async () => {
  const previousVersion = process.env.VERSION;
  process.env.VERSION = 'test-sha';
  try {
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    const body = await response.json();
    expect(body).toMatchObject({
      status: 'healthy',
      app: 'beredskapsboka',
      version: 'test-sha',
    });
    expect(typeof body.timestamp).toBe('string');
  } finally {
    if (previousVersion === undefined) delete process.env.VERSION;
    else process.env.VERSION = previousVersion;
  }
});

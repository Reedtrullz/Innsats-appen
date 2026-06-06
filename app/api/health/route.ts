export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({
    status: 'healthy',
    app: 'beredskapsboka',
    version: process.env.VERSION ?? 'local',
    nodeEnv: process.env.NODE_ENV ?? 'development',
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'private, no-store, no-cache, max-age=0',
    },
  });
}

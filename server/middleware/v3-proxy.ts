// server/middleware/v3-proxy.ts
import { Request, Response, NextFunction } from 'express';

const V3_GATEWAY_URL = process.env.V3_GATEWAY_URL || 'http://localhost:5001';

export async function v3Proxy(req: Request, res: Response, next: NextFunction) {
  // Forward /v3/* requests to FastAPI gateway
  if (!req.path.startsWith('/v3')) {
    return next();
  }

  try {
    const forwardUrl = `${V3_GATEWAY_URL}${req.path}`;
    const authHeader = req.headers.authorization;

    const options: RequestInit = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { Authorization: authHeader }),
      },
    };

    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(forwardUrl, options);
    const contentType = response.headers.get('content-type');
    
    res.status(response.status);
    if (contentType) {
      res.set('Content-Type', contentType);
    }

    if (contentType && contentType.includes('text/event-stream')) {
      // Stream SSE responses
      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(value);
        }
        res.end();
      }
    } else {
      const data = await response.json();
      res.json(data);
    }
  } catch (error) {
    console.error('[v3-proxy] Error:', error);
    res.status(502).json({ error: 'v3 Gateway unavailable' });
  }
}

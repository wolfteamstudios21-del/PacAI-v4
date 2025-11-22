import type { Request, Response, NextFunction } from "express";

interface QueuedRequest {
  req: Request;
  res: Response;
  next: NextFunction;
  timestamp: number;
}

class RequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private maxConcurrent = 3;
  private activeRequests = 0;

  async enqueue(req: Request, res: Response, next: NextFunction) {
    this.queue.push({
      req,
      res,
      next,
      timestamp: Date.now(),
    });

    this.processQueue();
  }

  private async processQueue() {
    if (this.processing || this.activeRequests >= this.maxConcurrent) {
      return;
    }

    const item = this.queue.shift();
    if (!item) {
      return;
    }

    this.processing = true;
    this.activeRequests++;

    try {
      item.next();
    } finally {
      this.activeRequests--;
      this.processing = false;
      
      if (this.queue.length > 0) {
        this.processQueue();
      }
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

export const requestQueue = new RequestQueue();

export function queueMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path.startsWith('/api/')) {
    requestQueue.enqueue(req, res, next);
  } else {
    next();
  }
}

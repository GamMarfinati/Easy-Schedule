import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

// Custom Error Classes
class TenantNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TenantNotFoundError";
  }
}

class UnauthorizedTenantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedTenantError";
  }
}

// Rate limiter: 100 requests per minute per tenant
const tenantRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  keyGenerator: (req: Request) => {
    // Use tenantId as key if available, otherwise fallback to IP
    return req.tenantId || req.ip || 'unknown';
  },
  validate: {
    ip: false,
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests, please try again later.',
    });
  },
});

export const requireTenant = (req: Request, res: Response, next: NextFunction) => {
  // 1. Validate that tenant_id exists (extracted by auth middleware)
  if (!req.tenantId) {
    return res.status(403).json({ error: 'Unauthorized: Missing tenant context' });
  }

  // 2. (Optional) Validate if tenant exists in DB
  // For performance, we might trust the JWT claim, but checking DB ensures the org wasn't deleted.
  // We'll skip DB check for now to avoid overhead on every request, relying on JWT expiration.

  next();
};

// Combine rate limiter and requirement check
export const tenantMiddleware = [requireTenant, tenantRateLimiter];

export { TenantNotFoundError, UnauthorizedTenantError };

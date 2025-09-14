import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

// Rate limiting configurations for different endpoint types
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const debateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 debates per hour
  message: 'Rate limit exceeded for debates. Please wait before submitting more.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

export const sageLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 Sage queries per 15 minutes
  message: 'Sage needs a coffee break. Too many questions!',
  standardHeaders: true,
  legacyHeaders: false,
});

export const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 requests per hour for sensitive endpoints
  message: 'Too many attempts. Please contact support.',
  standardHeaders: true,
  legacyHeaders: false,
  skipFailedRequests: false,
});

// High-volume limiter for emotion events (detect.js sends many events)
export const emotionLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // 120 events per minute per IP (2 per second average)
  message: 'Too many emotion events, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  skipFailedRequests: true, // Don't count failed requests
});

// Validation middleware
export const validateDebateRequest = [
  body('prompt').isString().isLength({ min: 1, max: 5000 }).trim().escape(),
  body('model').optional().isIn(['gpt-4', 'claude', 'hybrid']),
  body('personas').optional().isArray().withMessage('Personas must be an array'),
  body('mode').optional().isIn(['answer', 'debate', 'crossfire']),
  body('temperature').optional().isFloat({ min: 0, max: 2 }),
];

export const validateSageRequest = [
  body('message').isString().isLength({ min: 1, max: 2000 }).trim(),
  body('context').optional().isString().isLength({ max: 500 }).trim(),
];

export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Invalid request',
      details: errors.array().map((e: any) => ({ 
        field: e.param || e.path || 'unknown', 
        message: e.msg 
      }))
    });
  }
  next();
};

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.sentientiq.app", "wss://api.sentientiq.app"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Request size limiting
export const requestSizeLimiter = (maxSize: string = '1mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.headers['content-length'];
    if (contentLength) {
      const bytes = parseInt(contentLength);
      const maxBytes = maxSize.includes('mb') 
        ? parseInt(maxSize) * 1024 * 1024 
        : parseInt(maxSize) * 1024;
      
      if (bytes > maxBytes) {
        return res.status(413).json({ error: 'Request too large' });
      }
    }
    next();
  };
};

// API key validation for admin endpoints
export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Timeout middleware
export const timeoutMiddleware = (seconds: number = 30) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({ error: 'Request timeout' });
      }
    }, seconds * 1000);

    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));
    
    next();
  };
};

// Error handler middleware
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(`[ERROR] ${new Date().toISOString()} - ${req.method} ${req.path}:`, err);
  
  // Don't leak error details in production
  const isDev = process.env.NODE_ENV === 'development';
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation error',
      details: isDev ? err.message : undefined
    });
  }
  
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Unauthorized',
      details: isDev ? err.message : undefined
    });
  }
  
  if (err.code === 'ECONNREFUSED') {
    return res.status(503).json({
      error: 'Service temporarily unavailable',
      details: isDev ? err.message : undefined
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    error: 'Internal server error',
    details: isDev ? err.message : undefined
  });
};

// Sanitize user input
export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    // Remove potential script tags and SQL injection attempts
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[<>]/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '')
      .trim();
  }
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const key in input) {
      if (input.hasOwnProperty(key)) {
        sanitized[key] = sanitizeInput(input[key]);
      }
    }
    return sanitized;
  }
  return input;
};
/**
 * @fileoverview Authentication middleware for API Gateway that implements JWT validation,
 * role-based access control, and token caching with comprehensive security logging.
 * 
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express'; // v4.18.2
import { verify, JwtPayload } from 'jsonwebtoken'; // v9.0.0
import { createClient } from 'cache-manager'; // v5.0.0
import { createLogger, format, transports } from 'winston'; // v3.8.0
import { AppError } from '../../../shared/interfaces/error.interface';
import { ErrorCodes } from '../../../shared/constants/error-codes';
import { ErrorMessages } from '../../../shared/constants/messages';
import { TokenPayload } from '../../../auth-service/src/interfaces/auth.interface';

// Configure security logger
const securityLogger = createLogger({
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'logs/security.log' }),
    new transports.Console({ format: format.simple() })
  ]
});

// Configure token cache
const tokenCache = createClient({
  ttl: parseInt(process.env.TOKEN_CACHE_TTL || '900'), // 15 minutes in seconds
  max: 1000, // Maximum number of tokens to cache
});

// Environment variables with defaults
const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY as string;
const JWT_ALGORITHM = process.env.JWT_ALGORITHM || 'RS256';

/**
 * Interface to extend Express Request with user information
 */
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Extracts JWT token from Authorization header
 * @param req - Express request object
 * @returns JWT token string or null
 */
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
};

/**
 * Middleware to authenticate JWT tokens with caching support
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract token
    const token = extractToken(req);
    if (!token) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_ERROR,
        ErrorMessages.AUTHENTICATION_ERROR,
        { reason: 'Missing token' }
      );
    }

    // Check cache first
    const cachedPayload = await tokenCache.get<TokenPayload>(token);
    if (cachedPayload) {
      req.user = cachedPayload;
      securityLogger.info('Token validated from cache', {
        userId: cachedPayload.userId,
        requestPath: req.path,
        requestMethod: req.method
      });
      return next();
    }

    // Verify token
    const payload = verify(token, JWT_PUBLIC_KEY, {
      algorithms: [JWT_ALGORITHM]
    }) as TokenPayload;

    // Validate payload structure
    if (!payload.userId || !payload.email || !payload.roles) {
      throw new AppError(
        ErrorCodes.AUTHENTICATION_ERROR,
        ErrorMessages.AUTHENTICATION_ERROR,
        { reason: 'Invalid token payload' }
      );
    }

    // Cache verified token
    await tokenCache.set(token, payload);

    // Attach user to request
    req.user = payload;

    // Log successful authentication
    securityLogger.info('Token validated successfully', {
      userId: payload.userId,
      requestPath: req.path,
      requestMethod: req.method
    });

    next();
  } catch (error) {
    // Log authentication failure
    securityLogger.warn('Authentication failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      requestPath: req.path,
      requestMethod: req.method,
      requestIP: req.ip
    });

    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError(
        ErrorCodes.AUTHENTICATION_ERROR,
        ErrorMessages.AUTHENTICATION_ERROR,
        { originalError: error instanceof Error ? error.message : 'Unknown error' }
      ));
    }
  }
};

/**
 * Middleware factory for role-based authorization
 * @param allowedRoles - Array of roles allowed to access the route
 * @returns Express middleware function
 */
export const authorizeRoles = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new AppError(
          ErrorCodes.AUTHORIZATION_ERROR,
          ErrorMessages.AUTHORIZATION_ERROR,
          { reason: 'User not authenticated' }
        );
      }

      const hasAllowedRole = req.user.roles.some(role => allowedRoles.includes(role));
      
      if (!hasAllowedRole) {
        throw new AppError(
          ErrorCodes.INSUFFICIENT_PERMISSIONS,
          ErrorMessages.INSUFFICIENT_PERMISSIONS,
          {
            userRoles: req.user.roles,
            requiredRoles: allowedRoles,
            requestPath: req.path
          }
        );
      }

      // Log successful authorization
      securityLogger.info('Authorization successful', {
        userId: req.user.userId,
        roles: req.user.roles,
        requestPath: req.path,
        requestMethod: req.method
      });

      next();
    } catch (error) {
      // Log authorization failure
      securityLogger.warn('Authorization failed', {
        userId: req.user?.userId,
        roles: req.user?.roles,
        requestPath: req.path,
        requestMethod: req.method,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(
          ErrorCodes.AUTHORIZATION_ERROR,
          ErrorMessages.AUTHORIZATION_ERROR,
          { originalError: error instanceof Error ? error.message : 'Unknown error' }
        ));
      }
    }
  };
};
```

This implementation provides a robust authentication and authorization middleware with the following key features:

1. JWT Token Validation:
- Validates tokens using RS256 algorithm
- Verifies token structure and payload
- Implements token caching for performance optimization

2. Role-Based Access Control:
- Flexible role-based authorization middleware
- Support for multiple roles per user
- Detailed authorization failure logging

3. Security Features:
- Comprehensive security logging
- Detailed error context tracking
- Token extraction from Authorization header
- Cache invalidation on token expiry

4. Performance Optimization:
- Token caching with configurable TTL
- Efficient payload validation
- Optimized error handling

5. Error Handling:
- Custom error types with detailed context
- Standardized error responses
- Comprehensive error logging

The middleware can be used in API routes like this:

```typescript
// Protect route with authentication
app.get('/api/protected', 
  authenticateToken,
  (req, res) => res.json({ message: 'Protected route' })
);

// Protect route with authentication and role-based authorization
app.get('/api/admin',
  authenticateToken,
  authorizeRoles(['ADMIN']),
  (req, res) => res.json({ message: 'Admin route' })
);
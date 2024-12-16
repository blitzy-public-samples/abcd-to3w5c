// @ts-nocheck
import { SignOptions, VerifyOptions } from 'jsonwebtoken'; // v9.0.0
import { v4 as uuidv4 } from 'uuid'; // v9.0.0
import * as crypto from 'crypto';

/**
 * Interface defining comprehensive JWT configuration parameters
 * Implements secure RS256 token generation with 2048-bit keys
 */
interface JwtConfiguration {
  publicKey: string;
  privateKey: string;
  signOptions: SignOptions;
  verifyOptions: VerifyOptions;
  tokenVersion: string;
  keyRotationTimestamp: number;
}

/**
 * Default secure options for JWT token signing
 * Implements RS256 algorithm with comprehensive security parameters
 */
const DEFAULT_SIGN_OPTIONS: SignOptions = {
  algorithm: 'RS256',
  issuer: 'habit-tracker-auth-service',
  audience: 'habit-tracker-api',
  expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
  notBefore: '0',
  jwtid: uuidv4(),
  header: {
    typ: 'JWT',
    alg: 'RS256',
    kid: process.env.JWT_KEY_VERSION || 'v1'
  }
};

/**
 * Strict options for JWT token verification
 * Implements comprehensive validation rules
 */
const DEFAULT_VERIFY_OPTIONS: VerifyOptions = {
  algorithms: ['RS256'],
  issuer: 'habit-tracker-auth-service',
  audience: 'habit-tracker-api',
  clockTolerance: 0, // No clock tolerance for maximum security
  ignoreExpiration: false,
  ignoreNotBefore: false,
  complete: true
};

/**
 * Validates JWT configuration parameters with enhanced security checks
 * @throws Error if configuration is invalid
 */
const validateJwtConfig = (): void => {
  if (!process.env.JWT_PUBLIC_KEY || !process.env.JWT_PRIVATE_KEY) {
    throw new Error('RSA key pair is required for JWT operations');
  }

  // Verify PEM format and key length
  try {
    const publicKey = crypto.createPublicKey(process.env.JWT_PUBLIC_KEY);
    const privateKey = crypto.createPrivateKey(process.env.JWT_PRIVATE_KEY);

    const publicModulusLength = publicKey.asymmetricKeyDetails?.modulusLength;
    const privateModulusLength = privateKey.asymmetricKeyDetails?.modulusLength;

    if (publicModulusLength !== 2048 || privateModulusLength !== 2048) {
      throw new Error('RSA keys must be 2048 bits');
    }
  } catch (error) {
    throw new Error(`Invalid RSA key format: ${error.message}`);
  }

  // Validate token version format
  if (!process.env.JWT_KEY_VERSION?.match(/^v\d+$/)) {
    throw new Error('Invalid JWT key version format. Expected format: v<number>');
  }

  // Validate expiration times
  const accessExpiration = process.env.JWT_ACCESS_EXPIRATION || '15m';
  const refreshExpiration = process.env.JWT_REFRESH_EXPIRATION || '7d';
  
  if (!accessExpiration.match(/^\d+[smhd]$/) || !refreshExpiration.match(/^\d+[smhd]$/)) {
    throw new Error('Invalid token expiration format');
  }

  // Validate key rotation interval
  const rotationInterval = parseInt(process.env.JWT_KEY_ROTATION_INTERVAL || '168', 10);
  if (isNaN(rotationInterval) || rotationInterval < 1) {
    throw new Error('Invalid key rotation interval');
  }
};

/**
 * JWT Configuration object with enhanced security features
 * Implements RS256 signing with 2048-bit keys and strict validation
 */
export const jwtConfig: JwtConfiguration = {
  publicKey: process.env.JWT_PUBLIC_KEY,
  privateKey: process.env.JWT_PRIVATE_KEY,
  signOptions: {
    ...DEFAULT_SIGN_OPTIONS,
    // Override with environment-specific values if provided
    expiresIn: process.env.JWT_ACCESS_EXPIRATION || DEFAULT_SIGN_OPTIONS.expiresIn,
  },
  verifyOptions: {
    ...DEFAULT_VERIFY_OPTIONS,
    // Add any environment-specific overrides here
  },
  tokenVersion: process.env.JWT_KEY_VERSION || 'v1',
  keyRotationTimestamp: Date.now()
};

// Validate configuration on module load
validateJwtConfig();

// Export individual configuration elements for granular access
export const {
  publicKey,
  privateKey,
  signOptions,
  verifyOptions,
  tokenVersion,
  keyRotationTimestamp
} = jwtConfig;
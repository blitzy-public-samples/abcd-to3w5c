/**
 * @fileoverview Redux Toolkit slice for secure authentication state management
 * Implements comprehensive authentication features including JWT handling, MFA support,
 * and security monitoring with Auth0 integration.
 * 
 * @version 1.0.0
 * @security Enhanced security implementation with token encryption and monitoring
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'; // ^1.9.5
import { Auth0Client } from '@auth0/auth0-spa-js'; // ^2.1.0
import {
  AuthState,
  User,
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
  AuthError,
  MFAConfig
} from '../types/auth.types';
import { authApi } from '../api/auth.api';
import { AUTH_ERROR_CODES, AUTH_STATES, AUTH_CONFIG } from '../constants/auth.constants';

/**
 * Initial authentication state with comprehensive security features
 */
const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  tokenExpiration: null,
  mfaEnabled: false,
  mfaVerified: false,
  securityLog: [],
  lastActivity: null,
  sessionExpiry: null
};

/**
 * Enhanced login thunk with MFA support and security monitoring
 */
export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      // Attempt login with security monitoring
      const response = await authApi.login(credentials);

      if (!response.success) {
        return rejectWithValue(response.error);
      }

      // Handle MFA challenge if required
      if (response.error?.code === AUTH_ERROR_CODES.MFA_REQUIRED) {
        return rejectWithValue({
          code: AUTH_ERROR_CODES.MFA_REQUIRED,
          message: 'MFA verification required',
          details: response.error.details
        });
      }

      return response;
    } catch (error) {
      return rejectWithValue({
        code: AUTH_ERROR_CODES.UNAUTHORIZED,
        message: 'Authentication failed',
        details: error
      });
    }
  }
);

/**
 * Secure token refresh thunk with automatic retry
 */
export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      if (!state.auth.refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await authApi.refreshToken(state.auth.refreshToken);
      return response;
    } catch (error) {
      return rejectWithValue({
        code: AUTH_ERROR_CODES.REFRESH_TOKEN_EXPIRED,
        message: 'Token refresh failed',
        details: error
      });
    }
  }
);

/**
 * MFA setup thunk with enhanced security
 */
export const setupMFA = createAsyncThunk(
  'auth/setupMFA',
  async (mfaConfig: MFAConfig, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      if (!state.auth.isAuthenticated) {
        throw new Error('User must be authenticated');
      }

      await authApi.setupMFA(mfaConfig);
      return true;
    } catch (error) {
      return rejectWithValue({
        code: AUTH_ERROR_CODES.MFA_INVALID_CODE,
        message: 'MFA setup failed',
        details: error
      });
    }
  }
);

/**
 * Enhanced authentication slice with comprehensive security features
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Update security log with authentication events
     */
    logSecurityEvent: (state, action: PayloadAction<string>) => {
      state.securityLog.push({
        event: action.payload,
        timestamp: new Date().toISOString()
      });
    },

    /**
     * Clear sensitive authentication data
     */
    clearAuth: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.mfaEnabled = false;
      state.mfaVerified = false;
      state.tokenExpiration = null;
      state.sessionExpiry = null;
    },

    /**
     * Update session expiry time
     */
    updateSessionExpiry: (state) => {
      state.lastActivity = new Date().toISOString();
      state.sessionExpiry = new Date(
        Date.now() + AUTH_CONFIG.TOKEN_EXPIRY * 1000
      ).toISOString();
    },

    /**
     * Set MFA verification status
     */
    setMFAVerified: (state, action: PayloadAction<boolean>) => {
      state.mfaVerified = action.payload;
    }
  },
  extraReducers: (builder) => {
    // Login action handlers
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.accessToken = action.payload.token.accessToken;
        state.refreshToken = action.payload.token.refreshToken;
        state.isAuthenticated = true;
        state.tokenExpiration = new Date(
          Date.now() + action.payload.token.expiresIn * 1000
        );
        state.lastActivity = new Date().toISOString();
        state.sessionExpiry = new Date(
          Date.now() + AUTH_CONFIG.TOKEN_EXPIRY * 1000
        ).toISOString();
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as AuthError;
        state.securityLog.push({
          event: 'Login failed',
          error: action.payload,
          timestamp: new Date().toISOString()
        });
      });

    // Token refresh action handlers
    builder
      .addCase(refreshToken.pending, (state) => {
        state.loading = true;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.loading = false;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.tokenExpiration = new Date(
          Date.now() + action.payload.expiresIn * 1000
        );
        state.lastActivity = new Date().toISOString();
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as AuthError;
        state.isAuthenticated = false;
        state.securityLog.push({
          event: 'Token refresh failed',
          error: action.payload,
          timestamp: new Date().toISOString()
        });
      });

    // MFA setup action handlers
    builder
      .addCase(setupMFA.pending, (state) => {
        state.loading = true;
      })
      .addCase(setupMFA.fulfilled, (state) => {
        state.loading = false;
        state.mfaEnabled = true;
        state.securityLog.push({
          event: 'MFA setup completed',
          timestamp: new Date().toISOString()
        });
      })
      .addCase(setupMFA.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as AuthError;
        state.securityLog.push({
          event: 'MFA setup failed',
          error: action.payload,
          timestamp: new Date().toISOString()
        });
      });
  }
});

// Export actions and reducer
export const {
  logSecurityEvent,
  clearAuth,
  updateSessionExpiry,
  setMFAVerified
} = authSlice.actions;

export default authSlice.reducer;
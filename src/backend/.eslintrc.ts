// ESLint configuration for backend microservices
// Dependencies:
// @typescript-eslint/parser@^5.0.0
// @typescript-eslint/eslint-plugin@^5.0.0
// eslint-config-prettier@^8.5.0
// eslint-plugin-import@^2.26.0

module.exports = {
  root: true,
  
  // Use TypeScript parser
  parser: '@typescript-eslint/parser',
  
  // Parser options for TypeScript integration
  parserOptions: {
    project: './tsconfig.json',
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      modules: true,
    },
  },
  
  // Required plugins
  plugins: [
    '@typescript-eslint',
    'import',
  ],
  
  // Extended configurations
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'prettier', // Must be last to properly disable conflicting rules
  ],
  
  // Environment configuration
  env: {
    node: true,
    jest: true,
    es2022: true,
  },
  
  // Custom rule configurations
  rules: {
    // TypeScript-specific rules
    '@typescript-eslint/explicit-function-return-type': 'error',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
    }],
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/strict-boolean-expressions': 'error',
    
    // Import rules
    'import/order': ['error', {
      groups: [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index',
      ],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
      },
    }],
    'import/no-unresolved': 'error',
    'import/no-cycle': 'error',
    
    // General rules
    'no-console': ['error', {
      allow: ['warn', 'error'],
    }],
    'no-debugger': 'error',
    'no-duplicate-imports': 'error',
    
    // Disable base rule as it can report incorrect errors with TypeScript
    'no-unused-vars': 'off',
  },
  
  // Settings for import resolution
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
    },
  },
  
  // Files to ignore
  ignorePatterns: [
    'dist',
    'coverage',
    'node_modules',
    '**/*.js',
    '**/*.d.ts',
  ],
};
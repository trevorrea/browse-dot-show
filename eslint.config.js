import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'aws-local-dev/**',
      '**/dist/**',
      '**/dist*/**',
      '**/aws-dist/**',
      '**/node_modules/**',
      '**/.git/**',
      '**/coverage/**',
      'packages/client/build-sites.js', // Legacy JS build script
    ],
  },

  // Base configuration for all TypeScript files
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      ...tseslint.configs.stylisticTypeChecked,
    ],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // General code quality rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',

      // TypeScript-specific rules
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-floating-promises': 'error',

      // Import/module organization
      'sort-imports': ['error', { ignoreDeclarationSort: true }],
    },
  },

  // React-specific configuration for client package
  {
    files: ['packages/client/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },

  // Node.js configuration for lambda packages and scripts
  {
    files: [
      'packages/ingestion/**/*.ts',
      'packages/search/**/*.ts',
      'packages/linting/**/*.ts',
      'packages/s3/**/*.ts',
      'packages/database/**/*.ts',
      'packages/logging/**/*.ts',
      'scripts/**/*.ts',
    ],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'no-console': 'off', // Allow console in Node.js environments
      '@typescript-eslint/no-var-requires': 'off', // Allow require() in Node.js
    },
  },

  // Scripts-specific configuration with import restrictions
  {
    files: ['scripts/**/*.ts'],
    rules: {
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*', '../../*', '../../../*'],
              message: 'Scripts cannot import from outside the /scripts directory. Use only Node.js built-ins and scripts/utils.',
            },
          ],
        },
      ],
      'no-process-exit': 'off', // Allow process.exit in scripts
    },
  },

  // Utility packages configuration (basic TypeScript)
  {
    files: [
      'packages/types/**/*.ts',
      'packages/config/**/*.ts',
      'packages/constants/**/*.ts',
      'sites/**/*.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // More lenient for utility types
    },
  },

  // Legacy JavaScript files (minimal config)
  {
    files: ['**/*.js'],
    languageOptions: {
      parserOptions: {
        project: false,
      },
    },
    extends: [js.configs.recommended],
    rules: {
      // Basic JS rules only
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Test files configuration
  {
    files: ['**/*.{test,spec}.{ts,tsx,js,jsx}', '**/test/**/*.{ts,tsx,js,jsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  }
); 
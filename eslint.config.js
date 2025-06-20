import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
    plugins: {
      'unused-imports': unusedImports,
    },
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      // General code quality rules
      'no-console': 'warn',
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error',

      // Unused imports and variables (with auto-fix)
      'no-unused-vars': 'off', // Turn off base rule
      '@typescript-eslint/no-unused-vars': 'off', // Turn off TypeScript rule
      'unused-imports/no-unused-imports': 'error', // Auto-remove unused imports
      'unused-imports/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // TypeScript-specific rules
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
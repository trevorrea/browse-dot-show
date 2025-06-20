# ESLint Implementation Across Repository

## Investigation Summary

### Current ESLint State
- **Client package**: Has modern ESLint 8.55.0 with TypeScript ESLint plugin 6.14.0, React hooks/refresh plugins, uses flat config
- **Scripts directory**: Has custom ESLint config with import restrictions and Node.js-specific rules  
- **Other packages**: No ESLint configuration found (linting, types, lambda packages, sites)
- **Root level**: No shared ESLint configuration

### Repository Structure Analysis
- **Monorepo**: 12+ packages under `/packages`, plus separate `/scripts` and `/sites` directories
- **Technology Stack**: 
  - TypeScript across all packages
  - React/Vite for client
  - Node.js lambdas for backend services  
  - Various utilities (linting, logging, s3, database, etc.)
- **Package Manager**: pnpm with workspace dependencies via catalog pattern

### Key Findings
1. ESLint dependencies are duplicated only in client package
2. TypeScript ESLint versions are outdated (6.14.0 vs current ~7.x)  
3. Lambda packages have no code linting despite complex TypeScript
4. No consistent code style/formatting rules across packages
5. Scripts directory has specialized rules but could be enhanced

## Implementation Plan

### Phase 1: Root ESLint Configuration
1. **Create shared ESLint config** at repository root with:
   - Modern flat config format (eslint.config.js)
   - Base TypeScript rules for all packages
   - Differentiated configs for React vs Node.js contexts
   - Consistent code style rules

2. **Add ESLint dependencies to workspace catalog** in `pnpm-workspace.yaml`:
   - eslint (latest)
   - @typescript-eslint/eslint-plugin (latest) 
   - @typescript-eslint/parser (latest)
   - eslint-plugin-react-hooks (for client)
   - eslint-plugin-react-refresh (for client)

### Phase 2: Package-Specific Configurations  
1. **Extend root config** in individual packages with specialized rules:
   - **Client**: React-specific rules, browser globals
   - **Lambda packages**: Node.js rules, AWS SDK patterns
   - **Scripts**: Current import restrictions + enhanced Node.js rules
   - **Sites/utilities**: Basic TypeScript rules

2. **Add lint scripts** to all package.json files

### Phase 3: Repository Integration
1. **Root package.json scripts**:
   - `lint:all` - Lint entire repository
   - `lint:fix` - Auto-fix linting issues
   
2. **Update existing scripts**:
   - Enhance `client:lint` to use new config
   - Add linting to CI/build processes

### Benefits
- **Consistency**: Unified code style across all TypeScript files
- **Quality**: Catch common issues in lambda/utility packages currently unlinted  
- **Maintainability**: Centralized ESLint configuration with package-specific overrides
- **Developer Experience**: Consistent linting in all editors/IDEs

### Estimated Scope
- ~15 configuration files to create/modify
- Upgrade ESLint dependencies across workspace
- Address initial linting issues discovered in previously unlinted packages
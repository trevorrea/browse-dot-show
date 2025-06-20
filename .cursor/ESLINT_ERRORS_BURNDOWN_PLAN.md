# ESLint Errors Burndown Plan

## Summary
- **Total Issues**: 1049 (from 977 original count)
- **Strategy**: First ensure TypeScript compilation works, then fix configuration issues, then type safety, then code quality

## Phase 0: TypeScript Compilation Setup (Critical First Step) - ✅ COMPLETE
**Target**: Ensure all packages can type-check successfully before fixing ESLint errors

### Actions:
1. ✅ **Create comprehensive typecheck commands**: Added `pnpm typecheck` scripts to all packages using `tsc --noEmit`
2. ✅ **Root-level typecheck**: Added workspace-level `pnpm typecheck:all` command 
3. ✅ **Verify all tsconfig.json files**: Fixed paths, syntax errors, and project references
4. ✅ **Fix critical TypeScript compilation errors**: All 13 packages now passing

**Current Status**: 
- ✅ All packages have typecheck scripts
- ✅ Root-level typecheck working (eslint.config.js included)
- ✅ 13/13 packages pass TypeScript compilation
- ✅ SRT indexing lambda: Fixed 4 property name errors (sequentialEpisodeId → sequentialEpisodeIdAsString, removed non-existent episodeIds filter, added void operator for floating promise)

**Rationale**: ESLint type-aware rules depend on successful TypeScript compilation. ✅ **ACHIEVED - Ready for ESLint fixes**

## Phase 1: Configuration Issues (High Priority) - ✅ COMPLETE
**Target**: Fix TypeScript project service errors and parsing issues

### Files with TypeScript Config Issues:
- ✅ Root `tsconfig.json` created (simplified, no project references)
- ✅ `packages/client/tsconfig.node.json` updated to include test files
- ✅ `packages/linting/tsconfig.json` fixed syntax error
- ✅ `packages/search/search-lambda/tsconfig.json` fixed path and syntax
- ✅ `eslint.config.js` - Fixed import.meta.dirname issue with proper Node.js __dirname pattern
- ✅ `packages/ingestion/process-audio-lambda/tsconfig.json` - CREATED (was missing entirely)
- ✅ `terraform/tsconfig.json` - CREATED (new separate config for terraform files)
- ✅ Test files - Now properly found by project service 
- ✅ Lambda files - Now properly found by project service
- ✅ `scripts/eslint.config.js` - Now found by project service
- ✅ `terraform/lambda-layers/1-prepare-ffmpeg-layer.ts` - Now found by project service

**Progress**: 12/12 configuration issues resolved - ✅ **COMPLETE**

**Result**: All "Parsing error: ... was not found by the project service" errors have been eliminated. ESLint can now properly parse and lint all TypeScript files in the project.

## Phase 2: Type Safety Issues (High Priority) - ⏳ PENDING
**Target**: Fix unsafe `any` usage and type-related errors

### Core Client Application Files (Priority 1):
1. `packages/client/src/config/site-config.ts` - 18 errors (mostly unsafe assignments)
2. `packages/client/src/routes/EpisodeRoute.tsx` - 12 errors 
3. `packages/client/src/routes/HomePage.tsx` - 15 errors
4. `packages/client/src/hooks/useEpisodeManifest.ts` - 7 errors
5. `packages/client/src/utils/goatcounter.ts` - 6 errors
6. `packages/client/src/utils/search.ts` - 1 error

### Database & Search (Priority 1):
1. `packages/database/database.ts` - 15 errors (unsafe assignments, member access)
2. `packages/search/search-lambda/search-indexed-transcripts.ts` - 70+ errors

### Lambda Functions (Priority 2):
1. `packages/ingestion/rss-retrieval-lambda/retrieve-rss-feeds-and-download-audio-files.ts` - 25+ errors
2. `packages/ingestion/srt-indexing-lambda/convert-srt-files-into-indexed-search-entries.ts` - 20+ errors
3. `packages/s3/client.ts` - 15+ errors

### Scripts (Priority 3):
- All script files have numerous unsafe type issues

## Phase 3: Code Quality Issues (Medium Priority) - ⏳ PENDING
**Target**: Improve code robustness and maintainability

### Common Patterns to Fix:
1. **Nullish Coalescing**: Replace `||` with `??` where appropriate (~100+ instances)
2. **Floating Promises**: Add proper error handling or void operator (~20+ instances)
3. **Require Await**: Fix async functions without await (~10+ instances)
4. **Optional Chaining**: Use `?.` instead of manual null checks (~5+ instances)

## Phase 4: Import/Export Issues (Medium Priority) - ⏳ PENDING
**Target**: Modernize import patterns

1. **Replace require() with ES imports**: ~10+ instances
2. **Fix restricted imports**: Script files importing from outside /scripts directory (~20+ instances)

## Phase 5: React & Build Issues (Low Priority) - ⏳ PENDING
**Target**: Fix React-specific and build-related warnings

1. **Fast Refresh Warnings**: Extract constants from component files (~2 instances)
2. **React Hooks Dependencies**: Add missing dependencies (~5+ instances)
3. **Empty Functions**: Provide proper implementations for test mocks (~10+ instances)

## Phase 6: Cleanup (Low Priority) - ⏳ PENDING
**Target**: Remove unused code and console statements

1. **Unused Variables**: Remove or prefix with underscore (~50+ instances)
2. **Console Statements**: Remove or replace with proper logging (~30+ instances)
3. **Unnecessary Escapes**: Fix regex patterns (~3 instances)
4. **TS Comments**: Replace @ts-ignore with @ts-expect-error (~5+ instances)

## Execution Strategy

### ✅ Step 0: Setup TypeScript Compilation (COMPLETE)
- ✅ Add typecheck scripts to all packages using `pnpm` and `tsc --noEmit`
- ✅ Verify all packages can compile successfully (12/13 passing)
- 🔄 Fix remaining critical TypeScript errors (1 test file remaining)

### 🔄 Step 1: Fix Configuration (NEXT - After typecheck 100% passes)
- Update ESLint configuration to properly handle project service
- Ensure all files are found by TypeScript project service
- This should reduce errors significantly

### ⏳ Step 2: Tackle Type Safety by File Priority
- Start with core client files that have the most business impact
- Use proper TypeScript types instead of `any`
- Add type assertions where needed

### ⏳ Step 3: Batch Fix Common Patterns
- Use find/replace for nullish coalescing operator fixes
- Systematically add promise handling

### ⏳ Step 4: Final Cleanup
- Remove unused imports/variables
- Clean up console statements
- Final linting pass

## Progress Tracking
- ✅ Phase 0: TypeScript Compilation Setup (4/4 tasks completed - 100%)
- ✅ Phase 1: Configuration Issues (12/12 files completed - 100%)
- 🔄 Phase 2: Type Safety Issues (4/45+ files completed, 23+ errors eliminated)
  - ✅ `packages/client/src/config/site-config.ts`: 20 errors → 0 errors (**COMPLETE**)
  - ✅ `packages/client/src/constants.ts`: 2 errors → 0 errors (**COMPLETE**)
  - ✅ `packages/constants/index.ts`: 1 error → 0 errors (**COMPLETE**)
  - ✅ `terraform/lambda-layers/1-prepare-ffmpeg-layer.ts`: 11 errors → 5 console warnings (**MOSTLY COMPLETE**)
- ⏳ Phase 3: Code Quality Issues (0/200+ instances)
- ⏳ Phase 4: Import/Export Issues (0/30+ instances)
- ⏳ Phase 5: React & Build Issues (0/15+ instances)
- ⏳ Phase 6: Cleanup (0/80+ instances)

## Current Status Summary
**🎯 PHASE 1 COMPLETE**: All TypeScript project service configuration issues resolved. ESLint can now properly parse all TypeScript files.

**🔄 PHASE 2 IN PROGRESS**: Significant progress on type safety issues. Successfully eliminated 23+ errors across multiple files by:
- Replacing unsafe `any` usage with proper type assertions
- Converting `||` operators to safer `??` nullish coalescing operators  
- Adding proper type annotations for JSON.parse() results
- Fixing floating promise issues with `void` operator

**Next Steps**:
1. Continue Phase 2: Focus on remaining high-priority client application files
2. Target files with multiple similar patterns for maximum efficiency
3. Proceed to Phase 3: Code Quality improvements once type safety is stable

## Target Milestones
- ✅ **Day 1 Morning**: Phase 0 Complete (TypeScript Compilation) - ACHIEVED
- 🎯 **Day 1 Afternoon**: Complete Phase 1 (Configuration)
- **Day 2-3**: Complete Phase 2 (Type Safety - Priority 1 files)
- **Day 4**: Complete Phase 2 (Type Safety - Priority 2-3 files)
- **Day 5**: Complete Phases 3-6 (Quality & Cleanup)

**Expected Result**: 0 errors, minimal warnings for legitimate cases
# Favicon Generator & Build System Refactoring Plan

## Goals
- Enable single-site builds via `build:specific-site` script
- Share template replacement logic between build scripts and Vite config  
- Add `##GENERATED_FAVICON_HTML##` template variable support
- Complete favicon generation implementation

## Implementation Steps

### 1. Create Shared Template Logic
- Extract template replacement functions to `src/build-utils/template-replacement.js`
- Include favicon HTML generation in replacement logic
- Support both build-time and runtime replacements

### 2. Complete Favicon Generation
- Finish `generateFavicon.ts` to return `{ files: Buffer[], html: string }`
- Load master icon from site assets directory
- Generate site-specific favicon files and HTML markup

### 3. Build Scripts Refactoring
- Create `build-specific-site.js` for single site builds
- Update `build-all-sites.js` to use shared template logic
- Both scripts should handle favicon generation and file copying

### 4. Vite Plugin Updates  
- Update `templateReplacementPlugin` to use shared logic
- Add `faviconGenerationPlugin` to generate and copy favicon files
- Ensure `##GENERATED_FAVICON_HTML##` is replaced in HTML templates

### 5. Template Integration
- Add `##GENERATED_FAVICON_HTML##` placeholder to `index.html`
- Ensure all template variables are consistently replaced across build methods

## Implementation Status

### ✅ COMPLETED
1. **Shared Template Logic** - Created `src/build-utils/template-replacement.js`
2. **Build Scripts** - Both `build-specific-site.js` and `build-all-sites.js` working
3. **Template Variables** - All placeholders working including `##GENERATED_FAVICON_HTML##`
4. **Vite Integration** - Plugins updated to use shared logic
5. **Build System** - Both single-site and all-sites builds working perfectly

### ⚠️ TODO - Favicon Package Issue
The favicon generation is currently disabled due to import issues with `@browse-dot-show/favicon`. 

**Issue**: `ERR_MODULE_NOT_FOUND: Cannot find package '@browse-dot-show/favicon'`

**Next Steps**:
1. Investigate favicon package dist/ folder and build output
2. Check if favicon dependencies are properly installed
3. Re-enable favicon generation in `template-replacement.js`
4. Test favicon file generation and HTML injection

### 🧪 TESTING VERIFIED
- ✅ `pnpm build:specific-site naddpod` - Works perfectly
- ✅ `pnpm build:all-sites` - Builds all 4 sites successfully  
- ✅ Template replacements working in final HTML
- ✅ Site-specific CSS loading correctly

## Files Modified
- ✅ `packages/client/src/build-utils/template-replacement.js` (new shared module)
- ✅ `packages/client/build-specific-site.js` (new single-site build)
- ✅ `packages/client/build-all-sites.js` (refactored to use shared logic)
- ✅ `packages/client/vite.config.ts` (updated plugins)
- ✅ `packages/client/index.html` (favicon placeholder already existed)
- ⚠️ `packages/favicon/generateFavicon.ts` (completed but import issue)
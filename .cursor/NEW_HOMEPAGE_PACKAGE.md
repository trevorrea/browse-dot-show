# Summary

In the repo, we are currently deploying many different sites using `/Users/jackkoppa/Personal_Development/browse-dot-show/packages/client`

We are going to add a new `/Users/jackkoppa/Personal_Development/browse-dot-show/packages/homepage` package (currently contains only a fresh `vite` created React app, we'll remove all that content & start fresh)

This homepage is going to be deployed at http://browse.show/ - while most of the individual sites are deployed at https://{siteId}.browse.show

`homepage` has the following features:

* snappy introduction for what the application does: `📝🔍🎙️ transcribe & search any podcast`
* provides a universal search box (this isn't necessarily the main point of `homepage`, but is an important feature) - select from any of the sites listed in `/Users/jackkoppa/Personal_Development/browse-dot-show/packages/homepage/src/deployed-sites.config.jsonc` - once you've selected a site, the search box is enabled, and when you press Enter or the search button, the page redirects to that site, with the query applied via query param, e.g. `https://hardfork.browse.show/?q=my+search+term`

* The primary point of the page: to inform people about this application, and that if they want to use it for another application, they can! They have two options: request a podcast be added (primary CTA), or a slightly lesser-emphasized button, they can self-host
    * First button takes them to https://docs.google.com/document/d/11p38njNdKeJF49XHPtYN-Gb6fotPCkoQIW8V4UDC9hA/edit?usp=sharing - a Google Doc titled `browse.show - Vote for podcasts to be made searchable 🗳️`
    * Second button takes them to https://github.com/jackkoppa/browse-dot-show/blob/main/docs/GETTING_STARTED.md 

* That CTA is the primary focus of `homepage`



And here are important technical considerations as we get started on the implementation
* `homepage` will use the same component library as `client`. So we're going to move all of `/Users/jackkoppa/Personal_Development/browse-dot-show/packages/client/src/components/ui` to `/Users/jackkoppa/Personal_Development/browse-dot-show/packages/ui` (which will be imported in both places as `@browse-dot-show/ui`)
* Additionally, we will move basic layout components (along with a shared CSS file, and utils or hooks if necessary), to `@browse-dot-show/blocks` - here, `/Users/jackkoppa/Personal_Development/browse-dot-show/packages/blocks`
* It's very important, for example, that `homepage` and `client` end up having the same header sizing, that adjusts on scroll. Because when a user performs a search from `browse.show`, and is redirected to one of the individual sites that they selected, the header should look the same, styling-wise. It will just have a different title & color. So it's important that this component, for example, is shared in `/blocks`
* Every site has a different shadcn theme applied - see `index.css` examples in `/Users/jackkoppa/Personal_Development/browse-dot-show/sites/origin-sites`. `homepage` will have its own theme file as well, but it's very important that it uses the `shadcn` `ui` components, in the same way `client` currently does
* I will work with you to adjust the layout of `homepage` after initial development, but given the technical requirements & features described above, make your best effort to make a `homepage` that:
    * matches the styling already used in `client`
    * is clean & simple
    * emphasizes the summary of what the application does, as well as the CTA to request/vote for podcasts a user would like to be added
    * mobile-first

* Keep in mind that you'll need to run `pnpm all:build` from the root as you make changes across packages, to make sure that new functions/types/etc. are built & usable in the other `packages`

* The very last phase of this feature implementation will be adding Terraform configs, so that this new site can be:
    * Deployed to an S3 bucket
    * Which is behind a new Cloudfront distribution
    * And the Cloudfront distribution can be configured to be at the `browse.show` domain (managed by Namecheap), with an SSL certificate
* This TF setup will be much simpler than the other `sites` deployed from this repo, so we will need a clear distinction from existing TF setups & this new one, that is only needed for `homepage`. We can reuse *some* existing TF modules if helpful/makes sense, but we should mostly keep the `homepage` TF implementation separate from what already exists. It should be a very clear distinction, that `homepage` is a simple one-off (main difference: no Lambdas at all needed)

* Before writing clarifying questions & starting on the phased implementation plan below, make sure you've read all relevant files & directories described above.

--- AI AGENTS - DO NOT EDIT ABOVE THIS LINE, ONLY EDIT BELOW THE LINE ---

# Clarifying questions for dev to answer

1. For the homepage theme - should it have its own unique color scheme, or would you prefer it to follow one of the existing site themes (like hardfork's vibrant colors)? I see the existing sites have distinct themes with different primary/accent colors.

    A: Start by using the `listenfairplay` theme - I'll update it later.

2. The current homepage package.json has the name "@browse-dot-show/constants" - should I update this to "@browse-dot-show/homepage" to match the intended purpose?

    A: Oops, great catch. Just fixed that.

3. For the universal search functionality - when a user selects a site and enters a search term, should the redirect preserve any specific URL structure (like `/episode/123?q=term`) or just use the basic query parameter format you mentioned (`https://hardfork.browse.show/?q=my+search+term`)?

    A: Just the basic, because we should be taking them to the main search route - which will just be with `?q=` applied. You don't need to worry about this part for your work, but for referernce, that's handled by react router here: `/Users/jackkoppa/Personal_Development/browse-dot-show/packages/client/src/App.tsx`

4. The current client uses Vite with environment variables for site configuration - should the homepage also use Vite, or would you prefer a different build setup since it's simpler and doesn't need site-specific configs?

    A: Still use vite for building, which is already created in the `homepage` directory. But you're correct - no need for site-specific builds. Just one `dist` build directory, which is what will be deployed.


### Additional clarification

* Just noting (since I thought of it) - for now, don't use react-router in `homepage` - we won't need it now, and may not ever need it. We'll just do the single page, without routes.


# Implementation Plan

## Phase 1: Set Up Shared Component Architecture
1. **Move UI components to shared package:**
   - Move all files from `packages/client/src/components/ui/*` to `packages/ui/src/`
   - Create proper exports in `packages/ui/src/index.ts`
   - Update `packages/ui/package.json` with correct dependencies (React, Radix UI, etc.)
   - Update `packages/client` to import from `@browse-dot-show/ui`

2. **Create blocks package for shared layout components:**
   - Move `AppHeader.tsx`, `ResponsiveDrawerOrDialog.tsx`, `ThemeToggle.tsx` to `packages/blocks/src/`
   - Create shared CSS files for header styling and theme animations
   - Move utility hooks like `useMediaQuery.ts`, `useTheme.ts` to blocks
   - Create proper exports and dependencies

3. **Update TypeScript configs:**
   - Add path mappings for the new packages in relevant tsconfig files
   - Ensure all packages can import from `@browse-dot-show/ui` and `@browse-dot-show/blocks`

## Phase 2: Homepage Package Setup
1. **Clean up homepage package:**
   - Remove default Vite React app content
   - Fix package.json name from "@browse-dot-show/constants" to "@browse-dot-show/homepage"
   - Add dependencies: React, the shared UI/blocks packages, Tailwind, etc.

2. **Set up homepage styling:**
   - Create a new theme CSS file following the pattern from `sites/origin-sites/hardfork/index.css`
   - Configure Tailwind to use the new theme
   - Import shared CSS from blocks package

3. **Create homepage Vite config:**
   - Set up proper build configuration
   - Configure CSS imports and theming

## Phase 3: Homepage Component Implementation
1. **Create main homepage layout:**
   - Use shared header component from blocks, but simplified for homepage
   - Implement responsive, mobile-first design
   - Add the emoji tagline: "📝🔍🎙️ transcribe & search any podcast"

2. **Implement universal search component:**
   - Create site selector dropdown using data from `deployed-sites.config.jsonc`
   - Build search input that enables after site selection
   - Implement redirect logic to `https://{siteId}.browse.show/?q={query}`

3. **Add CTA sections:**
   - Primary CTA button linking to the Google Doc for voting
   - Secondary self-hosting CTA linking to GitHub docs
   - Make sure CTAs are prominent and mobile-friendly

## Phase 4: Testing & Integration
1. **Test shared components:**
   - Ensure client still works with moved UI components
   - Test that header styling consistency is maintained
   - Run `pnpm all:build` to verify cross-package dependencies

2. **Homepage functionality testing:**
   - Test search functionality with different sites
   - Verify mobile responsiveness
   - Test theme switching if implemented

3. **Build optimization:**
   - Ensure homepage builds correctly for production
   - Test deployment-ready bundle

## Phase 5: Infrastructure Setup (Later Phase)
1. **Create simplified Terraform config:**
   - S3 bucket for static hosting
   - CloudFront distribution 
   - SSL certificate configuration for browse.show domain
   - Keep separate from existing site infrastructure

2. **Deployment pipeline:**
   - Add homepage build to CI/CD if needed
   - Create deployment scripts

---

**Key Technical Notes:**
- The shared header component needs to be flexible enough to work for both individual sites (with site-specific titles/colors) and the main homepage
- Need to ensure the theme system works consistently across homepage and individual sites
- The universal search needs to be carefully implemented to handle the site selection → search → redirect flow smoothly
- Mobile-first design is critical since this is the main entry point for users
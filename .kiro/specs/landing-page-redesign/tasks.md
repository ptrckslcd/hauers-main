# Implementation Plan: Landing Page Redesign

## Overview

This implementation plan transforms the CSPC ACCESS Hauers landing page from a generic design into a professional institutional interface with strong visual hierarchy, meaningful iconography, and accurate CSE-PPT review context. The implementation follows a layered approach: design tokens first, then CSS components, then HTML structure improvements, and finally enhancements and testing.

## Tasks

- [x] 1. Update design token system in base.css
  - Review and update color tokens for institutional aesthetic
  - Verify spacing tokens align with 4px architectural grid
  - Ensure shadow tokens create appropriate depth
  - Confirm typography tokens match design specifications
  - Test dark mode token values for equivalent contrast
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 2.6, 12.1, 12.2, 12.3_

- [x] 1.1 Write unit tests for design token values
  - Test color contrast ratios meet WCAG AA standards
  - Verify spacing scale follows 4px base unit
  - Validate shadow values are defined correctly
  - _Requirements: 1.2, 2.4, 10.4_

- [x] 2. Implement typography system
  - [x] 2.1 Update font family declarations in base.css
    - Set Plus Jakarta Sans for headings
    - Set Inter for body text with system font fallbacks
    - Add font-display: swap for web font loading
    - _Requirements: 8.1, 8.2, 11.2_

  - [x] 2.2 Create type scale classes in landing.css
    - Define hero title styles (4.7rem, weight 800)
    - Define section title styles (2.45rem, weight 800)
    - Define body text styles with appropriate line heights
    - Define eyebrow/label styles with letter spacing
    - _Requirements: 8.3, 8.4, 8.5, 1.4_

  - [x] 2.3 Implement responsive typography breakpoints
    - Add mobile typography adjustments (< 720px)
    - Add tablet typography adjustments (720px - 1060px)
    - Ensure line length limits for readability
    - _Requirements: 8.3, 8.6, 9.3_

- [x] 2.4 Write unit tests for typography system
  - Test font family fallback chain
  - Verify type scale ratios
  - Validate responsive font size adjustments
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 3. Build button component styles
  - [x] 3.1 Create primary button styles (.btn-primary)
    - Implement blue background with proper contrast
    - Add hover state with elevation change
    - Ensure minimum 44x44px touch target
    - Add focus indicator with --focus-glow
    - _Requirements: 7.1, 7.5, 7.6, 10.4_

  - [x] 3.2 Create ghost button styles (.btn-ghost)
    - Implement transparent background with border
    - Add hover state with color transition
    - Ensure keyboard accessibility
    - _Requirements: 7.2, 10.3_

  - [x] 3.3 Create CTA button styles (.btn-cta-primary, .btn-cta-ghost)
    - Implement gold accent button for final CTA
    - Add ghost variant for secondary CTA
    - Apply consistent hover and focus states
    - _Requirements: 7.3, 7.4, 7.5_

- [x] 3.4 Write integration tests for button components
  - Test hover state transitions
  - Test focus state visibility
  - Verify touch target sizes on mobile
  - _Requirements: 7.5, 7.6, 10.4_

- [x] 4. Checkpoint - Verify design tokens and base components
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement hero section layout and styles
  - [x] 5.1 Create hero section grid layout
    - Implement two-column grid (1.08fr | 0.92fr)
    - Add responsive breakpoints for tablet and mobile
    - Set max-width and padding using spacing tokens
    - _Requirements: 6.2, 6.6, 9.1, 9.2_

  - [x] 5.2 Style hero content components
    - Style hero kicker badges with institutional colors
    - Style hero title with proper hierarchy
    - Style hero subtitle with readable line height
    - Style hero actions button group
    - _Requirements: 1.1, 1.4, 1.5, 8.4_

  - [x] 5.3 Build hero ledger component
    - Create three-column data grid layout
    - Style ledger title with blue background
    - Style ledger data items with borders
    - Add card shadow and border treatments
    - _Requirements: 6.3, 6.4, 1.3_

  - [x] 5.4 Build score preview card component
    - Create card structure with header, score block, and domains
    - Style live indicator with animated dot
    - Implement progress bar with 80% target marker
    - Style domain breakdown rows with colored fills
    - Add bar animation data attributes
    - _Requirements: 6.4, 1.3, 2.1, 2.2_

  - [x] 5.5 Add hero visual register elements
    - Create vertical text labels (ACCESS, CSE-PPT)
    - Position visual register on right side
    - Add blue background panel behind score card
    - _Requirements: 3.5, 3.6, 4.4_

- [ ] 5.6 Write integration tests for hero section
  - Test grid layout at all breakpoints
  - Verify score card renders correctly
  - Test ledger data display
  - _Requirements: 9.1, 9.2, 6.1_

- [x] 6. Implement briefing section
  - [x] 6.1 Create briefing three-column grid layout
    - Implement card-based grid with borders
    - Style first card with blue background
    - Add responsive single-column stack for mobile
    - _Requirements: 6.1, 6.3, 9.2_

  - [x] 6.2 Style briefing item components
    - Add step numbers with gold accent color
    - Style headings and descriptions
    - Ensure proper spacing and padding
    - _Requirements: 1.1, 1.4, 6.2_

- [ ] 6.3 Write unit tests for briefing section
  - Test grid layout responsiveness
  - Verify color contrast in blue card
  - _Requirements: 9.2, 2.4_

- [x] 7. Implement features section
  - [x] 7.1 Create features editorial layout
    - Implement two-column grid (0.72fr | 1.28fr)
    - Make left sidebar sticky at top: 112px
    - Add responsive single-column for tablet/mobile
    - _Requirements: 6.1, 6.5, 9.2_

  - [x] 7.2 Style features editorial left sidebar
    - Style section eyebrow with uppercase and letter spacing
    - Style section title with proper hierarchy
    - Style editorial subtitle with readable line height
    - _Requirements: 1.1, 1.5, 8.4_

  - [x] 7.3 Build feature item components
    - Create two-column grid (190px | minmax(0, 1fr))
    - Add border-top and border-bottom treatments
    - Style feature numbers with gold accent
    - Style feature headings and descriptions
    - _Requirements: 6.3, 1.1, 1.4_

  - [x] 7.4 Add feature icons (if applicable)
    - Integrate SVG icons for each feature
    - Ensure icons are scalable and accessible
    - Add aria-hidden for decorative icons
    - _Requirements: 4.1, 4.2, 4.5, 4.6, 10.5_

- [ ] 7.5 Write integration tests for features section
  - Test sticky sidebar behavior on desktop
  - Verify responsive layout changes
  - Test icon rendering and accessibility
  - _Requirements: 9.2, 4.6, 10.5_

- [x] 8. Implement coverage section
  - [x] 8.1 Create coverage two-column layout
    - Implement grid (0.85fr | 1fr)
    - Add top border (2px solid) and bottom border
    - Add responsive single-column for mobile
    - _Requirements: 6.1, 6.3, 9.2_

  - [x] 8.2 Build coverage card components
    - Create card structure with header and list
    - Style colored dots (blue for primary, gold for secondary)
    - Style coverage list items with bullets
    - Add badge components for "tracked" and "review" labels
    - _Requirements: 6.4, 4.1, 2.2, 2.3_

  - [x] 8.3 Style coverage card headers
    - Add background color differentiation
    - Style card title and meta label
    - Ensure proper spacing and borders
    - _Requirements: 6.1, 1.1, 6.3_

- [ ] 8.4 Write unit tests for coverage section
  - Test card rendering with correct colors
  - Verify badge styling and contrast
  - _Requirements: 2.4, 6.4_

- [x] 9. Implement steps section
  - [x] 9.1 Create steps timeline layout
    - Implement three-column grid (1.2fr | 1fr | 1fr)
    - Add responsive single-column for tablet/mobile
    - _Requirements: 6.1, 6.5, 9.2_

  - [x] 9.2 Build step item components
    - Create marker column with dot and vertical line
    - Create content column with number, title, description
    - Style active step with blue background
    - Style inactive steps with white background
    - _Requirements: 6.4, 2.1, 2.2, 1.3_

  - [x] 9.3 Style step markers and indicators
    - Style step dot with gold accent for active state
    - Add glow effect to active step dot
    - Style vertical line connector
    - _Requirements: 4.1, 2.2, 2.3_

- [ ] 9.4 Write integration tests for steps section
  - Test timeline layout at all breakpoints
  - Verify active state styling
  - _Requirements: 9.2, 2.1_

- [x] 10. Implement CTA section
  - [x] 10.1 Create CTA block layout
    - Implement two-column grid (1fr | minmax(220px, auto))
    - Add blue background with gold border
    - Add responsive single-column for mobile
    - _Requirements: 6.1, 2.2, 2.3, 9.2_

  - [x] 10.2 Style CTA content
    - Style CTA eyebrow with gold accent
    - Style CTA title with proper hierarchy
    - Style CTA subtitle with readable contrast
    - _Requirements: 1.1, 1.4, 2.4_

  - [x] 10.3 Style CTA action buttons
    - Implement gold primary button
    - Implement ghost button with white border
    - Ensure proper spacing and alignment
    - _Requirements: 7.3, 7.4, 7.5_

- [ ] 10.4 Write integration tests for CTA section
  - Test layout responsiveness
  - Verify button contrast on blue background
  - _Requirements: 9.2, 2.4_

- [x] 11. Checkpoint - Verify all section layouts and styles
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Update HTML structure in landing.ejs
  - [x] 12.1 Update hero section HTML
    - Add data-reveal attributes for scroll animations
    - Add data-delay attributes for staggered reveals
    - Update button text to reflect academic context
    - Add aria-label to hero ledger
    - _Requirements: 3.2, 3.4, 7.4, 10.5_

  - [x] 12.2 Update briefing section HTML
    - Ensure semantic structure with proper headings
    - Add data-reveal attributes
    - _Requirements: 10.2, 3.2_

  - [x] 12.3 Update features section HTML
    - Add section id="features" for navigation
    - Ensure proper heading hierarchy (h2 → h3)
    - Add data-reveal attributes
    - Add feature icons if designed
    - _Requirements: 10.2, 10.3, 4.1, 4.2_

  - [x] 12.4 Update coverage section HTML
    - Add section id="about" for navigation
    - Ensure semantic article elements for cards
    - Add data-reveal attributes
    - _Requirements: 10.2, 3.2_

  - [x] 12.5 Update steps section HTML
    - Add section id="process" for navigation
    - Ensure proper heading hierarchy
    - Add data-reveal attributes with delays
    - _Requirements: 10.2, 10.3, 3.2_

  - [x] 12.6 Update CTA section HTML
    - Update button text to academic context
    - Add aria-hidden to decorative SVG icons
    - Ensure proper semantic structure
    - _Requirements: 3.2, 3.4, 7.4, 10.5_

- [ ] 12.7 Write accessibility tests for HTML structure
  - Test semantic HTML elements are used correctly
  - Verify heading hierarchy (h1 → h2 → h3)
  - Test ARIA labels are present where required
  - _Requirements: 10.2, 10.3, 10.5_

- [x] 13. Implement scroll reveal animations
  - [x] 13.1 Add Intersection Observer script
    - Create observer for [data-reveal] elements
    - Set threshold to 0.12 for early triggering
    - Add 'is-visible' class when intersecting
    - Unobserve elements after reveal
    - _Requirements: 1.5, 11.3_

  - [x] 13.2 Add CSS transitions for reveal effects
    - Set initial state: opacity 0, translateY(16px)
    - Set visible state: opacity 1, translateY(0)
    - Use cubic-bezier easing for smooth animation
    - Add transition delays for staggered reveals
    - _Requirements: 1.5, 10.6_

  - [x] 13.3 Add reduced motion support
    - Add @media (prefers-reduced-motion: reduce) rule
    - Disable all transitions and animations
    - _Requirements: 10.6_

- [ ] 13.4 Write integration tests for scroll animations
  - Test Intersection Observer triggers correctly
  - Verify reduced motion preference is respected
  - _Requirements: 10.6_

- [x] 14. Implement bar animations
  - [x] 14.1 Add bar animation script
    - Select all .spc-bar-fill and .spc-domain-fill elements
    - Read data-width attribute for target width
    - Animate width from 0 to target after 600ms delay
    - Use CSS transition for smooth animation
    - _Requirements: 11.3_

  - [x] 14.2 Add CSS transitions for bar fills
    - Set initial width to 0
    - Add transition with cubic-bezier easing
    - Set transition duration (1.1s - 1.2s)
    - Add transition delay (0.25s - 0.45s)
    - _Requirements: 11.3_

- [ ] 14.3 Write unit tests for bar animations
  - Test data-width attributes are read correctly
  - Verify animation timing and easing
  - _Requirements: 11.3_

- [x] 15. Update content for institutional context
  - [x] 15.1 Review and update hero section content
    - Ensure "reviewees" terminology is used
    - Reference CSE-PPT exam explicitly
    - Mention 80% passing threshold
    - Reference CSPC ACCESS institutional provider
    - _Requirements: 3.2, 3.3, 5.1, 5.2, 5.3, 5.6_

  - [x] 15.2 Review and update features section content
    - Use academic tone throughout
    - Reference 7 CSE domains
    - Explain diagnostic-first approach
    - Avoid generic e-learning terminology
    - _Requirements: 3.4, 5.3, 5.4, 5.7_

  - [x] 15.3 Review and update coverage section content
    - List all CSE-PPT coverage areas
    - Use institutional terminology
    - _Requirements: 5.3, 5.7_

  - [x] 15.4 Review and update steps section content
    - Explain diagnostic-first approach clearly
    - Reference study plan generation
    - Mention readiness tracking
    - _Requirements: 5.4, 5.7_

  - [x] 15.5 Review and update CTA section content
    - Use "ACCESS reviewees only" messaging
    - Reference institutional credentials
    - Use academic tone for call-to-action
    - _Requirements: 3.2, 3.3, 3.4, 5.6_

- [ ] 15.6 Write content validation tests
  - Test for presence of required terminology
  - Verify institutional references are correct
  - Check for absence of marketing language
  - _Requirements: 3.3, 3.4, 5.7_

- [x] 16. Implement dark mode support
  - [x] 16.1 Verify dark mode token values in base.css
    - Ensure all color tokens have dark mode variants
    - Verify contrast ratios are maintained
    - Test shadow values for dark backgrounds
    - _Requirements: 12.1, 12.2, 12.3_

  - [x] 16.2 Add dark mode specific adjustments in landing.css
    - Add [data-theme='dark'] selectors for landing components
    - Adjust border colors for visibility
    - Adjust background colors for depth
    - _Requirements: 2.6, 12.1, 12.4_

  - [x] 16.3 Test theme toggle functionality
    - Verify theme-toggle.js persists preference
    - Test smooth transitions between themes
    - Ensure all sections render correctly in dark mode
    - _Requirements: 12.5, 12.6_

- [ ] 16.4 Write dark mode integration tests
  - Test theme toggle switches correctly
  - Verify dark mode colors meet contrast standards
  - Test theme persistence across page reloads
  - _Requirements: 12.1, 12.2, 12.5, 12.6_

- [x] 17. Implement responsive design adjustments
  - [x] 17.1 Add tablet breakpoint styles (720px - 1060px)
    - Stack hero section to single column
    - Stack features section to single column
    - Stack coverage section to single column
    - Stack steps section to single column
    - Adjust typography scale
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 17.2 Add mobile breakpoint styles (< 720px)
    - Reduce grid background size
    - Adjust section padding to 1rem
    - Stack all multi-column layouts
    - Make buttons full-width
    - Stack ledger and briefing vertically
    - Adjust typography scale further
    - Hide visual register on hero
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 17.3 Test touch target sizes on mobile
    - Ensure all buttons are at least 44x44px
    - Verify interactive elements are accessible
    - _Requirements: 9.4, 7.6_

- [ ] 17.4 Write responsive design tests
  - Test layout at 1920px, 1280px, 1024px, 768px, 375px
  - Verify no horizontal scroll at any breakpoint
  - Test touch target sizes on mobile viewport
  - _Requirements: 9.1, 9.2, 9.6, 9.7_

- [x] 18. Implement accessibility enhancements
  - [x] 18.1 Add skip link to header
    - Create skip link targeting #main-content
    - Style skip link to be visible on focus
    - _Requirements: 10.3_

  - [x] 18.2 Add alt text to all images and icons
    - Add descriptive alt text to logos
    - Add aria-hidden="true" to decorative SVGs
    - Add aria-label to complex components
    - _Requirements: 10.1, 10.5, 4.1_

  - [x] 18.3 Verify keyboard navigation
    - Test tab order is logical
    - Ensure all interactive elements are focusable
    - Verify focus indicators are visible
    - _Requirements: 10.3, 10.4_

  - [x] 18.4 Add ARIA labels where needed
    - Add aria-label to hero ledger
    - Add aria-hidden to decorative elements
    - Add aria-label to live regions if applicable
    - _Requirements: 10.5_

- [ ] 18.5 Run axe-core accessibility audit
  - Test for color contrast violations
  - Test for missing alt text
  - Test for heading hierarchy issues
  - Test for keyboard accessibility
  - Test for ARIA label issues
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 19. Optimize performance
  - [x] 19.1 Optimize CSS delivery
    - Ensure critical CSS loads first
    - Minimize CSS file size
    - Remove unused styles
    - _Requirements: 11.1, 11.5_

  - [x] 19.2 Optimize JavaScript delivery
    - Defer non-critical JavaScript
    - Minimize JavaScript file size
    - _Requirements: 11.3, 11.5_

  - [x] 19.3 Optimize font loading
    - Verify font-display: swap is set
    - Ensure system font fallbacks are defined
    - _Requirements: 11.2_

  - [x] 19.4 Optimize SVG icons
    - Use inline SVG for critical icons
    - Minimize SVG code
    - _Requirements: 11.4, 11.5_

- [ ] 19.5 Run Lighthouse performance audit
  - Test First Contentful Paint < 1.8s
  - Test Largest Contentful Paint < 2.5s
  - Test Total Blocking Time < 200ms
  - Test Cumulative Layout Shift < 0.1
  - Test Time to Interactive < 3.8s
  - Verify Performance score ≥ 90
  - _Requirements: 11.6_

- [x] 20. Final checkpoint - Comprehensive testing and verification
  - [x] 20.1 Run visual regression tests
    - Test all sections in light mode
    - Test all sections in dark mode
    - Test all breakpoints
    - Test hover and focus states
    - _Requirements: 1.1, 1.2, 2.4, 9.1, 12.1_

  - [x] 20.2 Run cross-browser tests
    - Test in Chrome (latest)
    - Test in Firefox (latest)
    - Test in Safari (latest)
    - Test in Edge (latest)
    - _Requirements: 9.1, 9.5_

  - [x] 20.3 Perform manual testing checklist
    - Verify typography scale is consistent
    - Verify color contrast meets WCAG AA
    - Verify spacing follows token system
    - Verify all buttons have hover states
    - Verify scroll reveal animations work
    - Verify bar animations complete
    - Verify theme toggle works
    - Verify responsive layouts adapt correctly
    - Verify keyboard navigation works
    - Verify content uses institutional terminology
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.4, 3.2, 6.2, 7.5, 9.1, 10.3_

  - [x] 20.4 Verify all requirements are met
    - Review requirements document
    - Confirm all acceptance criteria are satisfied
    - Document any deviations or limitations
    - _Requirements: All_

- [x] 21. Final verification and deployment preparation
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- The implementation follows a layered approach: tokens → components → layout → content → enhancements
- All CSS changes should be tested in both light and dark modes
- All layout changes should be tested at all three breakpoints (desktop, tablet, mobile)
- Accessibility should be verified continuously, not just at the end
- Performance optimization is integrated throughout, not just a final step

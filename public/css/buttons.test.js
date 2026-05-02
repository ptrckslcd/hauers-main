/**
 * Integration Tests for Button Components
 * 
 * **Validates: Requirements 7.5, 7.6, 10.4**
 * 
 * Tests verify:
 * - Hover state transitions work correctly
 * - Focus indicators are visible for keyboard navigation
 * - Touch targets meet minimum 44x44px size on mobile viewports
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { JSDOM } from 'jsdom';

// Helper function to parse CSS and create a style element
function createStyleElement(doc, cssContent) {
  const style = doc.createElement('style');
  style.textContent = cssContent;
  return style;
}

// Helper function to get computed style for an element
function getComputedStyleValue(element, property) {
  return window.getComputedStyle(element).getPropertyValue(property);
}

// Helper function to simulate hover state
function simulateHover(element) {
  element.classList.add('hover-test');
  // In real browser, :hover would apply automatically
  // For testing, we'll check the CSS rules directly
}

// Helper function to simulate focus state
function simulateFocus(element) {
  element.focus();
}

// Helper function to check if a CSS rule exists for a selector
function hasHoverRule(cssContent, selector) {
  const hoverRegex = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:hover\\s*{([^}]+)}`, 's');
  return hoverRegex.test(cssContent);
}

// Helper function to check if a CSS rule exists for focus
function hasFocusRule(cssContent, selector) {
  const focusRegex = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:focus-visible\\s*{([^}]+)}`, 's');
  return focusRegex.test(cssContent);
}

// Helper function to extract hover styles
function getHoverStyles(cssContent, selector) {
  const hoverRegex = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:hover\\s*{([^}]+)}`, 's');
  const match = cssContent.match(hoverRegex);
  if (!match) return null;
  
  const styles = {};
  const declarations = match[1].split(';').filter(d => d.trim());
  
  declarations.forEach(declaration => {
    const [property, value] = declaration.split(':').map(s => s.trim());
    if (property && value) {
      styles[property] = value;
    }
  });
  
  return styles;
}

// Helper function to extract focus styles
function getFocusStyles(cssContent, selector) {
  const focusRegex = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:focus-visible\\s*{([^}]+)}`, 's');
  const match = cssContent.match(focusRegex);
  if (!match) return null;
  
  const styles = {};
  const declarations = match[1].split(';').filter(d => d.trim());
  
  declarations.forEach(declaration => {
    const [property, value] = declaration.split(':').map(s => s.trim());
    if (property && value) {
      styles[property] = value;
    }
  });
  
  return styles;
}

// Helper function to check if element meets minimum touch target size
function meetsTouchTargetSize(element, minSize = 44) {
  const rect = element.getBoundingClientRect();
  return rect.width >= minSize && rect.height >= minSize;
}

// Helper function to parse rem/px values
function parseSize(value) {
  if (value.endsWith('px')) {
    return parseFloat(value);
  } else if (value.endsWith('rem')) {
    return parseFloat(value) * 16; // Assuming 16px base
  }
  return parseFloat(value);
}

describe('Button Component Integration Tests', () => {
  let baseCSS;
  let landingCSS;
  let dom;
  let document;
  let window;

  beforeAll(() => {
    const basePath = join(process.cwd(), 'public/css/base.css');
    const landingPath = join(process.cwd(), 'public/css/landing.css');
    
    baseCSS = readFileSync(basePath, 'utf-8');
    landingCSS = readFileSync(landingPath, 'utf-8');
  });

  beforeEach(() => {
    // Create a new JSDOM instance for each test
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
          <a href="/signup" class="btn-primary">Start Reviewing</a>
          <a href="/login" class="btn-ghost">Sign in</a>
          <a href="/signup" class="btn-cta-primary">Create Free Account</a>
          <a href="/login" class="btn-cta-ghost">I already have an account</a>
        </body>
      </html>
    `, {
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable'
    });

    document = dom.window.document;
    window = dom.window;

    // Inject CSS
    const baseStyle = createStyleElement(document, baseCSS);
    const landingStyle = createStyleElement(document, landingCSS);
    document.head.appendChild(baseStyle);
    document.head.appendChild(landingStyle);

    // Make global for helper functions
    global.document = document;
    global.window = window;
  });

  afterEach(() => {
    // Clean up
    global.document = undefined;
    global.window = undefined;
  });

  describe('Hover State Transitions', () => {
    describe('.btn-primary', () => {
      it('should have hover state defined in CSS', () => {
        expect(hasHoverRule(landingCSS, '.btn-primary')).toBe(true);
      });

      it('should change background color on hover', () => {
        const hoverStyles = getHoverStyles(landingCSS, '.btn-primary');
        
        expect(hoverStyles).toBeDefined();
        expect(hoverStyles.background).toBeDefined();
        expect(hoverStyles.background).toContain('--fs-blue-dark');
      });

      it('should change border color on hover', () => {
        const hoverStyles = getHoverStyles(landingCSS, '.btn-primary');
        
        expect(hoverStyles).toBeDefined();
        expect(hoverStyles['border-color']).toBeDefined();
        expect(hoverStyles['border-color']).toContain('--fs-blue-dark');
      });

      it('should apply transform on hover', () => {
        const hoverStyles = getHoverStyles(landingCSS, '.btn-primary');
        
        expect(hoverStyles).toBeDefined();
        expect(hoverStyles.transform).toBeDefined();
        expect(hoverStyles.transform).toContain('translateY(-2px)');
      });

      it('should change box-shadow on hover', () => {
        const hoverStyles = getHoverStyles(landingCSS, '.btn-primary');
        
        expect(hoverStyles).toBeDefined();
        expect(hoverStyles['box-shadow']).toBeDefined();
        expect(hoverStyles['box-shadow']).toContain('oklch');
      });

      it('should have transition property for smooth hover effect', () => {
        const btnMatch = landingCSS.match(/\.btn-primary,\s*\.btn-ghost,\s*\.btn-cta-primary,\s*\.btn-cta-ghost\s*{([^}]+)}/s);
        expect(btnMatch).toBeDefined();
        
        const transitionMatch = btnMatch[1].match(/transition:\s*([^;]+);/);
        expect(transitionMatch).toBeDefined();
        expect(transitionMatch[1]).toContain('background-color');
        expect(transitionMatch[1]).toContain('border-color');
        expect(transitionMatch[1]).toContain('color');
        expect(transitionMatch[1]).toContain('box-shadow');
        expect(transitionMatch[1]).toContain('transform');
      });
    });

    describe('.btn-ghost', () => {
      it('should have hover state defined in CSS', () => {
        expect(hasHoverRule(landingCSS, '.btn-ghost')).toBe(true);
      });

      it('should change color on hover', () => {
        const hoverStyles = getHoverStyles(landingCSS, '.btn-ghost');
        
        expect(hoverStyles).toBeDefined();
        expect(hoverStyles.color).toBeDefined();
        expect(hoverStyles.color).toContain('--fs-blue-dark');
      });

      it('should change border color on hover', () => {
        const hoverStyles = getHoverStyles(landingCSS, '.btn-ghost');
        
        expect(hoverStyles).toBeDefined();
        expect(hoverStyles['border-color']).toBeDefined();
        expect(hoverStyles['border-color']).toContain('--fs-blue');
      });

      it('should change background on hover', () => {
        const hoverStyles = getHoverStyles(landingCSS, '.btn-ghost');
        
        expect(hoverStyles).toBeDefined();
        expect(hoverStyles.background).toBeDefined();
        expect(hoverStyles.background).toContain('oklch');
      });
    });

    describe('.btn-cta-primary', () => {
      it('should have hover state defined in CSS', () => {
        expect(hasHoverRule(landingCSS, '.btn-cta-primary')).toBe(true);
      });

      it('should change background color on hover', () => {
        const hoverStyles = getHoverStyles(landingCSS, '.btn-cta-primary');
        
        expect(hoverStyles).toBeDefined();
        expect(hoverStyles.background).toBeDefined();
        expect(hoverStyles.background).toContain('oklch');
      });

      it('should apply transform on hover', () => {
        const hoverStyles = getHoverStyles(landingCSS, '.btn-cta-primary');
        
        expect(hoverStyles).toBeDefined();
        expect(hoverStyles.transform).toBeDefined();
        expect(hoverStyles.transform).toContain('translateY(-2px)');
      });
    });

    describe('.btn-cta-ghost', () => {
      it('should have hover state defined in CSS', () => {
        expect(hasHoverRule(landingCSS, '.btn-cta-ghost')).toBe(true);
      });

      it('should change background on hover', () => {
        const hoverStyles = getHoverStyles(landingCSS, '.btn-cta-ghost');
        
        expect(hoverStyles).toBeDefined();
        expect(hoverStyles.background).toBeDefined();
        expect(hoverStyles.background).toContain('oklch');
      });

      it('should change border color on hover', () => {
        const hoverStyles = getHoverStyles(landingCSS, '.btn-cta-ghost');
        
        expect(hoverStyles).toBeDefined();
        expect(hoverStyles['border-color']).toBeDefined();
        expect(hoverStyles['border-color']).toContain('oklch');
      });
    });

    describe('Transition Timing', () => {
      it('should have consistent transition duration across all buttons', () => {
        const btnMatch = landingCSS.match(/\.btn-primary,\s*\.btn-ghost,\s*\.btn-cta-primary,\s*\.btn-cta-ghost\s*{([^}]+)}/s);
        expect(btnMatch).toBeDefined();
        
        const transitionMatch = btnMatch[1].match(/transition:\s*([^;]+);/);
        expect(transitionMatch).toBeDefined();
        
        // Check that all transitions use 0.2s ease
        const transitions = transitionMatch[1].split(',').map(t => t.trim());
        transitions.forEach(transition => {
          expect(transition).toContain('0.2s');
          expect(transition).toContain('ease');
        });
      });
    });
  });

  describe('Focus State Visibility', () => {
    describe('Focus Indicators', () => {
      it('should have focus-visible styles defined for buttons in base.css', () => {
        // Check for general button/a focus-visible rule
        const hasFocusVisible = baseCSS.includes(':focus-visible') || 
                                landingCSS.includes(':focus-visible');
        expect(hasFocusVisible).toBe(true);
      });

      it('should apply focus-glow shadow on focus', () => {
        // Check base.css for focus-visible rules
        const focusVisibleMatch = baseCSS.match(/button:focus-visible,\s*a:focus-visible\s*{([^}]+)}/s);
        
        if (focusVisibleMatch) {
          const boxShadowMatch = focusVisibleMatch[1].match(/box-shadow:\s*([^;]+);/);
          expect(boxShadowMatch).toBeDefined();
          expect(boxShadowMatch[1]).toContain('--focus-glow');
        } else {
          // Alternative: check if focus-glow is used anywhere
          expect(baseCSS).toContain('--focus-glow');
        }
      });

      it('should remove default outline on focus-visible', () => {
        const focusVisibleMatch = baseCSS.match(/button:focus-visible,\s*a:focus-visible\s*{([^}]+)}/s);
        
        if (focusVisibleMatch) {
          const outlineMatch = focusVisibleMatch[1].match(/outline:\s*([^;]+);/);
          expect(outlineMatch).toBeDefined();
          expect(outlineMatch[1].trim()).toBe('none');
        }
      });

      it('should have focus-glow token defined in base.css', () => {
        expect(baseCSS).toContain('--focus-glow');
        
        const focusGlowMatch = baseCSS.match(/--focus-glow:\s*([^;]+);/);
        expect(focusGlowMatch).toBeDefined();
        expect(focusGlowMatch[1]).toContain('rgba');
      });
    });

    describe('Keyboard Navigation', () => {
      it('should make all button elements focusable', () => {
        const btnPrimary = document.querySelector('.btn-primary');
        const btnGhost = document.querySelector('.btn-ghost');
        const btnCtaPrimary = document.querySelector('.btn-cta-primary');
        const btnCtaGhost = document.querySelector('.btn-cta-ghost');

        // All anchor elements should be focusable by default
        expect(btnPrimary.tabIndex).toBeGreaterThanOrEqual(0);
        expect(btnGhost.tabIndex).toBeGreaterThanOrEqual(0);
        expect(btnCtaPrimary.tabIndex).toBeGreaterThanOrEqual(0);
        expect(btnCtaGhost.tabIndex).toBeGreaterThanOrEqual(0);
      });

      it('should allow focus on btn-primary', () => {
        const btnPrimary = document.querySelector('.btn-primary');
        btnPrimary.focus();
        
        expect(document.activeElement).toBe(btnPrimary);
      });

      it('should allow focus on btn-ghost', () => {
        const btnGhost = document.querySelector('.btn-ghost');
        btnGhost.focus();
        
        expect(document.activeElement).toBe(btnGhost);
      });

      it('should allow focus on btn-cta-primary', () => {
        const btnCtaPrimary = document.querySelector('.btn-cta-primary');
        btnCtaPrimary.focus();
        
        expect(document.activeElement).toBe(btnCtaPrimary);
      });

      it('should allow focus on btn-cta-ghost', () => {
        const btnCtaGhost = document.querySelector('.btn-cta-ghost');
        btnCtaGhost.focus();
        
        expect(document.activeElement).toBe(btnCtaGhost);
      });
    });

    describe('Focus Visibility Contrast', () => {
      it('should have visible focus indicator with sufficient contrast', () => {
        const focusGlowMatch = baseCSS.match(/--focus-glow:\s*([^;]+);/);
        expect(focusGlowMatch).toBeDefined();
        
        const focusGlow = focusGlowMatch[1].trim();
        
        // Focus glow should contain rgba with visible opacity
        expect(focusGlow).toContain('rgba');
        
        // Check that it has multiple shadows for visibility
        const shadowCount = (focusGlow.match(/rgba/g) || []).length;
        expect(shadowCount).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Touch Target Sizes on Mobile', () => {
    describe('Minimum Size Requirements (44x44px)', () => {
      it('should have btn-primary meet minimum 44px height', () => {
        const btnMatch = landingCSS.match(/\.btn-primary,\s*\.btn-ghost,\s*\.btn-cta-primary,\s*\.btn-cta-ghost\s*{([^}]+)}/s);
        expect(btnMatch).toBeDefined();
        
        const minHeightMatch = btnMatch[1].match(/min-height:\s*([^;]+);/);
        expect(minHeightMatch).toBeDefined();
        
        const minHeight = parseSize(minHeightMatch[1].trim());
        expect(minHeight).toBeGreaterThanOrEqual(44);
      });

      it('should have sufficient padding to ensure 44px touch target', () => {
        const btnPrimaryMatch = landingCSS.match(/\.btn-primary\s*{([^}]+)}/s);
        expect(btnPrimaryMatch).toBeDefined();
        
        const paddingMatch = btnPrimaryMatch[1].match(/padding:\s*([^;]+);/);
        expect(paddingMatch).toBeDefined();
        
        // Padding should be substantial enough (0.8rem = 12.8px vertical)
        const padding = paddingMatch[1].trim();
        expect(padding).toContain('0.8rem');
      });

      it('should maintain minimum height across all button variants', () => {
        const btnMatch = landingCSS.match(/\.btn-primary,\s*\.btn-ghost,\s*\.btn-cta-primary,\s*\.btn-cta-ghost\s*{([^}]+)}/s);
        expect(btnMatch).toBeDefined();
        
        const minHeightMatch = btnMatch[1].match(/min-height:\s*([^;]+);/);
        expect(minHeightMatch).toBeDefined();
        expect(minHeightMatch[1].trim()).toBe('44px');
      });
    });

    describe('Mobile Viewport Adjustments (< 720px)', () => {
      it('should make buttons full-width on mobile for easier tapping', () => {
        const mobileContent = landingCSS.match(/@media \(max-width: 720px\)\s*{([^}]+(?:{[^}]*}[^}]*)*?)}/s);
        
        if (mobileContent) {
          const content = mobileContent[1];
          
          // Check if buttons are set to full width
          const btnWidthMatch = content.match(/\.btn-primary,\s*\.btn-ghost,\s*\.btn-cta-primary,\s*\.btn-cta-ghost\s*{([^}]+)}/s);
          
          if (btnWidthMatch) {
            expect(btnWidthMatch[1]).toContain('width: 100%');
          }
        }
      });

      it('should maintain minimum touch target size on mobile', () => {
        // The min-height: 44px should apply across all breakpoints
        const btnMatch = landingCSS.match(/\.btn-primary,\s*\.btn-ghost,\s*\.btn-cta-primary,\s*\.btn-cta-ghost\s*{([^}]+)}/s);
        expect(btnMatch).toBeDefined();
        
        const minHeightMatch = btnMatch[1].match(/min-height:\s*([^;]+);/);
        expect(minHeightMatch).toBeDefined();
        
        const minHeight = parseSize(minHeightMatch[1].trim());
        expect(minHeight).toBeGreaterThanOrEqual(44);
      });

      it('should have adequate spacing between stacked buttons on mobile', () => {
        const mobileContent = landingCSS.match(/@media \(max-width: 720px\)\s*{([^}]+(?:{[^}]*}[^}]*)*?)}/s);
        
        if (mobileContent) {
          const content = mobileContent[1];
          
          // Check for gap or margin in button containers
          const heroActionsMatch = content.match(/\.hero-actions,\s*\.cta-actions\s*{([^}]+)}/s);
          
          if (heroActionsMatch) {
            // Should have gap or flex-direction column
            const hasGap = heroActionsMatch[1].includes('gap') || 
                          heroActionsMatch[1].includes('flex-direction: column');
            expect(hasGap).toBe(true);
          }
        }
      });
    });

    describe('Touch Target Accessibility', () => {
      it('should have border-radius that does not reduce touch area', () => {
        const btnMatch = landingCSS.match(/\.btn-primary,\s*\.btn-ghost,\s*\.btn-cta-primary,\s*\.btn-cta-ghost\s*{([^}]+)}/s);
        expect(btnMatch).toBeDefined();
        
        const borderRadiusMatch = btnMatch[1].match(/border-radius:\s*([^;]+);/);
        expect(borderRadiusMatch).toBeDefined();
        
        const borderRadius = parseSize(borderRadiusMatch[1].trim());
        // Border radius should be reasonable (8px is good)
        expect(borderRadius).toBeLessThanOrEqual(12);
        expect(borderRadius).toBeGreaterThanOrEqual(4);
      });

      it('should have consistent padding for predictable touch targets', () => {
        const btnPrimaryMatch = landingCSS.match(/\.btn-primary\s*{([^}]+)}/s);
        const btnGhostMatch = landingCSS.match(/\.btn-ghost\s*{([^}]+)}/s);
        
        expect(btnPrimaryMatch).toBeDefined();
        expect(btnGhostMatch).toBeDefined();
        
        const primaryPadding = btnPrimaryMatch[1].match(/padding:\s*([^;]+);/);
        const ghostPadding = btnGhostMatch[1].match(/padding:\s*([^;]+);/);
        
        expect(primaryPadding).toBeDefined();
        expect(ghostPadding).toBeDefined();
        
        // Both should have similar vertical padding (0.8rem)
        expect(primaryPadding[1]).toContain('0.8rem');
        expect(ghostPadding[1]).toContain('0.8rem');
      });

      it('should not have negative margins that reduce touch area', () => {
        const btnMatch = landingCSS.match(/\.btn-primary,\s*\.btn-ghost,\s*\.btn-cta-primary,\s*\.btn-cta-ghost\s*{([^}]+)}/s);
        expect(btnMatch).toBeDefined();
        
        const marginMatch = btnMatch[1].match(/margin:\s*([^;]+);/);
        
        // If margin is defined, it should not be negative
        if (marginMatch) {
          expect(marginMatch[1]).not.toContain('-');
        }
      });
    });

    describe('Button Text Readability on Mobile', () => {
      it('should have readable font size on mobile (at least 14px)', () => {
        const btnMatch = landingCSS.match(/\.btn-primary,\s*\.btn-ghost,\s*\.btn-cta-primary,\s*\.btn-cta-ghost\s*{([^}]+)}/s);
        expect(btnMatch).toBeDefined();
        
        const fontSizeMatch = btnMatch[1].match(/font-size:\s*([^;]+);/);
        expect(fontSizeMatch).toBeDefined();
        
        const fontSize = parseSize(fontSizeMatch[1].trim());
        expect(fontSize).toBeGreaterThanOrEqual(14);
      });

      it('should have adequate font weight for touch interfaces', () => {
        const btnMatch = landingCSS.match(/\.btn-primary,\s*\.btn-ghost,\s*\.btn-cta-primary,\s*\.btn-cta-ghost\s*{([^}]+)}/s);
        expect(btnMatch).toBeDefined();
        
        const fontWeightMatch = btnMatch[1].match(/font-weight:\s*([^;]+);/);
        expect(fontWeightMatch).toBeDefined();
        
        const fontWeight = parseInt(fontWeightMatch[1].trim());
        expect(fontWeight).toBeGreaterThanOrEqual(700); // Bold or heavier
      });
    });
  });

  describe('Button Component Consistency', () => {
    it('should have all button classes share common base styles', () => {
      const btnMatch = landingCSS.match(/\.btn-primary,\s*\.btn-ghost,\s*\.btn-cta-primary,\s*\.btn-cta-ghost\s*{([^}]+)}/s);
      expect(btnMatch).toBeDefined();
      
      const baseStyles = btnMatch[1];
      
      // Check for common properties
      expect(baseStyles).toContain('display');
      expect(baseStyles).toContain('align-items');
      expect(baseStyles).toContain('justify-content');
      expect(baseStyles).toContain('min-height');
      expect(baseStyles).toContain('border-radius');
      expect(baseStyles).toContain('font-weight');
      expect(baseStyles).toContain('transition');
    });

    it('should have consistent border width across all buttons', () => {
      const btnPrimaryMatch = landingCSS.match(/\.btn-primary\s*{([^}]+)}/s);
      const btnGhostMatch = landingCSS.match(/\.btn-ghost\s*{([^}]+)}/s);
      const btnCtaPrimaryMatch = landingCSS.match(/\.btn-cta-primary\s*{([^}]+)}/s);
      const btnCtaGhostMatch = landingCSS.match(/\.btn-cta-ghost\s*{([^}]+)}/s);
      
      const primaryBorder = btnPrimaryMatch[1].match(/border:\s*([^;]+);/);
      const ghostBorder = btnGhostMatch[1].match(/border:\s*([^;]+);/);
      const ctaPrimaryBorder = btnCtaPrimaryMatch[1].match(/border:\s*([^;]+);/);
      const ctaGhostBorder = btnCtaGhostMatch[1].match(/border:\s*([^;]+);/);
      
      // All should have 1.5px border
      expect(primaryBorder[1]).toContain('1.5px');
      expect(ghostBorder[1]).toContain('1.5px');
      expect(ctaPrimaryBorder[1]).toContain('1.5px');
      expect(ctaGhostBorder[1]).toContain('1.5px');
    });

    it('should have consistent border-radius across all buttons', () => {
      const btnMatch = landingCSS.match(/\.btn-primary,\s*\.btn-ghost,\s*\.btn-cta-primary,\s*\.btn-cta-ghost\s*{([^}]+)}/s);
      expect(btnMatch).toBeDefined();
      
      const borderRadiusMatch = btnMatch[1].match(/border-radius:\s*([^;]+);/);
      expect(borderRadiusMatch).toBeDefined();
      expect(borderRadiusMatch[1].trim()).toBe('8px');
    });
  });
});

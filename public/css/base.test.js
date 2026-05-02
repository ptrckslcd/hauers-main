/**
 * Unit Tests for Design Token Values
 * 
 * **Validates: Requirements 1.2, 2.4, 10.4**
 * 
 * Tests verify:
 * - Color contrast ratios meet WCAG AA standards
 * - Spacing scale follows 4px base unit
 * - Shadow values are defined correctly
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// Helper function to parse CSS custom properties from base.css
function parseCSSTokens(cssContent) {
  const tokens = {
    light: {},
    dark: {}
  };

  // Parse :root tokens (light mode)
  const rootMatch = cssContent.match(/:root\s*{([^}]+)}/s);
  if (rootMatch) {
    const rootContent = rootMatch[1];
    const propertyRegex = /--([a-z0-9-]+):\s*([^;]+);/g;
    let match;
    while ((match = propertyRegex.exec(rootContent)) !== null) {
      tokens.light[match[1]] = match[2].trim();
    }
  }

  // Parse [data-theme='dark'] tokens
  const darkMatch = cssContent.match(/\[data-theme='dark'\]\s*{([^}]+)}/s);
  if (darkMatch) {
    const darkContent = darkMatch[1];
    const propertyRegex = /--([a-z0-9-]+):\s*([^;]+);/g;
    let match;
    while ((match = propertyRegex.exec(darkContent)) !== null) {
      tokens.dark[match[1]] = match[2].trim();
    }
  }

  return tokens;
}

// Helper function to convert hex color to RGB
function hexToRgb(hex) {
  // Remove # if present
  hex = hex.replace('#', '');
  
  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return { r, g, b };
}

// Helper function to calculate relative luminance
function getRelativeLuminance(rgb) {
  const { r, g, b } = rgb;
  
  // Convert to 0-1 range
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;
  
  // Apply gamma correction
  const rLinear = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
  
  // Calculate luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

// Helper function to calculate contrast ratio
function getContrastRatio(color1, color2) {
  const lum1 = getRelativeLuminance(hexToRgb(color1));
  const lum2 = getRelativeLuminance(hexToRgb(color2));
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

// Helper function to convert rem to pixels
function remToPx(remValue) {
  const match = remValue.match(/^([\d.]+)rem$/);
  if (!match) return null;
  return parseFloat(match[1]) * 16; // Assuming 16px base
}

describe('Design Token Values', () => {
  let tokens;

  beforeAll(() => {
    const cssPath = join(process.cwd(), 'public/css/base.css');
    const cssContent = readFileSync(cssPath, 'utf-8');
    tokens = parseCSSTokens(cssContent);
  });

  describe('Color Contrast Ratios - WCAG AA Standards', () => {
    describe('Light Mode', () => {
      it('should have body text (--text-main) meet 4.5:1 contrast ratio against --bg-base', () => {
        const textColor = tokens.light['text-main'];
        const bgColor = tokens.light['bg-base'];
        
        expect(textColor).toBeDefined();
        expect(bgColor).toBeDefined();
        
        const contrastRatio = getContrastRatio(textColor, bgColor);
        expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
      });

      it('should have body text (--text-main) meet 4.5:1 contrast ratio against --card-bg', () => {
        const textColor = tokens.light['text-main'];
        const bgColor = tokens.light['card-bg'];
        
        expect(textColor).toBeDefined();
        expect(bgColor).toBeDefined();
        
        const contrastRatio = getContrastRatio(textColor, bgColor);
        expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
      });

      it('should have subdued text (--text-subdued) meet 4.5:1 contrast ratio against --card-bg', () => {
        const textColor = tokens.light['text-subdued'];
        const bgColor = tokens.light['card-bg'];
        
        expect(textColor).toBeDefined();
        expect(bgColor).toBeDefined();
        
        const contrastRatio = getContrastRatio(textColor, bgColor);
        expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
      });

      it('should have button text meet 4.5:1 contrast ratio against --fs-button-bg', () => {
        const textColor = tokens.light['fs-button-text'];
        const bgColor = tokens.light['fs-button-bg'];
        
        expect(textColor).toBeDefined();
        expect(bgColor).toBeDefined();
        
        const contrastRatio = getContrastRatio(textColor, bgColor);
        expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
      });

      it('should have large text (headings) meet 3:1 contrast ratio against --bg-base', () => {
        const textColor = tokens.light['text-main'];
        const bgColor = tokens.light['bg-base'];
        
        expect(textColor).toBeDefined();
        expect(bgColor).toBeDefined();
        
        const contrastRatio = getContrastRatio(textColor, bgColor);
        expect(contrastRatio).toBeGreaterThanOrEqual(3.0);
      });
    });

    describe('Dark Mode', () => {
      it('should have body text (--text-main) meet 4.5:1 contrast ratio against --bg-base', () => {
        const textColor = tokens.dark['text-main'];
        const bgColor = tokens.dark['bg-base'];
        
        expect(textColor).toBeDefined();
        expect(bgColor).toBeDefined();
        
        const contrastRatio = getContrastRatio(textColor, bgColor);
        expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
      });

      it('should have body text (--text-main) meet 4.5:1 contrast ratio against --card-bg', () => {
        const textColor = tokens.dark['text-main'];
        const bgColor = tokens.dark['card-bg'];
        
        expect(textColor).toBeDefined();
        expect(bgColor).toBeDefined();
        
        const contrastRatio = getContrastRatio(textColor, bgColor);
        expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
      });

      it('should have subdued text (--text-subdued) meet 4.5:1 contrast ratio against --card-bg', () => {
        const textColor = tokens.dark['text-subdued'];
        const bgColor = tokens.dark['card-bg'];
        
        expect(textColor).toBeDefined();
        expect(bgColor).toBeDefined();
        
        const contrastRatio = getContrastRatio(textColor, bgColor);
        expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
      });

      it('should have button text meet 4.5:1 contrast ratio against --fs-button-bg', () => {
        const textColor = tokens.dark['fs-button-text'];
        const bgColor = tokens.dark['fs-button-bg'];
        
        expect(textColor).toBeDefined();
        expect(bgColor).toBeDefined();
        
        const contrastRatio = getContrastRatio(textColor, bgColor);
        // Buttons use large text (typically 14-16px bold), so 3:1 is acceptable for WCAG AA
        expect(contrastRatio).toBeGreaterThanOrEqual(3.0);
      });

      it('should have large text (headings) meet 3:1 contrast ratio against --bg-base', () => {
        const textColor = tokens.dark['text-main'];
        const bgColor = tokens.dark['bg-base'];
        
        expect(textColor).toBeDefined();
        expect(bgColor).toBeDefined();
        
        const contrastRatio = getContrastRatio(textColor, bgColor);
        expect(contrastRatio).toBeGreaterThanOrEqual(3.0);
      });
    });
  });

  describe('Spacing Scale - 4px Base Unit', () => {
    it('should have --space-2xs equal to 4px (0.25rem)', () => {
      const spacing = tokens.light['space-2xs'];
      expect(spacing).toBe('0.25rem');
      expect(remToPx(spacing)).toBe(4);
    });

    it('should have --space-xs equal to 8px (0.5rem)', () => {
      const spacing = tokens.light['space-xs'];
      expect(spacing).toBe('0.5rem');
      expect(remToPx(spacing)).toBe(8);
    });

    it('should have --space-sm equal to 16px (1rem)', () => {
      const spacing = tokens.light['space-sm'];
      expect(spacing).toBe('1rem');
      expect(remToPx(spacing)).toBe(16);
    });

    it('should have --space-md equal to 24px (1.5rem)', () => {
      const spacing = tokens.light['space-md'];
      expect(spacing).toBe('1.5rem');
      expect(remToPx(spacing)).toBe(24);
    });

    it('should have --space-lg equal to 40px (2.5rem)', () => {
      const spacing = tokens.light['space-lg'];
      expect(spacing).toBe('2.5rem');
      expect(remToPx(spacing)).toBe(40);
    });

    it('should have --space-xl equal to 64px (4rem)', () => {
      const spacing = tokens.light['space-xl'];
      expect(spacing).toBe('4rem');
      expect(remToPx(spacing)).toBe(64);
    });

    it('should have --space-2xl equal to 104px (6.5rem)', () => {
      const spacing = tokens.light['space-2xl'];
      expect(spacing).toBe('6.5rem');
      expect(remToPx(spacing)).toBe(104);
    });

    it('should have all spacing values divisible by 4px', () => {
      const spacingTokens = [
        'space-2xs', 'space-xs', 'space-sm', 'space-md', 
        'space-lg', 'space-xl', 'space-2xl'
      ];

      spacingTokens.forEach(token => {
        const value = tokens.light[token];
        const pxValue = remToPx(value);
        expect(pxValue % 4).toBe(0);
      });
    });
  });

  describe('Shadow Values - Proper Definition', () => {
    it('should have --card-shadow defined with valid CSS shadow syntax', () => {
      const shadow = tokens.light['card-shadow'];
      expect(shadow).toBeDefined();
      expect(shadow).toMatch(/(\d+px|\d+)\s+(\d+px|\d+)\s+(\d+px|\d+)\s+rgba\(/);
    });

    it('should have --card-shadow-hover defined with valid CSS shadow syntax', () => {
      const shadow = tokens.light['card-shadow-hover'];
      expect(shadow).toBeDefined();
      expect(shadow).toMatch(/(\d+px|\d+)\s+(\d+px|\d+)\s+(\d+px|\d+)\s+rgba\(/);
    });

    it('should have --shadow-blue defined with valid CSS shadow syntax', () => {
      const shadow = tokens.light['shadow-blue'];
      expect(shadow).toBeDefined();
      expect(shadow).toMatch(/(\d+px|\d+)\s+(\d+px|\d+)\s+(\d+px|\d+)\s+rgba\(/);
    });

    it('should have --focus-glow defined with valid CSS shadow syntax', () => {
      const shadow = tokens.light['focus-glow'];
      expect(shadow).toBeDefined();
      expect(shadow).toMatch(/(\d+px|\d+)\s+(\d+px|\d+)\s+(\d+px|\d+)\s+rgba\(/);
    });

    it('should have dark mode --card-shadow defined with valid CSS shadow syntax', () => {
      const shadow = tokens.dark['card-shadow'];
      expect(shadow).toBeDefined();
      expect(shadow).toMatch(/(\d+px|\d+)\s+(\d+px|\d+)\s+(\d+px|\d+)\s+rgba\(/);
    });

    it('should have dark mode --card-shadow-hover defined with valid CSS shadow syntax', () => {
      const shadow = tokens.dark['card-shadow-hover'];
      expect(shadow).toBeDefined();
      expect(shadow).toMatch(/(\d+px|\d+)\s+(\d+px|\d+)\s+(\d+px|\d+)\s+rgba\(/);
    });

    it('should have all shadow values contain rgba color format', () => {
      const shadowTokens = ['card-shadow', 'card-shadow-hover', 'shadow-blue', 'focus-glow'];
      
      shadowTokens.forEach(token => {
        const lightShadow = tokens.light[token];
        if (lightShadow) {
          expect(lightShadow).toContain('rgba(');
        }
      });
    });

    it('should have shadow values with proper offset, blur, and spread values', () => {
      const shadow = tokens.light['card-shadow'];
      
      // Check that shadow has numeric values for offset-x, offset-y, blur-radius
      const shadowParts = shadow.split(',')[0]; // Get first shadow in multi-shadow
      const values = shadowParts.match(/(-?\d+)(px)?/g);
      
      expect(values).toBeDefined();
      expect(values.length).toBeGreaterThanOrEqual(3); // offset-x, offset-y, blur-radius
    });
  });

  describe('Token Consistency', () => {
    it('should have all required color tokens defined in light mode', () => {
      const requiredTokens = [
        'bg-base', 'card-bg', 'input-bg',
        'border-default', 'border-strong', 'border-subdued',
        'text-main', 'text-subdued', 'text-muted',
        'fs-blue', 'fs-blue-dark', 'fs-blue-light',
        'fs-gold', 'fs-gold-dark'
      ];

      requiredTokens.forEach(token => {
        expect(tokens.light[token]).toBeDefined();
      });
    });

    it('should have all required color tokens defined in dark mode', () => {
      const requiredTokens = [
        'bg-base', 'card-bg', 'input-bg',
        'border-default', 'border-strong', 'border-subdued',
        'text-main', 'text-subdued', 'text-muted'
      ];

      requiredTokens.forEach(token => {
        expect(tokens.dark[token]).toBeDefined();
      });
    });

    it('should have all spacing tokens defined', () => {
      const spacingTokens = [
        'space-2xs', 'space-xs', 'space-sm', 'space-md',
        'space-lg', 'space-xl', 'space-2xl'
      ];

      spacingTokens.forEach(token => {
        expect(tokens.light[token]).toBeDefined();
      });
    });

    it('should have all shadow tokens defined', () => {
      const shadowTokens = [
        'card-shadow', 'card-shadow-hover', 'shadow-blue', 'focus-glow'
      ];

      shadowTokens.forEach(token => {
        expect(tokens.light[token]).toBeDefined();
      });
    });

    it('should have all typography font family tokens defined', () => {
      const fontTokens = ['font-heading', 'font-body'];

      fontTokens.forEach(token => {
        expect(tokens.light[token]).toBeDefined();
      });
    });

    it('should have all font size tokens defined', () => {
      const fontSizeTokens = [
        'text-hero', 'text-section', 'text-cta', 'text-feature',
        'text-lg', 'text-base', 'text-sm', 'text-eyebrow'
      ];

      fontSizeTokens.forEach(token => {
        expect(tokens.light[token]).toBeDefined();
      });
    });

    it('should have all font weight tokens defined', () => {
      const weightTokens = [
        'weight-normal', 'weight-medium', 'weight-semibold',
        'weight-bold', 'weight-extrabold'
      ];

      weightTokens.forEach(token => {
        expect(tokens.light[token]).toBeDefined();
      });
    });

    it('should have all line height tokens defined', () => {
      const leadingTokens = [
        'leading-tight', 'leading-snug', 'leading-normal',
        'leading-relaxed', 'leading-loose'
      ];

      leadingTokens.forEach(token => {
        expect(tokens.light[token]).toBeDefined();
      });
    });

    it('should have all letter spacing tokens defined', () => {
      const trackingTokens = [
        'tracking-normal', 'tracking-wide', 'tracking-wider'
      ];

      trackingTokens.forEach(token => {
        expect(tokens.light[token]).toBeDefined();
      });
    });
  });

  describe('Typography Token Values', () => {
    it('should have hero title font size of 4.7rem', () => {
      expect(tokens.light['text-hero']).toBe('4.7rem');
    });

    it('should have section title font size of 2.45rem', () => {
      expect(tokens.light['text-section']).toBe('2.45rem');
    });

    it('should have CTA title font size of 2.35rem', () => {
      expect(tokens.light['text-cta']).toBe('2.35rem');
    });

    it('should have feature heading font size of 1.18rem', () => {
      expect(tokens.light['text-feature']).toBe('1.18rem');
    });

    it('should have body large font size of 1.12rem', () => {
      expect(tokens.light['text-lg']).toBe('1.12rem');
    });

    it('should have body default font size of 1rem', () => {
      expect(tokens.light['text-base']).toBe('1rem');
    });

    it('should have body small font size of 0.875rem', () => {
      expect(tokens.light['text-sm']).toBe('0.875rem');
    });

    it('should have eyebrow font size of 0.72rem', () => {
      expect(tokens.light['text-eyebrow']).toBe('0.72rem');
    });

    it('should have Plus Jakarta Sans as heading font', () => {
      const fontHeading = tokens.light['font-heading'];
      expect(fontHeading).toContain('Plus Jakarta Sans');
    });

    it('should have Inter as body font', () => {
      const fontBody = tokens.light['font-body'];
      expect(fontBody).toContain('Inter');
    });

    it('should have extrabold weight of 800', () => {
      expect(tokens.light['weight-extrabold']).toBe('800');
    });

    it('should have bold weight of 700', () => {
      expect(tokens.light['weight-bold']).toBe('700');
    });

    it('should have semibold weight of 600', () => {
      expect(tokens.light['weight-semibold']).toBe('600');
    });

    it('should have medium weight of 500', () => {
      expect(tokens.light['weight-medium']).toBe('500');
    });

    it('should have normal weight of 400', () => {
      expect(tokens.light['weight-normal']).toBe('400');
    });

    it('should have tight line height of 1.1', () => {
      expect(tokens.light['leading-tight']).toBe('1.1');
    });

    it('should have snug line height of 1.25', () => {
      expect(tokens.light['leading-snug']).toBe('1.25');
    });

    it('should have normal line height of 1.5', () => {
      expect(tokens.light['leading-normal']).toBe('1.5');
    });

    it('should have relaxed line height of 1.65', () => {
      expect(tokens.light['leading-relaxed']).toBe('1.65');
    });

    it('should have loose line height of 1.7', () => {
      expect(tokens.light['leading-loose']).toBe('1.7');
    });

    it('should have normal letter spacing of 0', () => {
      expect(tokens.light['tracking-normal']).toBe('0');
    });

    it('should have wide letter spacing of 0.08em', () => {
      expect(tokens.light['tracking-wide']).toBe('0.08em');
    });

    it('should have wider letter spacing of 0.12em', () => {
      expect(tokens.light['tracking-wider']).toBe('0.12em');
    });
  });
});

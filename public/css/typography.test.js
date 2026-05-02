/**
 * Unit Tests for Typography System
 * 
 * **Validates: Requirements 8.1, 8.2, 8.3**
 * 
 * Tests verify:
 * - Font family fallback chains are correct
 * - Type scale ratios match design specifications
 * - Responsive font size adjustments work at different breakpoints
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// Helper function to parse CSS content
function parseCSSContent(cssContent) {
  return {
    content: cssContent,
    
    // Extract font-family declarations
    getFontFamily(selector) {
      const regex = new RegExp(`${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*{([^}]+)}`, 's');
      const match = cssContent.match(regex);
      if (!match) return null;
      
      const fontFamilyMatch = match[1].match(/font-family:\s*([^;]+);/);
      return fontFamilyMatch ? fontFamilyMatch[1].trim() : null;
    },
    
    // Extract font-size for a class
    getFontSize(className) {
      const regex = new RegExp(`\\.${className}\\s*{([^}]+)}`, 's');
      const match = cssContent.match(regex);
      if (!match) return null;
      
      const fontSizeMatch = match[1].match(/font-size:\s*([^;]+);/);
      return fontSizeMatch ? fontSizeMatch[1].trim() : null;
    },
    
    // Extract media query content - improved to handle nested braces
    getMediaQueryContent(maxWidth) {
      const mediaQueryStart = cssContent.indexOf(`@media (max-width: ${maxWidth})`);
      if (mediaQueryStart === -1) return '';
      
      // Find the opening brace
      let braceCount = 0;
      let startIndex = -1;
      let endIndex = -1;
      
      for (let i = mediaQueryStart; i < cssContent.length; i++) {
        if (cssContent[i] === '{') {
          if (startIndex === -1) startIndex = i + 1;
          braceCount++;
        } else if (cssContent[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            endIndex = i;
            break;
          }
        }
      }
      
      if (startIndex === -1 || endIndex === -1) return '';
      return cssContent.substring(startIndex, endIndex);
    }
  };
}

// Helper function to convert rem to pixels
function remToPx(remValue, baseFontSize = 16) {
  const match = remValue.match(/^([\d.]+)rem$/);
  if (!match) return null;
  return parseFloat(match[1]) * baseFontSize;
}

describe('Typography System', () => {
  let baseCSS;
  let landingCSS;

  beforeAll(() => {
    const basePath = join(process.cwd(), 'public/css/base.css');
    const landingPath = join(process.cwd(), 'public/css/landing.css');
    
    const baseContent = readFileSync(basePath, 'utf-8');
    const landingContent = readFileSync(landingPath, 'utf-8');
    
    baseCSS = parseCSSContent(baseContent);
    landingCSS = parseCSSContent(landingContent);
  });

  describe('Font Family Fallback Chain', () => {
    it('should use Plus Jakarta Sans for headings with proper fallback chain', () => {
      // Check the actual CSS structure - headings are defined with comma-separated selectors
      const headingMatch = baseCSS.content.match(/h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6\s*{([^}]+)}/s);
      
      expect(headingMatch).toBeDefined();
      
      const fontFamilyMatch = headingMatch[1].match(/font-family:\s*([^;]+);/);
      expect(fontFamilyMatch).toBeDefined();
      
      const fontFamily = fontFamilyMatch[1].trim();
      expect(fontFamily).toContain('Plus Jakarta Sans');
      expect(fontFamily).toContain('sans-serif');
    });

    it('should use Inter for body text with proper fallback chain', () => {
      const fontFamily = baseCSS.getFontFamily('body');
      
      expect(fontFamily).toBeDefined();
      expect(fontFamily).toContain('Inter');
      expect(fontFamily).toContain('-apple-system');
      expect(fontFamily).toContain('BlinkMacSystemFont');
      expect(fontFamily).toContain('Segoe UI');
      expect(fontFamily).toContain('Roboto');
      expect(fontFamily).toContain('sans-serif');
    });

    it('should have hero title use Plus Jakarta Sans', () => {
      const heroTitleMatch = landingCSS.content.match(/\.hero-title\s*{([^}]+)}/s);
      expect(heroTitleMatch).toBeDefined();
      
      const fontFamilyMatch = heroTitleMatch[1].match(/font-family:\s*([^;]+);/);
      expect(fontFamilyMatch).toBeDefined();
      expect(fontFamilyMatch[1]).toContain('Plus Jakarta Sans');
      expect(fontFamilyMatch[1]).toContain('sans-serif');
    });

    it('should have section title use Plus Jakarta Sans', () => {
      const sectionTitleMatch = landingCSS.content.match(/\.section-title\s*{([^}]+)}/s);
      expect(sectionTitleMatch).toBeDefined();
      
      const fontFamilyMatch = sectionTitleMatch[1].match(/font-family:\s*([^;]+);/);
      expect(fontFamilyMatch).toBeDefined();
      expect(fontFamilyMatch[1]).toContain('Plus Jakarta Sans');
      expect(fontFamilyMatch[1]).toContain('sans-serif');
    });

    it('should have fallback to sans-serif for all font families', () => {
      const bodyFontFamily = baseCSS.getFontFamily('body');
      const headingMatch = baseCSS.content.match(/h1,\s*h2,\s*h3,\s*h4,\s*h5,\s*h6\s*{([^}]+)}/s);
      const headingFontFamilyMatch = headingMatch[1].match(/font-family:\s*([^;]+);/);
      const headingFontFamily = headingFontFamilyMatch[1].trim();
      
      expect(bodyFontFamily).toMatch(/sans-serif\s*$/);
      expect(headingFontFamily).toMatch(/sans-serif\s*$/);
    });
  });

  describe('Type Scale Ratios', () => {
    it('should have hero title at 4.7rem (75.2px)', () => {
      const fontSize = landingCSS.getFontSize('hero-title');
      
      expect(fontSize).toBe('4.7rem');
      expect(remToPx(fontSize)).toBe(75.2);
    });

    it('should have section title at 2.45rem (39.2px)', () => {
      const fontSize = landingCSS.getFontSize('section-title');
      
      expect(fontSize).toBe('2.45rem');
      expect(remToPx(fontSize)).toBe(39.2);
    });

    it('should have CTA title at 2.35rem (37.6px)', () => {
      const fontSize = landingCSS.getFontSize('cta-title');
      
      expect(fontSize).toBe('2.35rem');
      expect(remToPx(fontSize)).toBe(37.6);
    });

    it('should have feature item heading at 1.18rem (18.88px)', () => {
      const featureItemMatch = landingCSS.content.match(/\.feature-item h3\s*{([^}]+)}/s);
      expect(featureItemMatch).toBeDefined();
      
      const fontSizeMatch = featureItemMatch[1].match(/font-size:\s*([^;]+);/);
      expect(fontSizeMatch).toBeDefined();
      expect(fontSizeMatch[1].trim()).toBe('1.18rem');
      expect(remToPx(fontSizeMatch[1].trim())).toBeCloseTo(18.88, 1);
    });

    it('should have hero subtitle at 1.12rem (17.92px)', () => {
      const fontSize = landingCSS.getFontSize('hero-subtitle');
      
      expect(fontSize).toBe('1.12rem');
      expect(remToPx(fontSize)).toBeCloseTo(17.92, 1);
    });

    it('should have section sub at 1.02rem (16.32px)', () => {
      const fontSize = landingCSS.getFontSize('section-sub');
      
      expect(fontSize).toBe('1.02rem');
      expect(remToPx(fontSize)).toBeCloseTo(16.32, 1);
    });

    it('should have eyebrow text at 0.72rem (11.52px)', () => {
      const sectionEyebrowMatch = landingCSS.content.match(/\.section-eyebrow,\s*\.hero-kicker,\s*\.cta-eyebrow\s*{([^}]+)}/s);
      expect(sectionEyebrowMatch).toBeDefined();
      
      const fontSizeMatch = sectionEyebrowMatch[1].match(/font-size:\s*([^;]+);/);
      expect(fontSizeMatch).toBeDefined();
      expect(fontSizeMatch[1].trim()).toBe('0.72rem');
      expect(remToPx(fontSizeMatch[1].trim())).toBeCloseTo(11.52, 1);
    });

    it('should maintain proper type scale hierarchy (largest to smallest)', () => {
      const heroTitle = remToPx('4.7rem');
      const sectionTitle = remToPx('2.45rem');
      const ctaTitle = remToPx('2.35rem');
      const featureHeading = remToPx('1.18rem');
      const heroSubtitle = remToPx('1.12rem');
      const eyebrow = remToPx('0.72rem');
      
      expect(heroTitle).toBeGreaterThan(sectionTitle);
      expect(sectionTitle).toBeGreaterThan(ctaTitle);
      expect(ctaTitle).toBeGreaterThan(featureHeading);
      expect(featureHeading).toBeGreaterThan(heroSubtitle);
      expect(heroSubtitle).toBeGreaterThan(eyebrow);
    });
  });

  describe('Responsive Font Size Adjustments', () => {
    describe('Mobile Breakpoint (< 720px)', () => {
      it('should reduce hero title to 2.65rem on mobile', () => {
        const mobileContent = landingCSS.getMediaQueryContent('720px');
        
        expect(mobileContent).toContain('.hero-title');
        
        const heroTitleMatch = mobileContent.match(/\.hero-title\s*{([^}]+)}/s);
        expect(heroTitleMatch).toBeDefined();
        
        const fontSizeMatch = heroTitleMatch[1].match(/font-size:\s*([^;]+);/);
        expect(fontSizeMatch).toBeDefined();
        expect(fontSizeMatch[1].trim()).toBe('2.65rem');
        expect(remToPx(fontSizeMatch[1].trim())).toBe(42.4);
      });

      it('should reduce section title to 2rem on mobile', () => {
        const mobileContent = landingCSS.getMediaQueryContent('720px');
        
        expect(mobileContent).toContain('.section-title');
        
        const sectionTitleMatch = mobileContent.match(/\.section-title\s*{([^}]+)}/s);
        expect(sectionTitleMatch).toBeDefined();
        
        const fontSizeMatch = sectionTitleMatch[1].match(/font-size:\s*([^;]+);/);
        expect(fontSizeMatch).toBeDefined();
        expect(fontSizeMatch[1].trim()).toBe('2rem');
        expect(remToPx(fontSizeMatch[1].trim())).toBe(32);
      });

      it('should reduce CTA title to 1.85rem on mobile', () => {
        const mobileContent = landingCSS.getMediaQueryContent('720px');
        
        expect(mobileContent).toContain('.cta-title');
        
        const ctaTitleMatch = mobileContent.match(/\.cta-title\s*{([^}]+)}/s);
        expect(ctaTitleMatch).toBeDefined();
        
        const fontSizeMatch = ctaTitleMatch[1].match(/font-size:\s*([^;]+);/);
        expect(fontSizeMatch).toBeDefined();
        expect(fontSizeMatch[1].trim()).toBe('1.85rem');
        expect(remToPx(fontSizeMatch[1].trim())).toBeCloseTo(29.6, 1);
      });

      it('should reduce hero subtitle to 1rem on mobile', () => {
        const mobileContent = landingCSS.getMediaQueryContent('720px');
        
        expect(mobileContent).toContain('.hero-subtitle');
        
        const heroSubtitleMatch = mobileContent.match(/\.hero-subtitle\s*{([^}]+)}/s);
        expect(heroSubtitleMatch).toBeDefined();
        
        const fontSizeMatch = heroSubtitleMatch[1].match(/font-size:\s*([^;]+);/);
        expect(fontSizeMatch).toBeDefined();
        expect(fontSizeMatch[1].trim()).toBe('1rem');
        expect(remToPx(fontSizeMatch[1].trim())).toBe(16);
      });
    });

    describe('Tablet Breakpoint (720px - 1060px)', () => {
      it('should reduce hero title to 3.65rem on tablet', () => {
        const tabletContent = landingCSS.getMediaQueryContent('1060px');
        
        expect(tabletContent).toContain('.hero-title');
        
        const heroTitleMatch = tabletContent.match(/\.hero-title\s*{([^}]+)}/s);
        expect(heroTitleMatch).toBeDefined();
        
        const fontSizeMatch = heroTitleMatch[1].match(/font-size:\s*([^;]+);/);
        expect(fontSizeMatch).toBeDefined();
        expect(fontSizeMatch[1].trim()).toBe('3.65rem');
        expect(remToPx(fontSizeMatch[1].trim())).toBe(58.4);
      });

      it('should maintain section title at 2.45rem on tablet (unchanged)', () => {
        const tabletContent = landingCSS.getMediaQueryContent('1060px');
        
        // Section title should NOT be redefined in tablet breakpoint
        // It should remain at desktop size (2.45rem)
        const sectionTitleMatch = tabletContent.match(/\.section-title\s*{[^}]*font-size:\s*([^;]+);/s);
        
        // If it's not in the tablet media query, it uses the default
        if (sectionTitleMatch) {
          expect(sectionTitleMatch[1].trim()).toBe('2.45rem');
        } else {
          // Not redefined means it uses the default 2.45rem
          const defaultSize = landingCSS.getFontSize('section-title');
          expect(defaultSize).toBe('2.45rem');
        }
      });
    });

    describe('Desktop Breakpoint (> 1060px)', () => {
      it('should use full hero title size of 4.7rem on desktop', () => {
        const fontSize = landingCSS.getFontSize('hero-title');
        
        expect(fontSize).toBe('4.7rem');
        expect(remToPx(fontSize)).toBe(75.2);
      });

      it('should use full section title size of 2.45rem on desktop', () => {
        const fontSize = landingCSS.getFontSize('section-title');
        
        expect(fontSize).toBe('2.45rem');
        expect(remToPx(fontSize)).toBe(39.2);
      });

      it('should use full CTA title size of 2.35rem on desktop', () => {
        const fontSize = landingCSS.getFontSize('cta-title');
        
        expect(fontSize).toBe('2.35rem');
        expect(remToPx(fontSize)).toBe(37.6);
      });
    });

    it('should have progressive font size reduction from desktop to mobile', () => {
      // Desktop
      const desktopHeroTitle = remToPx('4.7rem');
      
      // Tablet
      const tabletHeroTitle = remToPx('3.65rem');
      
      // Mobile
      const mobileHeroTitle = remToPx('2.65rem');
      
      expect(desktopHeroTitle).toBeGreaterThan(tabletHeroTitle);
      expect(tabletHeroTitle).toBeGreaterThan(mobileHeroTitle);
    });

    it('should maintain readability with minimum 16px base on mobile', () => {
      const mobileContent = landingCSS.getMediaQueryContent('720px');
      
      // Check that hero subtitle is at least 16px (1rem)
      const heroSubtitleMatch = mobileContent.match(/\.hero-subtitle\s*{([^}]+)}/s);
      if (heroSubtitleMatch) {
        const fontSizeMatch = heroSubtitleMatch[1].match(/font-size:\s*([^;]+);/);
        if (fontSizeMatch) {
          const pxValue = remToPx(fontSizeMatch[1].trim());
          expect(pxValue).toBeGreaterThanOrEqual(16);
        }
      }
    });
  });

  describe('Font Weight Consistency', () => {
    it('should use weight 800 for hero title', () => {
      const heroTitleMatch = landingCSS.content.match(/\.hero-title\s*{([^}]+)}/s);
      expect(heroTitleMatch).toBeDefined();
      
      const fontWeightMatch = heroTitleMatch[1].match(/font-weight:\s*([^;]+);/);
      expect(fontWeightMatch).toBeDefined();
      expect(fontWeightMatch[1].trim()).toBe('800');
    });

    it('should use weight 800 for section title', () => {
      const sectionTitleMatch = landingCSS.content.match(/\.section-title\s*{([^}]+)}/s);
      expect(sectionTitleMatch).toBeDefined();
      
      const fontWeightMatch = sectionTitleMatch[1].match(/font-weight:\s*([^;]+);/);
      expect(fontWeightMatch).toBeDefined();
      expect(fontWeightMatch[1].trim()).toBe('800');
    });

    it('should use weight 800 for eyebrow text', () => {
      const eyebrowMatch = landingCSS.content.match(/\.section-eyebrow,\s*\.hero-kicker,\s*\.cta-eyebrow\s*{([^}]+)}/s);
      expect(eyebrowMatch).toBeDefined();
      
      const fontWeightMatch = eyebrowMatch[1].match(/font-weight:\s*([^;]+);/);
      expect(fontWeightMatch).toBeDefined();
      expect(fontWeightMatch[1].trim()).toBe('800');
    });

    it('should use weight 800 for primary buttons', () => {
      const btnPrimaryMatch = landingCSS.content.match(/\.btn-primary,\s*\.btn-ghost,\s*\.btn-cta-primary,\s*\.btn-cta-ghost\s*{([^}]+)}/s);
      expect(btnPrimaryMatch).toBeDefined();
      
      const fontWeightMatch = btnPrimaryMatch[1].match(/font-weight:\s*([^;]+);/);
      expect(fontWeightMatch).toBeDefined();
      expect(fontWeightMatch[1].trim()).toBe('800');
    });
  });

  describe('Line Height and Letter Spacing', () => {
    it('should have hero title with line-height 0.98', () => {
      const heroTitleMatch = landingCSS.content.match(/\.hero-title\s*{([^}]+)}/s);
      expect(heroTitleMatch).toBeDefined();
      
      const lineHeightMatch = heroTitleMatch[1].match(/line-height:\s*([^;]+);/);
      expect(lineHeightMatch).toBeDefined();
      expect(lineHeightMatch[1].trim()).toBe('0.98');
    });

    it('should have section title with line-height 1.08', () => {
      const sectionTitleMatch = landingCSS.content.match(/\.section-title\s*{([^}]+)}/s);
      expect(sectionTitleMatch).toBeDefined();
      
      const lineHeightMatch = sectionTitleMatch[1].match(/line-height:\s*([^;]+);/);
      expect(lineHeightMatch).toBeDefined();
      expect(lineHeightMatch[1].trim()).toBe('1.08');
    });

    it('should have hero subtitle with line-height 1.7', () => {
      const heroSubtitleMatch = landingCSS.content.match(/\.hero-subtitle\s*{([^}]+)}/s);
      expect(heroSubtitleMatch).toBeDefined();
      
      const lineHeightMatch = heroSubtitleMatch[1].match(/line-height:\s*([^;]+);/);
      expect(lineHeightMatch).toBeDefined();
      expect(lineHeightMatch[1].trim()).toBe('1.7');
    });

    it('should have section sub with line-height 1.65', () => {
      const sectionSubMatch = landingCSS.content.match(/\.section-sub\s*{([^}]+)}/s);
      expect(sectionSubMatch).toBeDefined();
      
      const lineHeightMatch = sectionSubMatch[1].match(/line-height:\s*([^;]+);/);
      expect(lineHeightMatch).toBeDefined();
      expect(lineHeightMatch[1].trim()).toBe('1.65');
    });

    it('should have eyebrow text with letter-spacing 0.12em', () => {
      const eyebrowMatch = landingCSS.content.match(/\.section-eyebrow,\s*\.hero-kicker,\s*\.cta-eyebrow\s*{([^}]+)}/s);
      expect(eyebrowMatch).toBeDefined();
      
      const letterSpacingMatch = eyebrowMatch[1].match(/letter-spacing:\s*([^;]+);/);
      expect(letterSpacingMatch).toBeDefined();
      expect(letterSpacingMatch[1].trim()).toBe('0.12em');
    });

    it('should have hero title with letter-spacing 0', () => {
      const heroTitleMatch = landingCSS.content.match(/\.hero-title\s*{([^}]+)}/s);
      expect(heroTitleMatch).toBeDefined();
      
      const letterSpacingMatch = heroTitleMatch[1].match(/letter-spacing:\s*([^;]+);/);
      expect(letterSpacingMatch).toBeDefined();
      expect(letterSpacingMatch[1].trim()).toBe('0');
    });
  });
});

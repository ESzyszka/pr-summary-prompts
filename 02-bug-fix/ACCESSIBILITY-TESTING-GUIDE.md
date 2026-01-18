# Accessibility Testing Guide

This guide provides comprehensive testing strategies for ensuring your code changes meet accessibility requirements.

## Pre-Development Testing

### Requirements Analysis
- [ ] Identify user personas with disabilities
- [ ] Map critical user journeys for accessibility
- [ ] Define accessibility acceptance criteria
- [ ] Review design mockups for accessibility compliance

## Automated Testing Setup

### Browser Extensions
```bash
# Recommended accessibility extensions
- axe DevTools (Chrome/Firefox/Edge)
- WAVE Web Accessibility Evaluator
- Lighthouse (built into Chrome DevTools)
- Accessibility Insights for Web (Microsoft)
```

### Command Line Tools
```bash
# Install accessibility testing tools
npm install -g pa11y pa11y-ci axe-core lighthouse

# Run accessibility audit
pa11y https://your-website.com
lighthouse https://your-website.com --only-categories=accessibility

# Continuous integration testing
pa11y-ci --sitemap https://your-website.com/sitemap.xml
```

### Automated Test Integration
```javascript
// Jest + axe-core example
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('should not have accessibility violations', async () => {
  const { container } = render(<YourComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Manual Testing Procedures

### Keyboard Navigation Testing
1. **Tab Navigation**
   - [ ] Tab through all interactive elements
   - [ ] Verify logical tab order
   - [ ] Ensure no keyboard traps
   - [ ] Test Shift+Tab (reverse navigation)

2. **Keyboard Shortcuts**
   - [ ] Test all application shortcuts
   - [ ] Verify standard shortcuts work (Esc, Enter, Space)
   - [ ] Test arrow key navigation in menus/tables
   - [ ] Verify custom shortcuts don't conflict with assistive technology

3. **Focus Management**
   - [ ] Focus indicators are visible and clear
   - [ ] Focus moves logically after dynamic content changes
   - [ ] Modal dialogs trap focus appropriately
   - [ ] Skip links work correctly

### Screen Reader Testing

#### NVDA (Windows) - Free
```
Download: https://www.nvaccess.org/download/
Key Commands:
- NVDA + Space: Toggle speech on/off
- NVDA + T: Read title
- NVDA + B: Read entire page
- H: Navigate by headings
- L: Navigate by links
- F: Navigate by form fields
```

#### JAWS (Windows) - Commercial
```
Key Commands:
- JAWS + F7: List links
- JAWS + F5: List form fields
- JAWS + F6: List headings
- Insert + F7: List landmarks
- H: Next heading
- 1-6: Navigate by heading level
```

#### VoiceOver (macOS/iOS) - Built-in
```
Activation: Cmd + F5
Key Commands:
- VO + A: Read all
- VO + Right Arrow: Next item
- VO + Left Arrow: Previous item
- VO + U: Rotor (navigation menu)
- VO + Space: Activate item
```

#### Testing Checklist
- [ ] All content is announced
- [ ] Headings create logical structure
- [ ] Links have meaningful names
- [ ] Form labels are properly associated
- [ ] Error messages are announced
- [ ] Dynamic content changes are announced
- [ ] Tables have proper headers
- [ ] Images have appropriate alt text

### Color and Contrast Testing

#### Tools
```bash
# Online contrast checkers
- WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/
- Colour Contrast Analyser: https://www.tpgi.com/color-contrast-checker/

# Browser tools
- Chrome DevTools accessibility panel
- Firefox Accessibility Inspector
```

#### Testing Process
- [ ] Text contrast meets WCAG AA (4.5:1) or AAA (7:1) requirements
- [ ] UI component contrast meets 3:1 requirement
- [ ] Information is not conveyed by color alone
- [ ] Links are distinguishable without relying on color only
- [ ] Test with color blindness simulators

### Responsive and Zoom Testing

#### Zoom Testing
- [ ] Test at 200% zoom (WCAG AA requirement)
- [ ] Test at 400% zoom (WCAG AAA requirement)
- [ ] Verify no horizontal scrolling at 320px width
- [ ] Ensure all functionality remains available
- [ ] Check that text doesn't overlap or become cut off

#### Mobile Testing
- [ ] Touch targets are at least 44x44 pixels
- [ ] Pinch-to-zoom is not disabled
- [ ] Portrait and landscape orientations work
- [ ] Screen reader navigation works on mobile
- [ ] Voice control functionality (iOS/Android)

## Assistive Technology Testing

### Screen Magnification Software
- **ZoomText (Windows)**
- **Dragon Naturally Speaking (Voice Control)**
- **Switch Control (iOS/macOS)**

### Testing Scenarios
```
Scenario 1: Complete form using only keyboard
Scenario 2: Navigate entire site using screen reader
Scenario 3: Use voice control to operate interface
Scenario 4: Complete task using only mouse/touch
Scenario 5: Use site with screen magnification
```

## Performance Testing for Accessibility

### Metrics to Monitor
- [ ] **Time to Interactive (TTI)**: Critical for users with cognitive disabilities
- [ ] **First Input Delay (FID)**: Important for motor disability users
- [ ] **Cumulative Layout Shift (CLS)**: Prevents confusion for screen reader users
- [ ] **Total Blocking Time (TBT)**: Affects keyboard navigation responsiveness

### Testing Tools
```javascript
// Performance testing with accessibility focus
const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');

async function runAccessibilityAudit() {
  const browser = await puppeteer.launch();
  const { lhr } = await lighthouse(url, {
    port: new URL(browser.wsEndpoint()).port,
    onlyCategories: ['accessibility', 'performance'],
  });

  // Check accessibility score
  const accessibilityScore = lhr.categories.accessibility.score * 100;
  console.log(`Accessibility Score: ${accessibilityScore}`);

  await browser.close();
}
```

## Documentation and Reporting

### Accessibility Test Report Template
```markdown
## Accessibility Test Report

### Test Summary
- Date: [Date]
- Tester: [Name]
- WCAG Level Tested: [A/AA/AAA]
- Browser/AT Combinations: [List]

### Test Results
- Total Issues Found: [Number]
- Critical Issues: [Number]
- Major Issues: [Number]
- Minor Issues: [Number]

### Detailed Findings
[Issue 1]
- Severity: Critical
- WCAG SC: 2.4.3 Focus Order
- Description: Tab order skips main navigation
- Impact: Keyboard users cannot access navigation
- Recommendation: Adjust tabindex values

### Remediation Plan
- [ ] Fix critical issues (Timeline: Immediate)
- [ ] Address major issues (Timeline: 1 week)
- [ ] Resolve minor issues (Timeline: 2 weeks)
```

## Continuous Accessibility Testing

### CI/CD Integration
```yaml
# GitHub Actions example
name: Accessibility Tests
on: [push, pull_request]
jobs:
  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run Pa11y
        run: |
          npm install -g pa11y-ci
          pa11y-ci --sitemap http://localhost:3000/sitemap.xml
      - name: Run axe-core
        run: |
          npm install -g @axe-core/cli
          axe http://localhost:3000 --tags wcag2a,wcag2aa
```

### Quality Gates
- [ ] No critical accessibility issues in production
- [ ] Accessibility score above 95% in Lighthouse
- [ ] All WCAG 2.1 AA requirements met
- [ ] Manual testing completed for major features

## Training and Resources

### Team Training Requirements
- [ ] Accessibility fundamentals training
- [ ] Screen reader usage training
- [ ] WCAG guidelines understanding
- [ ] Testing tool proficiency
- [ ] Inclusive design principles

### Useful Resources
- [WebAIM](https://webaim.org/) - Web accessibility resources
- [A11Y Project](https://www.a11yproject.com/) - Community-driven accessibility resource
- [WCAG Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/) - Official WCAG 2.1 guidelines
- [Inclusive Components](https://inclusive-components.design/) - Accessible component patterns
- [Accessibility Developer Guide](https://www.accessibility-developer-guide.com/) - Practical implementation guide
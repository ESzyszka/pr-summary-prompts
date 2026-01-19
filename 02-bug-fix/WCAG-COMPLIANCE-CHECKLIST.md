# WCAG 2.1 Compliance Checklist

This comprehensive checklist helps ensure your code changes meet Web Content Accessibility Guidelines (WCAG) 2.1 standards.

## Level A Requirements (Must Have)

### Perceivable
- [ ] **1.1.1 Non-text Content**: All images have meaningful alt text
- [ ] **1.2.1 Audio/Video**: Provide alternatives for time-based media
- [ ] **1.3.1 Info and Relationships**: Information structure is programmatically determinable
- [ ] **1.3.2 Meaningful Sequence**: Content order is logical when presented sequentially
- [ ] **1.3.3 Sensory Characteristics**: Instructions don't rely solely on sensory characteristics
- [ ] **1.4.1 Use of Color**: Color is not the only way information is conveyed
- [ ] **1.4.2 Audio Control**: Auto-playing audio can be paused or stopped

### Operable
- [ ] **2.1.1 Keyboard**: All functionality available via keyboard
- [ ] **2.1.2 No Keyboard Trap**: Users can navigate away from any keyboard-focusable element
- [ ] **2.1.4 Character Key Shortcuts**: Character key shortcuts can be turned off or remapped
- [ ] **2.2.1 Timing Adjustable**: Users can extend or disable time limits
- [ ] **2.2.2 Pause, Stop, Hide**: Users can control moving, blinking, or auto-updating content
- [ ] **2.3.1 Three Flashes**: No content flashes more than three times per second
- [ ] **2.4.1 Bypass Blocks**: Skip navigation mechanism provided
- [ ] **2.4.2 Page Titled**: Web pages have descriptive titles
- [ ] **2.4.3 Focus Order**: Focus order is logical and intuitive
- [ ] **2.4.4 Link Purpose**: Link purpose is clear from context or link text

### Understandable
- [ ] **3.1.1 Language of Page**: Primary language of page is programmatically determinable
- [ ] **3.2.1 On Focus**: Focus doesn't trigger unexpected context changes
- [ ] **3.2.2 On Input**: Input doesn't trigger unexpected context changes
- [ ] **3.3.1 Error Identification**: Errors are clearly identified
- [ ] **3.3.2 Labels or Instructions**: Labels or instructions provided for user input

### Robust
- [ ] **4.1.1 Parsing**: Markup is valid and properly nested
- [ ] **4.1.2 Name, Role, Value**: UI components have accessible names and roles
- [ ] **4.1.3 Status Messages**: Status messages are programmatically determinable

## Level AA Requirements (Should Have)

### Perceivable
- [ ] **1.2.4 Captions (Live)**: Live audio has synchronized captions
- [ ] **1.2.5 Audio Description**: Audio descriptions provided for video
- [ ] **1.4.3 Contrast (Minimum)**: Text has contrast ratio of at least 4.5:1
- [ ] **1.4.4 Resize Text**: Text can be resized up to 200% without loss of functionality
- [ ] **1.4.5 Images of Text**: Avoid images of text except for logos
- [ ] **1.4.10 Reflow**: Content can be presented without horizontal scrolling at 320px
- [ ] **1.4.11 Non-text Contrast**: UI components have contrast ratio of at least 3:1
- [ ] **1.4.12 Text Spacing**: No loss of content when text spacing is adjusted
- [ ] **1.4.13 Content on Hover/Focus**: Content triggered by hover/focus is dismissible and persistent

### Operable
- [ ] **2.4.5 Multiple Ways**: Multiple ways to locate pages within a website
- [ ] **2.4.6 Headings and Labels**: Headings and labels are descriptive
- [ ] **2.4.7 Focus Visible**: Keyboard focus indicator is visible
- [ ] **2.5.1 Pointer Gestures**: All functionality using multipoint/path-based gestures has single-pointer alternative
- [ ] **2.5.2 Pointer Cancellation**: For single-pointer activation, completion occurs on up-event
- [ ] **2.5.3 Label in Name**: Accessible name contains visible label text
- [ ] **2.5.4 Motion Actuation**: Functionality triggered by device motion has UI alternative

### Understandable
- [ ] **3.1.2 Language of Parts**: Language changes are programmatically determinable
- [ ] **3.2.3 Consistent Navigation**: Navigation is consistent across pages
- [ ] **3.2.4 Consistent Identification**: Components with same functionality are consistently identified
- [ ] **3.3.3 Error Suggestion**: Error suggestions provided when possible
- [ ] **3.3.4 Error Prevention**: For legal/financial/data submissions, prevent or allow reversing/checking

## Level AAA Requirements (Nice to Have)

### Perceivable
- [ ] **1.2.6 Sign Language**: Sign language interpretation provided
- [ ] **1.2.7 Extended Audio Description**: Extended audio description for video
- [ ] **1.2.8 Media Alternative**: Full alternative provided for synchronized media
- [ ] **1.2.9 Audio-only (Live)**: Alternative provided for live audio-only
- [ ] **1.4.6 Contrast (Enhanced)**: Text has contrast ratio of at least 7:1
- [ ] **1.4.7 Low/No Background Audio**: Audio is clear or background audio is 20dB lower
- [ ] **1.4.8 Visual Presentation**: Text presentation can be customized
- [ ] **1.4.9 Images of Text (No Exception)**: Images of text only for decoration

### Operable
- [ ] **2.1.3 Keyboard (No Exception)**: All functionality available via keyboard without exception
- [ ] **2.2.3 No Timing**: No time limits except for real-time events
- [ ] **2.2.4 Interruptions**: Interruptions can be postponed or suppressed
- [ ] **2.2.5 Re-authenticating**: When session expires, user can re-authenticate without data loss
- [ ] **2.2.6 Timeouts**: Users are warned of timeouts that cause data loss
- [ ] **2.3.2 Three Flashes**: No content flashes more than three times per second
- [ ] **2.3.3 Animation from Interactions**: Motion animation can be disabled
- [ ] **2.4.8 Location**: Information about user's location within website is available
- [ ] **2.4.9 Link Purpose (Link Only)**: Link purpose is clear from link text alone
- [ ] **2.4.10 Section Headings**: Section headings organize content

### Understandable
- [ ] **3.1.3 Unusual Words**: Definitions available for unusual words
- [ ] **3.1.4 Abbreviations**: Definitions available for abbreviations
- [ ] **3.1.5 Reading Level**: Content written at lower secondary education level
- [ ] **3.1.6 Pronunciation**: Pronunciation available when meaning is ambiguous
- [ ] **3.2.5 Change on Request**: Context changes only occur on user request
- [ ] **3.3.5 Help**: Context-sensitive help is available
- [ ] **3.3.6 Error Prevention (All)**: All submissions allow user to review, correct, and confirm

## Testing Tools and Methods

### Automated Testing
- [ ] **axe DevTools**: Run accessibility audit
- [ ] **Lighthouse**: Check accessibility score
- [ ] **WAVE**: Web accessibility evaluation
- [ ] **Pa11y**: Command-line accessibility testing
- [ ] **ESLint jsx-a11y**: Linting for accessibility

### Manual Testing
- [ ] **Keyboard Navigation**: Tab through entire interface
- [ ] **Screen Reader**: Test with NVDA/JAWS/VoiceOver
- [ ] **Color Contrast**: Use WebAIM contrast checker
- [ ] **Focus Management**: Verify focus indicators and order
- [ ] **Zoom Testing**: Test at 200% zoom level

### User Testing
- [ ] **Disability Community**: Include users with disabilities in testing
- [ ] **Assistive Technology**: Test with real assistive technology users
- [ ] **Diverse Scenarios**: Test various interaction patterns and use cases

## Implementation Notes

### ARIA Usage
- Use semantic HTML first, ARIA second
- Test with screen readers to verify ARIA implementation
- Keep ARIA patterns simple and well-documented

### Focus Management
- Ensure focus moves logically through the interface
- Provide visible focus indicators for all interactive elements
- Manage focus for dynamic content changes

### Error Handling
- Provide clear, actionable error messages
- Indicate required fields clearly
- Allow users to correct errors easily

## Documentation Requirements

- [ ] Document accessibility features implemented
- [ ] Include testing results and remediation steps
- [ ] Provide training materials for content creators
- [ ] Maintain accessibility statement on website
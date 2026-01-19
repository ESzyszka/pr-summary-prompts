# ARIA Patterns and Implementation Guide

This guide provides comprehensive ARIA (Accessible Rich Internet Applications) patterns for building accessible web components.

## Core ARIA Concepts

### ARIA Attributes Categories

#### Labels and Descriptions
- `aria-label`: Provides accessible name when text label isn't visible
- `aria-labelledby`: References elements that label the current element
- `aria-describedby`: References elements that provide additional description
- `aria-details`: References detailed descriptions (ARIA 1.2)

#### Relationships
- `aria-owns`: Defines parent-child relationships in DOM
- `aria-controls`: Element controls another element
- `aria-flowto`: Defines reading flow in non-standard layouts

#### States and Properties
- `aria-expanded`: Collapsible element state (true/false/undefined)
- `aria-selected`: Selection state in selectable elements
- `aria-checked`: Checkbox/radio/switch state
- `aria-disabled`: Disabled state
- `aria-hidden`: Hidden from assistive technology
- `aria-live`: Live region announcements (off/polite/assertive)
- `aria-busy`: Loading state indicator

## Common ARIA Patterns

### 1. Modal Dialog

```html
<!-- Trigger Button -->
<button type="button"
        aria-haspopup="dialog"
        aria-controls="modal-dialog">
  Open Settings
</button>

<!-- Modal Dialog -->
<div role="dialog"
     id="modal-dialog"
     aria-modal="true"
     aria-labelledby="modal-title"
     aria-describedby="modal-description"
     hidden>
  <div class="modal-backdrop"></div>
  <div class="modal-content">
    <header>
      <h2 id="modal-title">Settings</h2>
      <button type="button"
              aria-label="Close settings dialog"
              class="close-button">×</button>
    </header>
    <div id="modal-description">
      Configure your application preferences.
    </div>
    <div class="modal-body">
      <!-- Modal content -->
    </div>
  </div>
</div>
```

**JavaScript Implementation:**
```javascript
class AccessibleModal {
  constructor(modalId, triggerId) {
    this.modal = document.getElementById(modalId);
    this.trigger = document.getElementById(triggerId);
    this.focusableElements = this.modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    this.firstFocusable = this.focusableElements[0];
    this.lastFocusable = this.focusableElements[this.focusableElements.length - 1];

    this.bindEvents();
  }

  open() {
    this.modal.hidden = false;
    this.firstFocusable.focus();
    document.body.style.overflow = 'hidden';
    this.trapFocus();
  }

  close() {
    this.modal.hidden = true;
    this.trigger.focus();
    document.body.style.overflow = '';
  }

  trapFocus() {
    this.modal.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === this.firstFocusable) {
            e.preventDefault();
            this.lastFocusable.focus();
          }
        } else {
          if (document.activeElement === this.lastFocusable) {
            e.preventDefault();
            this.firstFocusable.focus();
          }
        }
      } else if (e.key === 'Escape') {
        this.close();
      }
    });
  }
}
```

### 2. Accordion

```html
<div class="accordion">
  <h3>
    <button type="button"
            aria-expanded="false"
            aria-controls="panel1"
            id="accordion1">
      Section 1 Title
    </button>
  </h3>
  <div role="region"
       id="panel1"
       aria-labelledby="accordion1"
       hidden>
    <p>Section 1 content goes here.</p>
  </div>

  <h3>
    <button type="button"
            aria-expanded="true"
            aria-controls="panel2"
            id="accordion2">
      Section 2 Title
    </button>
  </h3>
  <div role="region"
       id="panel2"
       aria-labelledby="accordion2">
    <p>Section 2 content goes here.</p>
  </div>
</div>
```

### 3. Tabbed Interface

```html
<div class="tabs">
  <div role="tablist" aria-label="Dashboard sections">
    <button role="tab"
            aria-selected="true"
            aria-controls="overview-panel"
            id="overview-tab"
            tabindex="0">
      Overview
    </button>
    <button role="tab"
            aria-selected="false"
            aria-controls="analytics-panel"
            id="analytics-tab"
            tabindex="-1">
      Analytics
    </button>
    <button role="tab"
            aria-selected="false"
            aria-controls="reports-panel"
            id="reports-tab"
            tabindex="-1">
      Reports
    </button>
  </div>

  <div role="tabpanel"
       id="overview-panel"
       aria-labelledby="overview-tab"
       tabindex="0">
    <h3>Overview Content</h3>
    <p>Overview information goes here.</p>
  </div>

  <div role="tabpanel"
       id="analytics-panel"
       aria-labelledby="analytics-tab"
       tabindex="0"
       hidden>
    <h3>Analytics Content</h3>
    <p>Analytics information goes here.</p>
  </div>

  <div role="tabpanel"
       id="reports-panel"
       aria-labelledby="reports-tab"
       tabindex="0"
       hidden>
    <h3>Reports Content</h3>
    <p>Reports information goes here.</p>
  </div>
</div>
```

### 4. Dropdown Menu

```html
<div class="dropdown">
  <button type="button"
          aria-haspopup="menu"
          aria-expanded="false"
          aria-controls="dropdown-menu"
          id="menu-trigger">
    Actions
    <span aria-hidden="true">▼</span>
  </button>

  <ul role="menu"
      id="dropdown-menu"
      aria-labelledby="menu-trigger"
      hidden>
    <li role="menuitem">
      <a href="/edit">Edit</a>
    </li>
    <li role="menuitem">
      <a href="/copy">Copy</a>
    </li>
    <li role="separator"></li>
    <li role="menuitem">
      <a href="/delete" aria-describedby="delete-warning">Delete</a>
      <div id="delete-warning" class="sr-only">
        This action cannot be undone
      </div>
    </li>
  </ul>
</div>
```

### 5. Data Table with Sorting

```html
<table role="table" aria-label="Employee data">
  <caption>
    Employee Information (sorted by name ascending)
    <div class="table-actions">
      <button type="button" aria-describedby="export-help">
        Export Data
      </button>
      <div id="export-help" class="sr-only">
        Downloads employee data as CSV file
      </div>
    </div>
  </caption>

  <thead>
    <tr>
      <th scope="col">
        <button type="button"
                aria-sort="ascending"
                aria-describedby="name-sort-help">
          Name
        </button>
        <div id="name-sort-help" class="sr-only">
          Currently sorted ascending. Click to sort descending.
        </div>
      </th>
      <th scope="col">
        <button type="button"
                aria-sort="none">
          Department
        </button>
      </th>
      <th scope="col">Email</th>
      <th scope="col">Actions</th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td>Alice Johnson</td>
      <td>Engineering</td>
      <td>alice@company.com</td>
      <td>
        <button type="button"
                aria-label="Edit Alice Johnson's information">
          Edit
        </button>
      </td>
    </tr>
  </tbody>
</table>
```

### 6. Form with Live Validation

```html
<form novalidate>
  <div class="form-field">
    <label for="username">Username</label>
    <input type="text"
           id="username"
           required
           aria-describedby="username-help username-error"
           aria-invalid="false">
    <div id="username-help" class="help-text">
      Must be 3-20 characters, letters and numbers only
    </div>
    <div id="username-error"
         class="error-message"
         aria-live="polite"
         hidden>
    </div>
  </div>

  <div class="form-field">
    <label for="email">Email Address</label>
    <input type="email"
           id="email"
           required
           aria-describedby="email-error"
           aria-invalid="false">
    <div id="email-error"
         class="error-message"
         aria-live="polite"
         hidden>
    </div>
  </div>

  <fieldset>
    <legend>Notification Preferences</legend>
    <div class="checkbox-group">
      <input type="checkbox"
             id="email-notifications"
             aria-describedby="notifications-help">
      <label for="email-notifications">Email notifications</label>
    </div>
    <div id="notifications-help" class="help-text">
      Receive updates about your account activity
    </div>
  </fieldset>

  <button type="submit">Create Account</button>
</form>
```

### 7. Live Regions and Status Updates

```html
<!-- Status updates -->
<div aria-live="polite"
     aria-label="Status updates"
     class="sr-only"
     id="status-region">
</div>

<!-- Loading indicator -->
<div class="loading-container">
  <div role="status"
       aria-live="polite"
       aria-label="Loading content">
    <div class="spinner" aria-hidden="true"></div>
    <span class="sr-only">Loading, please wait...</span>
  </div>
</div>

<!-- Search results -->
<div class="search-container">
  <input type="search"
         aria-label="Search products"
         aria-describedby="search-results-count">

  <div id="search-results-count"
       aria-live="polite"
       aria-atomic="true">
    <!-- Dynamically updated: "Found 23 results for 'laptop'" -->
  </div>

  <div class="search-results"
       role="region"
       aria-label="Search results"
       aria-busy="false">
    <!-- Search results content -->
  </div>
</div>
```

## Advanced ARIA Patterns

### 8. Combobox with Autocomplete

```html
<div class="combobox-container">
  <label for="country-input">Country</label>
  <input type="text"
         id="country-input"
         role="combobox"
         aria-autocomplete="list"
         aria-expanded="false"
         aria-controls="country-listbox"
         aria-describedby="country-help"
         aria-activedescendant="">

  <div id="country-help" class="help-text">
    Type to search countries
  </div>

  <ul role="listbox"
      id="country-listbox"
      aria-label="Country suggestions"
      hidden>
    <li role="option"
        id="option-1"
        aria-selected="false">
      United States
    </li>
    <li role="option"
        id="option-2"
        aria-selected="false">
      United Kingdom
    </li>
  </ul>
</div>
```

### 9. Tree View Navigation

```html
<div role="tree"
     aria-label="File explorer"
     aria-activedescendant="node-1">
  <div role="treeitem"
       id="node-1"
       aria-expanded="true"
       aria-level="1"
       aria-setsize="3"
       aria-posinset="1"
       tabindex="0">
    <span>Documents</span>

    <div role="group">
      <div role="treeitem"
           id="node-1-1"
           aria-level="2"
           aria-setsize="2"
           aria-posinset="1"
           tabindex="-1">
        <span>Reports</span>
      </div>

      <div role="treeitem"
           id="node-1-2"
           aria-expanded="false"
           aria-level="2"
           aria-setsize="2"
           aria-posinset="2"
           tabindex="-1">
        <span>Presentations</span>
      </div>
    </div>
  </div>
</div>
```

## ARIA Best Practices

### Do's
- ✅ Use semantic HTML first, ARIA second
- ✅ Test with actual screen readers
- ✅ Keep ARIA patterns simple and standard
- ✅ Ensure all interactive elements are keyboard accessible
- ✅ Provide clear, descriptive labels
- ✅ Use aria-live for dynamic content updates
- ✅ Maintain consistent interaction patterns

### Don'ts
- ❌ Don't use ARIA to fix bad HTML structure
- ❌ Don't override semantic meaning unnecessarily
- ❌ Don't use aria-label on elements that already have visible labels
- ❌ Don't make non-interactive elements focusable without purpose
- ❌ Don't use complex ARIA patterns for simple interactions
- ❌ Don't forget to test keyboard navigation
- ❌ Don't rely solely on automated testing tools

## Testing ARIA Implementation

### Screen Reader Testing Commands

**NVDA/JAWS:**
- `Insert + F7`: List all landmarks and regions
- `Insert + F5`: List all form fields
- `Insert + F6`: List all headings
- `Insert + F3`: Navigate by element type

**VoiceOver:**
- `VO + U`: Open rotor for navigation
- `VO + A`: Read all content
- `VO + Right Arrow`: Next item
- `VO + Shift + M`: Memory (bookmark content)

### Common Testing Scenarios
1. Navigate using only keyboard
2. Use screen reader to understand content structure
3. Verify all interactive elements are announced
4. Check that state changes are communicated
5. Ensure error messages are announced
6. Test focus management in dynamic content
7. Verify live region announcements work correctly

## ARIA Quick Reference

| Element Type | Required ARIA | Optional ARIA |
|-------------|--------------|---------------|
| Button | none (use `<button>`) | `aria-pressed`, `aria-expanded` |
| Link | none (use `<a>`) | `aria-describedby`, `aria-current` |
| Form Input | `aria-label` OR `aria-labelledby` | `aria-describedby`, `aria-invalid` |
| Modal | `role="dialog"`, `aria-modal="true"` | `aria-describedby` |
| Tab Panel | `role="tabpanel"`, `aria-labelledby` | none |
| Menu | `role="menu"` | `aria-orientation` |
| Live Region | `aria-live` | `aria-atomic`, `aria-relevant` |

This guide should be used alongside WCAG guidelines and real user testing to ensure truly accessible implementations.
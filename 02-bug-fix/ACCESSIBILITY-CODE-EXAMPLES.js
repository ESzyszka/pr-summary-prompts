/**
 * Accessibility Code Examples
 * Comprehensive examples of accessible JavaScript components
 */

// ===== 1. ACCESSIBLE MODAL COMPONENT =====

class AccessibleModal {
  constructor(modalId, triggerSelector) {
    this.modal = document.getElementById(modalId);
    this.triggers = document.querySelectorAll(triggerSelector);
    this.isOpen = false;
    this.previousActiveElement = null;

    this.init();
  }

  init() {
    this.bindEvents();
    this.setInitialFocus();
  }

  bindEvents() {
    // Trigger events
    this.triggers.forEach(trigger => {
      trigger.addEventListener('click', () => this.open());
    });

    // Close button events
    const closeButtons = this.modal.querySelectorAll('[data-close-modal]');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => this.close());
    });

    // Keyboard events
    document.addEventListener('keydown', (e) => {
      if (this.isOpen && e.key === 'Escape') {
        this.close();
      }
    });

    // Focus trap
    this.modal.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        this.trapFocus(e);
      }
    });

    // Backdrop click
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });
  }

  open() {
    this.previousActiveElement = document.activeElement;
    this.modal.removeAttribute('hidden');
    this.modal.setAttribute('aria-modal', 'true');

    // Prevent background scrolling
    document.body.style.overflow = 'hidden';

    // Set focus to first focusable element
    const firstFocusable = this.getFirstFocusableElement();
    if (firstFocusable) {
      firstFocusable.focus();
    }

    this.isOpen = true;

    // Announce to screen readers
    this.announceToScreenReader('Dialog opened');
  }

  close() {
    this.modal.setAttribute('hidden', '');
    this.modal.removeAttribute('aria-modal');

    // Restore background scrolling
    document.body.style.overflow = '';

    // Return focus to triggering element
    if (this.previousActiveElement) {
      this.previousActiveElement.focus();
    }

    this.isOpen = false;

    // Announce to screen readers
    this.announceToScreenReader('Dialog closed');
  }

  trapFocus(e) {
    const focusableElements = this.getFocusableElements();
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstFocusable) {
      e.preventDefault();
      lastFocusable.focus();
    } else if (!e.shiftKey && document.activeElement === lastFocusable) {
      e.preventDefault();
      firstFocusable.focus();
    }
  }

  getFocusableElements() {
    const focusableSelectors = [
      'button:not([disabled]):not([aria-hidden="true"])',
      'input:not([disabled]):not([type="hidden"]):not([aria-hidden="true"])',
      'select:not([disabled]):not([aria-hidden="true"])',
      'textarea:not([disabled]):not([aria-hidden="true"])',
      'a[href]:not([aria-hidden="true"])',
      '[tabindex]:not([tabindex="-1"]):not([aria-hidden="true"])'
    ].join(',');

    return Array.from(this.modal.querySelectorAll(focusableSelectors));
  }

  getFirstFocusableElement() {
    const focusableElements = this.getFocusableElements();
    return focusableElements[0] || this.modal;
  }

  announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
}

// ===== 2. ACCESSIBLE ACCORDION COMPONENT =====

class AccessibleAccordion {
  constructor(accordionSelector) {
    this.accordion = document.querySelector(accordionSelector);
    this.headers = Array.from(this.accordion.querySelectorAll('[data-accordion-header]'));
    this.panels = Array.from(this.accordion.querySelectorAll('[data-accordion-panel]'));

    this.init();
  }

  init() {
    this.setupARIA();
    this.bindEvents();
  }

  setupARIA() {
    this.headers.forEach((header, index) => {
      const button = header.querySelector('button') || header;
      const panel = this.panels[index];

      // Set up IDs if they don't exist
      const headerId = button.id || `accordion-header-${index}`;
      const panelId = panel.id || `accordion-panel-${index}`;

      button.id = headerId;
      panel.id = panelId;

      // Set up ARIA attributes
      button.setAttribute('aria-controls', panelId);
      button.setAttribute('aria-expanded', 'false');

      panel.setAttribute('aria-labelledby', headerId);
      panel.setAttribute('role', 'region');
      panel.setAttribute('hidden', '');
    });
  }

  bindEvents() {
    this.headers.forEach((header, index) => {
      const button = header.querySelector('button') || header;

      button.addEventListener('click', () => {
        this.toggle(index);
      });

      button.addEventListener('keydown', (e) => {
        this.handleKeydown(e, index);
      });
    });
  }

  toggle(index) {
    const isExpanded = this.headers[index].querySelector('button').getAttribute('aria-expanded') === 'true';

    if (isExpanded) {
      this.collapse(index);
    } else {
      this.expand(index);
    }
  }

  expand(index) {
    const button = this.headers[index].querySelector('button');
    const panel = this.panels[index];

    button.setAttribute('aria-expanded', 'true');
    panel.removeAttribute('hidden');

    // Smooth animation
    panel.style.height = 'auto';
    const height = panel.offsetHeight;
    panel.style.height = '0';
    panel.offsetHeight; // Force reflow
    panel.style.height = height + 'px';

    panel.addEventListener('transitionend', function handler() {
      panel.style.height = 'auto';
      panel.removeEventListener('transitionend', handler);
    });
  }

  collapse(index) {
    const button = this.headers[index].querySelector('button');
    const panel = this.panels[index];

    button.setAttribute('aria-expanded', 'false');

    const height = panel.offsetHeight;
    panel.style.height = height + 'px';
    panel.offsetHeight; // Force reflow
    panel.style.height = '0';

    panel.addEventListener('transitionend', function handler() {
      panel.setAttribute('hidden', '');
      panel.style.height = '';
      panel.removeEventListener('transitionend', handler);
    });
  }

  handleKeydown(e, index) {
    const { key } = e;

    switch (key) {
      case 'ArrowDown':
        e.preventDefault();
        this.focusNext(index);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.focusPrevious(index);
        break;
      case 'Home':
        e.preventDefault();
        this.focusFirst();
        break;
      case 'End':
        e.preventDefault();
        this.focusLast();
        break;
    }
  }

  focusNext(currentIndex) {
    const nextIndex = (currentIndex + 1) % this.headers.length;
    this.headers[nextIndex].querySelector('button').focus();
  }

  focusPrevious(currentIndex) {
    const prevIndex = currentIndex === 0 ? this.headers.length - 1 : currentIndex - 1;
    this.headers[prevIndex].querySelector('button').focus();
  }

  focusFirst() {
    this.headers[0].querySelector('button').focus();
  }

  focusLast() {
    this.headers[this.headers.length - 1].querySelector('button').focus();
  }
}

// ===== 3. ACCESSIBLE TABS COMPONENT =====

class AccessibleTabs {
  constructor(tabsSelector) {
    this.tabsContainer = document.querySelector(tabsSelector);
    this.tabList = this.tabsContainer.querySelector('[role="tablist"]');
    this.tabs = Array.from(this.tabList.querySelectorAll('[role="tab"]'));
    this.panels = Array.from(this.tabsContainer.querySelectorAll('[role="tabpanel"]'));
    this.currentTab = 0;

    this.init();
  }

  init() {
    this.setupARIA();
    this.bindEvents();
    this.setActiveTab(0);
  }

  setupARIA() {
    this.tabs.forEach((tab, index) => {
      const panel = this.panels[index];

      // Set up IDs if they don't exist
      const tabId = tab.id || `tab-${index}`;
      const panelId = panel.id || `panel-${index}`;

      tab.id = tabId;
      panel.id = panelId;

      // Set up ARIA attributes
      tab.setAttribute('aria-controls', panelId);
      tab.setAttribute('aria-selected', 'false');
      tab.setAttribute('tabindex', '-1');

      panel.setAttribute('aria-labelledby', tabId);
      panel.setAttribute('tabindex', '0');
    });
  }

  bindEvents() {
    this.tabList.addEventListener('click', (e) => {
      const clickedTab = e.target.closest('[role="tab"]');
      if (clickedTab) {
        const index = this.tabs.indexOf(clickedTab);
        this.setActiveTab(index);
      }
    });

    this.tabList.addEventListener('keydown', (e) => {
      this.handleKeydown(e);
    });
  }

  setActiveTab(index) {
    // Remove active state from current tab
    this.tabs[this.currentTab].setAttribute('aria-selected', 'false');
    this.tabs[this.currentTab].setAttribute('tabindex', '-1');
    this.panels[this.currentTab].setAttribute('hidden', '');

    // Set active state on new tab
    this.currentTab = index;
    this.tabs[this.currentTab].setAttribute('aria-selected', 'true');
    this.tabs[this.currentTab].setAttribute('tabindex', '0');
    this.tabs[this.currentTab].focus();
    this.panels[this.currentTab].removeAttribute('hidden');
  }

  handleKeydown(e) {
    const { key } = e;
    let newIndex = this.currentTab;

    switch (key) {
      case 'ArrowLeft':
        e.preventDefault();
        newIndex = this.currentTab === 0 ? this.tabs.length - 1 : this.currentTab - 1;
        break;
      case 'ArrowRight':
        e.preventDefault();
        newIndex = (this.currentTab + 1) % this.tabs.length;
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = this.tabs.length - 1;
        break;
      default:
        return;
    }

    this.setActiveTab(newIndex);
  }
}

// ===== 4. ACCESSIBLE FORM VALIDATION =====

class AccessibleFormValidator {
  constructor(formSelector) {
    this.form = document.querySelector(formSelector);
    this.fields = Array.from(this.form.querySelectorAll('[data-validate]'));
    this.errorContainer = this.form.querySelector('[data-error-summary]');

    this.init();
  }

  init() {
    this.setupARIA();
    this.bindEvents();
  }

  setupARIA() {
    this.fields.forEach(field => {
      field.setAttribute('aria-invalid', 'false');

      // Create error element if it doesn't exist
      const fieldId = field.id || this.generateId();
      field.id = fieldId;

      let errorElement = document.getElementById(`${fieldId}-error`);
      if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = `${fieldId}-error`;
        errorElement.className = 'error-message';
        errorElement.setAttribute('aria-live', 'polite');
        errorElement.setAttribute('hidden', '');
        field.parentNode.appendChild(errorElement);
      }

      // Associate error with field
      const describedBy = field.getAttribute('aria-describedby') || '';
      const errorId = `${fieldId}-error`;

      if (!describedBy.includes(errorId)) {
        field.setAttribute('aria-describedby',
          describedBy ? `${describedBy} ${errorId}` : errorId
        );
      }
    });
  }

  bindEvents() {
    this.fields.forEach(field => {
      // Real-time validation
      field.addEventListener('blur', () => {
        this.validateField(field);
      });

      field.addEventListener('input', () => {
        // Clear errors on input if field was previously invalid
        if (field.getAttribute('aria-invalid') === 'true') {
          this.clearFieldError(field);
        }
      });
    });

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.validateForm();
    });
  }

  validateField(field) {
    const value = field.value.trim();
    const rules = field.dataset.validate.split(' ');
    const errors = [];

    rules.forEach(rule => {
      switch (rule) {
        case 'required':
          if (!value) {
            errors.push('This field is required');
          }
          break;
        case 'email':
          if (value && !this.isValidEmail(value)) {
            errors.push('Please enter a valid email address');
          }
          break;
        case 'minlength':
          const minLength = parseInt(field.getAttribute('minlength'));
          if (value && value.length < minLength) {
            errors.push(`Must be at least ${minLength} characters long`);
          }
          break;
      }
    });

    if (errors.length > 0) {
      this.showFieldError(field, errors[0]);
      return false;
    } else {
      this.clearFieldError(field);
      return true;
    }
  }

  showFieldError(field, message) {
    const errorElement = document.getElementById(`${field.id}-error`);

    field.setAttribute('aria-invalid', 'true');
    errorElement.textContent = message;
    errorElement.removeAttribute('hidden');

    // Add CSS class for styling
    field.classList.add('error');
  }

  clearFieldError(field) {
    const errorElement = document.getElementById(`${field.id}-error`);

    field.setAttribute('aria-invalid', 'false');
    errorElement.textContent = '';
    errorElement.setAttribute('hidden', '');

    // Remove CSS class
    field.classList.remove('error');
  }

  validateForm() {
    const results = this.fields.map(field => this.validateField(field));
    const isValid = results.every(result => result);

    if (!isValid) {
      this.showErrorSummary();
      this.focusFirstError();
    } else {
      this.hideErrorSummary();
      this.submitForm();
    }
  }

  showErrorSummary() {
    if (!this.errorContainer) return;

    const errorFields = this.fields.filter(field =>
      field.getAttribute('aria-invalid') === 'true'
    );

    const errorList = errorFields.map(field => {
      const label = this.getFieldLabel(field);
      const errorMessage = document.getElementById(`${field.id}-error`).textContent;
      return `${label}: ${errorMessage}`;
    });

    this.errorContainer.innerHTML = `
      <h3>Please correct the following errors:</h3>
      <ul>
        ${errorList.map(error => `<li>${error}</li>`).join('')}
      </ul>
    `;

    this.errorContainer.removeAttribute('hidden');
    this.errorContainer.focus();
  }

  hideErrorSummary() {
    if (this.errorContainer) {
      this.errorContainer.setAttribute('hidden', '');
    }
  }

  focusFirstError() {
    const firstErrorField = this.fields.find(field =>
      field.getAttribute('aria-invalid') === 'true'
    );

    if (firstErrorField) {
      firstErrorField.focus();
    }
  }

  getFieldLabel(field) {
    const label = document.querySelector(`label[for="${field.id}"]`);
    return label ? label.textContent.trim() : field.name || 'Field';
  }

  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  generateId() {
    return `field-${Math.random().toString(36).substr(2, 9)}`;
  }

  submitForm() {
    // Handle successful form submission
    this.announceToScreenReader('Form submitted successfully');

    // Your form submission logic here
    console.log('Form is valid and ready to submit');
  }

  announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
}

// ===== 5. ACCESSIBLE NOTIFICATION SYSTEM =====

class AccessibleNotifications {
  constructor() {
    this.container = null;
    this.notifications = [];
    this.init();
  }

  init() {
    this.createContainer();
  }

  createContainer() {
    this.container = document.createElement('div');
    this.container.className = 'notification-container';
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-label', 'Notifications');
    this.container.setAttribute('role', 'region');

    document.body.appendChild(this.container);
  }

  show(message, type = 'info', duration = 5000) {
    const notification = this.createNotification(message, type);
    this.notifications.push(notification);
    this.container.appendChild(notification);

    // Focus management for screen readers
    if (type === 'error') {
      notification.focus();
    }

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => {
        this.dismiss(notification);
      }, duration);
    }

    return notification;
  }

  createNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification--${type}`;
    notification.setAttribute('role', type === 'error' ? 'alert' : 'status');
    notification.setAttribute('tabindex', '-1');

    const icon = this.getIconForType(type);
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'notification__close';
    closeButton.setAttribute('aria-label', 'Close notification');
    closeButton.innerHTML = '×';

    closeButton.addEventListener('click', () => {
      this.dismiss(notification);
    });

    notification.innerHTML = `
      <div class="notification__content">
        <span class="notification__icon" aria-hidden="true">${icon}</span>
        <span class="notification__message">${message}</span>
      </div>
    `;

    notification.appendChild(closeButton);

    return notification;
  }

  dismiss(notification) {
    const index = this.notifications.indexOf(notification);
    if (index > -1) {
      this.notifications.splice(index, 1);
    }

    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }

  getIconForType(type) {
    const icons = {
      success: '✓',
      error: '⚠',
      warning: '⚠',
      info: 'ℹ'
    };

    return icons[type] || icons.info;
  }
}

// ===== 6. USAGE EXAMPLES =====

// Initialize components when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Modal
  if (document.querySelector('#modal')) {
    new AccessibleModal('modal', '[data-open-modal]');
  }

  // Accordion
  if (document.querySelector('.accordion')) {
    new AccessibleAccordion('.accordion');
  }

  // Tabs
  if (document.querySelector('.tabs')) {
    new AccessibleTabs('.tabs');
  }

  // Form validation
  if (document.querySelector('form[data-validate-form]')) {
    new AccessibleFormValidator('form[data-validate-form]');
  }

  // Notifications
  window.notifications = new AccessibleNotifications();
});

// Example usage for notifications:
// window.notifications.show('Settings saved successfully!', 'success');
// window.notifications.show('Please check your email address', 'error');
// window.notifications.show('Your session will expire in 5 minutes', 'warning');

export {
  AccessibleModal,
  AccessibleAccordion,
  AccessibleTabs,
  AccessibleFormValidator,
  AccessibleNotifications
};
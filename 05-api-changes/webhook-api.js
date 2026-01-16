const express = require('express');
const crypto = require('crypto');
const router = express.Router();

// BREAKING CHANGE: New webhook system with different payload structure
class WebhookManager {
  constructor() {
    this.endpoints = new Map();
    this.eventTypes = [
      'user.created', 'user.updated', 'user.deleted',
      'project.created', 'project.completed', 'task.assigned'
    ];
  }

  // NEW: Webhook registration endpoint
  async registerWebhook(config) {
    const webhook = {
      id: this.generateId(),
      url: config.url,
      events: config.events,
      secret: config.secret || this.generateSecret(),
      active: true,
      createdAt: new Date(),
      // BREAKING: New retry configuration structure
      retryConfig: {
        maxRetries: config.maxRetries || 3,
        backoffMultiplier: config.backoffMultiplier || 2,
        initialDelay: config.initialDelay || 1000
      }
    };

    this.endpoints.set(webhook.id, webhook);
    return webhook;
  }

  // NEW: Event delivery with signature verification
  async deliverEvent(eventType, payload) {
    const activeWebhooks = Array.from(this.endpoints.values())
      .filter(webhook => webhook.active && webhook.events.includes(eventType));

    const deliveryPromises = activeWebhooks.map(webhook =>
      this.deliverToEndpoint(webhook, eventType, payload)
    );

    return Promise.allSettled(deliveryPromises);
  }

  async deliverToEndpoint(webhook, eventType, payload) {
    const webhookPayload = {
      id: this.generateId(),
      event: eventType,
      timestamp: new Date().toISOString(),
      data: payload,
      // BREAKING: New metadata structure
      metadata: {
        webhookId: webhook.id,
        attempt: 1,
        signature: this.generateSignature(payload, webhook.secret)
      }
    };

    return this.sendWebhook(webhook.url, webhookPayload, webhook);
  }

  generateSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }

  generateSecret() {
    return crypto.randomBytes(32).toString('hex');
  }

  generateId() {
    return crypto.randomUUID();
  }

  async sendWebhook(url, payload, webhook) {
    // Implementation would use HTTP client to send webhook
    console.log(`Sending webhook to ${url}:`, payload);
    return { success: true, webhookId: webhook.id };
  }
}

const webhookManager = new WebhookManager();

// BREAKING: New webhook management endpoints
router.post('/webhooks', async (req, res) => {
  try {
    const { url, events, secret, retryConfig } = req.body;

    if (!url || !events || !Array.isArray(events)) {
      return res.status(400).json({
        error: 'Invalid webhook configuration',
        details: 'URL and events array are required'
      });
    }

    const webhook = await webhookManager.registerWebhook({
      url, events, secret, ...retryConfig
    });

    // BREAKING: New response format with metadata
    res.status(201).json({
      data: webhook,
      meta: {
        availableEvents: webhookManager.eventTypes,
        deliveryInfo: {
          timeout: '30s',
          retryPolicy: 'exponential_backoff'
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// NEW: Webhook testing endpoint
router.post('/webhooks/:id/test', async (req, res) => {
  try {
    const { id } = req.params;
    const webhook = webhookManager.endpoints.get(id);

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook not found' });
    }

    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: { test: true, webhookId: id }
    };

    const result = await webhookManager.deliverToEndpoint(webhook, 'webhook.test', testPayload);

    res.json({
      success: true,
      testResult: result,
      webhook: { id: webhook.id, url: webhook.url }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = { router, webhookManager };
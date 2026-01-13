// Fix memory leak in WebSocket connection manager
const EventEmitter = require('events');

class WebSocketManager extends EventEmitter {
  constructor() {
    super();
    this.connections = new Map();
    this.heartbeatInterval = null;
    this.reconnectAttempts = new Map();
    this.maxReconnectAttempts = 5;

    // Fix: Set max listeners to prevent memory leak warnings
    this.setMaxListeners(50);

    // Fix: Bind cleanup methods to ensure proper context
    this.cleanup = this.cleanup.bind(this);
    this.handleProcessExit = this.handleProcessExit.bind(this);

    // Fix: Add proper cleanup on process exit
    process.on('SIGINT', this.handleProcessExit);
    process.on('SIGTERM', this.handleProcessExit);
    process.on('exit', this.handleProcessExit);
  }

  addConnection(userId, ws) {
    // Fix: Remove existing connection to prevent duplicates
    if (this.connections.has(userId)) {
      const existingWs = this.connections.get(userId);
      this.removeConnection(userId, existingWs);
    }

    this.connections.set(userId, ws);

    // Fix: Add proper error handling and cleanup
    ws.on('close', (code, reason) => {
      console.log(`Connection closed for user ${userId}:`, code, reason);
      this.removeConnection(userId, ws);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error for user ${userId}:`, error);
      this.removeConnection(userId, ws);
    });

    // Fix: Add message size limits to prevent memory exhaustion
    ws.on('message', (data) => {
      try {
        // Fix: Limit message size (1MB max)
        if (data.length > 1024 * 1024) {
          console.warn(`Message too large from user ${userId}`);
          ws.close(1009, 'Message too large');
          return;
        }

        const message = JSON.parse(data);
        this.handleMessage(userId, message);
      } catch (error) {
        console.error(`Invalid message from user ${userId}:`, error);
        // Fix: Don't close connection for parsing errors, just log
      }
    });

    // Reset reconnection attempts on successful connection
    this.reconnectAttempts.delete(userId);

    console.log(`WebSocket connection added for user: ${userId}`);
    this.emit('connection', userId);
  }

  removeConnection(userId, ws) {
    // Fix: Only remove if the WebSocket instance matches
    const existingWs = this.connections.get(userId);
    if (existingWs === ws) {
      this.connections.delete(userId);
      console.log(`WebSocket connection removed for user: ${userId}`);
      this.emit('disconnection', userId);
    }

    // Fix: Ensure WebSocket is properly closed
    if (ws && ws.readyState === ws.OPEN) {
      ws.close();
    }

    // Fix: Remove all event listeners to prevent memory leaks
    if (ws) {
      ws.removeAllListeners();
    }
  }

  sendToUser(userId, message) {
    const ws = this.connections.get(userId);
    if (ws && ws.readyState === ws.OPEN) {
      try {
        // Fix: Add message serialization safety
        const serializedMessage = JSON.stringify(message);
        ws.send(serializedMessage);
        return true;
      } catch (error) {
        console.error(`Error sending message to user ${userId}:`, error);
        this.removeConnection(userId, ws);
        return false;
      }
    }
    return false;
  }

  broadcast(message, excludeUserId = null) {
    const failedConnections = [];

    for (const [userId, ws] of this.connections) {
      if (userId !== excludeUserId) {
        if (!this.sendToUser(userId, message)) {
          failedConnections.push(userId);
        }
      }
    }

    // Fix: Clean up failed connections
    failedConnections.forEach(userId => {
      const ws = this.connections.get(userId);
      if (ws) {
        this.removeConnection(userId, ws);
      }
    });
  }

  // Fix: Add proper cleanup method
  cleanup() {
    console.log('Cleaning up WebSocket connections...');

    // Close all connections
    for (const [userId, ws] of this.connections) {
      try {
        if (ws.readyState === ws.OPEN) {
          ws.close(1000, 'Server shutdown');
        }
        ws.removeAllListeners();
      } catch (error) {
        console.error(`Error closing connection for user ${userId}:`, error);
      }
    }

    this.connections.clear();
    this.reconnectAttempts.clear();

    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    // Remove all event listeners
    this.removeAllListeners();
  }

  handleProcessExit() {
    this.cleanup();
    process.exit(0);
  }

  // Fix: Improved heartbeat mechanism
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      const deadConnections = [];

      for (const [userId, ws] of this.connections) {
        if (ws.readyState !== ws.OPEN) {
          deadConnections.push({ userId, ws });
        } else {
          try {
            ws.ping();
          } catch (error) {
            console.error(`Error pinging user ${userId}:`, error);
            deadConnections.push({ userId, ws });
          }
        }
      }

      // Clean up dead connections
      deadConnections.forEach(({ userId, ws }) => {
        this.removeConnection(userId, ws);
      });
    }, 30000); // Ping every 30 seconds
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  getConnectionCount() {
    return this.connections.size;
  }

  getConnectedUsers() {
    return Array.from(this.connections.keys());
  }
}

module.exports = WebSocketManager;
import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // Map to store authenticated clients
  }

  initialize(server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/'
    });

    this.wss.on('connection', (ws, req) => {
      console.log('📡 New WebSocket connection established');
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          
          if (data.type === 'authenticate') {
            this.authenticateClient(ws, data.token);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
          ws.close(1000, 'Invalid message format');
        }
      });

      ws.on('close', () => {
        console.log('📡 WebSocket connection closed');
        this.removeClient(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        this.removeClient(ws);
      });
    });

    console.log('🔌 WebSocket server initialized');
  }

  authenticateClient(ws, token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Store authenticated client
      this.clients.set(ws, {
        userId: decoded.id,
        role: decoded.type,
        authenticatedAt: new Date()
      });

      console.log(`✅ Client authenticated: ${decoded.type} (${decoded.id})`);
      
      // Send authentication success
      ws.send(JSON.stringify({
        type: 'auth_success',
        message: 'Authentication successful'
      }));

    } catch (error) {
      console.error('❌ WebSocket authentication failed:', error);
      ws.send(JSON.stringify({
        type: 'auth_error',
        message: 'Authentication failed'
      }));
      ws.close(1000, 'Authentication failed');
    }
  }

  removeClient(ws) {
    if (this.clients.has(ws)) {
      const client = this.clients.get(ws);
      console.log(`📡 Removing authenticated client: ${client.role} (${client.userId})`);
      this.clients.delete(ws);
    }
  }

  // Broadcast new email notification to all authenticated clients
  broadcastNewEmail(emailData) {
    const message = JSON.stringify({
      type: 'new_email',
      email: emailData,
      timestamp: new Date().toISOString()
    });

    let broadcastCount = 0;
    this.clients.forEach((client, ws) => {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(message);
          broadcastCount++;
        } catch (error) {
          console.error('❌ Error broadcasting to client:', error);
          this.removeClient(ws);
        }
      }
    });

    console.log(`📧 Broadcasted new email notification to ${broadcastCount} connected clients`);
  }

  // Broadcast new chat request to support team (SuperUser and TeamMember)
  broadcastChatRequest(chatData) {
    const message = JSON.stringify(chatData);
    let broadcastCount = 0;

    this.clients.forEach((client, ws) => {
      if (ws.readyState === ws.OPEN) {
        // Only send to SuperUser and TeamMember clients
        if (['super_user', 'team_member'].includes(client.role)) {
          try {
            ws.send(message);
            broadcastCount++;
          } catch (error) {
            console.error('❌ Error broadcasting chat request to client:', error);
            this.removeClient(ws);
          }
        }
      }
    });

    console.log(`💬 Broadcasted chat request to ${broadcastCount} support team members`);
  }

  // Broadcast new chat message to session participants
  broadcastChatMessage(messageData) {
    const message = JSON.stringify(messageData);
    let broadcastCount = 0;

    this.clients.forEach((client, ws) => {
      if (ws.readyState === ws.OPEN) {
        // Send to all authenticated clients - they will filter on the frontend
        try {
          ws.send(message);
          broadcastCount++;
        } catch (error) {
          console.error('❌ Error broadcasting chat message to client:', error);
          this.removeClient(ws);
        }
      }
    });

    console.log(`💬 Broadcasted chat message to ${broadcastCount} connected clients`);
  }

  // Broadcast chat acceptance notification
  broadcastChatAccepted(acceptanceData) {
    const message = JSON.stringify(acceptanceData);
    let broadcastCount = 0;

    this.clients.forEach((client, ws) => {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(message);
          broadcastCount++;
        } catch (error) {
          console.error('❌ Error broadcasting chat acceptance to client:', error);
          this.removeClient(ws);
        }
      }
    });

    console.log(`✅ Broadcasted chat acceptance to ${broadcastCount} connected clients`);
  }

  // Broadcast chat closure notification
  broadcastChatClosed(closureData) {
    const message = JSON.stringify(closureData);
    let broadcastCount = 0;

    this.clients.forEach((client, ws) => {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(message);
          broadcastCount++;
        } catch (error) {
          console.error('❌ Error broadcasting chat closure to client:', error);
          this.removeClient(ws);
        }
      }
    });

    console.log(`🔒 Broadcasted chat closure to ${broadcastCount} connected clients`);
  }

  // Broadcast typing indicator
  broadcastTypingIndicator(typingData) {
    const message = JSON.stringify(typingData);
    let broadcastCount = 0;

    this.clients.forEach((client, ws) => {
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(message);
          broadcastCount++;
        } catch (error) {
          console.error('❌ Error broadcasting typing indicator to client:', error);
          this.removeClient(ws);
        }
      }
    });

    console.log(`⌨️ Broadcasted typing indicator to ${broadcastCount} connected clients`);
  }

  // Send message to specific user
  sendToUser(userId, userRole, messageData) {
    const message = JSON.stringify(messageData);
    let sentCount = 0;

    this.clients.forEach((client, ws) => {
      if (ws.readyState === ws.OPEN && 
          client.userId.toString() === userId.toString() && 
          client.role === userRole) {
        try {
          ws.send(message);
          sentCount++;
        } catch (error) {
          console.error('❌ Error sending message to specific user:', error);
          this.removeClient(ws);
        }
      }
    });

    console.log(`📤 Sent message to ${sentCount} client(s) for user ${userId}`);
    return sentCount > 0;
  }

  // Send message to multiple users
  sendToUsers(userList, messageData) {
    const message = JSON.stringify(messageData);
    let sentCount = 0;

    this.clients.forEach((client, ws) => {
      if (ws.readyState === ws.OPEN) {
        const targetUser = userList.find(user => 
          client.userId.toString() === user.userId.toString() && 
          client.role === user.userRole
        );
        
        if (targetUser) {
          try {
            ws.send(message);
            sentCount++;
          } catch (error) {
            console.error('❌ Error sending message to user:', error);
            this.removeClient(ws);
          }
        }
      }
    });

    console.log(`📤 Sent message to ${sentCount} client(s) from user list of ${userList.length}`);
    return sentCount;
  }

  // Get connected clients count
  getConnectedClientsCount() {
    return this.clients.size;
  }

  // Get authenticated clients info
  getClientsInfo() {
    const clientsInfo = [];
    this.clients.forEach((client, ws) => {
      if (ws.readyState === ws.OPEN) {
        clientsInfo.push({
          userId: client.userId,
          role: client.role,
          authenticatedAt: client.authenticatedAt,
          readyState: ws.readyState
        });
      }
    });
    return clientsInfo;
  }
}

// Create singleton instance
const websocketService = new WebSocketService();

export default websocketService;
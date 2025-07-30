# Frontend Notification Integration Guide

## Overview

This guide provides step-by-step instructions for integrating the notification system into the frontend for both Super Users and Agencies. The system uses API polling (no WebSocket required) and provides Facebook-style notifications.

## API Endpoints Reference

### Base URL

```
http://localhost:4000/api/v1/notifications
```

### Authentication

All requests require Bearer token authentication:

```javascript
headers: {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
}
```

### Available Endpoints

1. **Get Notifications**

   ```
   GET /api/v1/notifications?status=Unread&limit=50&skip=0&sortBy=createdAt&sortOrder=-1
   ```

2. **Get Unread Count**

   ```
   GET /api/v1/notifications/unread-count
   ```

3. **Mark Notification as Read**

   ```
   PATCH /api/v1/notifications/:notificationId/read
   ```

4. **Mark All as Read**

   ```
   PATCH /api/v1/notifications/mark-all-read
   ```

5. **Archive Notification**

   ```
   PATCH /api/v1/notifications/:notificationId/archive
   ```

6. **Delete Notification**

   ```
   DELETE /api/v1/notifications/:notificationId
   ```

7. **Send Test Notification**
   ```
   POST /api/v1/notifications/test
   Body: { "title": "Test", "message": "Test message", "type": "GENERAL" }
   ```

## Frontend Implementation

### 1. Notification Service (JavaScript/TypeScript)

Create a notification service to handle API calls:

```javascript
// services/notificationService.js
class NotificationService {
  constructor(baseURL = "http://localhost:4000/api/v1") {
    this.baseURL = baseURL;
  }

  // Get auth token from localStorage or context
  getAuthToken() {
    return localStorage.getItem("token") || sessionStorage.getItem("token");
  }

  // Get notifications
  async getNotifications(options = {}) {
    const {
      status = null,
      limit = 50,
      skip = 0,
      sortBy = "createdAt",
      sortOrder = -1,
    } = options;

    const params = new URLSearchParams({
      limit: limit.toString(),
      skip: skip.toString(),
      sortBy,
      sortOrder: sortOrder.toString(),
    });

    if (status) {
      params.append("status", status);
    }

    const response = await fetch(`${this.baseURL}/notifications?${params}`, {
      headers: {
        Authorization: `Bearer ${this.getAuthToken()}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch notifications");
    }

    return await response.json();
  }

  // Get unread count
  async getUnreadCount() {
    const response = await fetch(`${this.baseURL}/notifications/unread-count`, {
      headers: {
        Authorization: `Bearer ${this.getAuthToken()}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch unread count");
    }

    return await response.json();
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    const response = await fetch(
      `${this.baseURL}/notifications/${notificationId}/read`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to mark notification as read");
    }

    return await response.json();
  }

  // Mark all notifications as read
  async markAllAsRead() {
    const response = await fetch(
      `${this.baseURL}/notifications/mark-all-read`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to mark all notifications as read");
    }

    return await response.json();
  }

  // Archive notification
  async archiveNotification(notificationId) {
    const response = await fetch(
      `${this.baseURL}/notifications/${notificationId}/archive`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to archive notification");
    }

    return await response.json();
  }

  // Delete notification
  async deleteNotification(notificationId) {
    const response = await fetch(
      `${this.baseURL}/notifications/${notificationId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.getAuthToken()}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to delete notification");
    }

    return await response.json();
  }
}

export default new NotificationService();
```

### 2. Notification Context (React)

Create a React context to manage notification state:

```javascript
// contexts/NotificationContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import notificationService from "../services/notificationService";

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider"
    );
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch notifications
  const fetchNotifications = async (options = {}) => {
    try {
      setLoading(true);
      setError(null);
      const response = await notificationService.getNotifications(options);
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch (err) {
      setError(err.message);
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch unread count only
  const fetchUnreadCount = async () => {
    try {
      const response = await notificationService.getUnreadCount();
      setUnreadCount(response.data.unreadCount);
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                status: "Read",
                readAt: new Date().toISOString(),
              }
            : notification
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((notification) => ({
          ...notification,
          status: "Read",
          readAt: new Date().toISOString(),
        }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err);
    }
  };

  // Archive notification
  const archiveNotification = async (notificationId) => {
    try {
      await notificationService.archiveNotification(notificationId);
      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== notificationId)
      );
      // Update unread count if the archived notification was unread
      const archivedNotification = notifications.find(
        (n) => n.id === notificationId
      );
      if (archivedNotification && archivedNotification.status === "Unread") {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to archive notification:", err);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);
      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== notificationId)
      );
      // Update unread count if the deleted notification was unread
      const deletedNotification = notifications.find(
        (n) => n.id === notificationId
      );
      if (deletedNotification && deletedNotification.status === "Unread") {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  // Poll for new notifications
  useEffect(() => {
    // Initial fetch
    fetchNotifications();

    // Set up polling every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const value = {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    archiveNotification,
    deleteNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
```

### 3. Notification Badge Component

Create a notification badge component:

```javascript
// components/NotificationBadge.js
import React from "react";
import { useNotifications } from "../contexts/NotificationContext";

const NotificationBadge = ({ onClick }) => {
  const { unreadCount } = useNotifications();

  if (unreadCount === 0) {
    return null;
  }

  return (
    <div
      className="notification-badge"
      onClick={onClick}
      style={{
        position: "relative",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: "-8px",
          right: "-8px",
          backgroundColor: "#ff4757",
          color: "white",
          borderRadius: "50%",
          width: "20px",
          height: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          fontWeight: "bold",
          minWidth: "20px",
        }}
      >
        {unreadCount > 99 ? "99+" : unreadCount}
      </span>
    </div>
  );
};

export default NotificationBadge;
```

### 4. Notification Dropdown Component

Create a notification dropdown component:

```javascript
// components/NotificationDropdown.js
import React, { useState, useRef, useEffect } from "react";
import { useNotifications } from "../contexts/NotificationContext";

const NotificationDropdown = ({ isOpen, onClose }) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    archiveNotification,
  } = useNotifications();

  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleNotificationClick = (notification) => {
    if (notification.status === "Unread") {
      markAsRead(notification.id);
    }
    // Handle navigation based on notification type
    handleNotificationNavigation(notification);
  };

  const handleNotificationNavigation = (notification) => {
    switch (notification.type) {
      case "JOB_CREATED":
      case "COMPLIANCE_DUE":
        // Navigate to jobs page or specific job
        if (notification.data?.jobId) {
          window.location.href = `/jobs/${notification.data.jobId}`;
        }
        break;
      case "JOB_ASSIGNED":
        // Navigate to assigned jobs
        window.location.href = "/jobs?filter=assigned";
        break;
      default:
        // Default navigation
        break;
    }
    onClose();
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Urgent":
        return "#ff4757";
      case "High":
        return "#ff6b35";
      case "Medium":
        return "#ffa502";
      case "Low":
        return "#2ed573";
      default:
        return "#747d8c";
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      style={{
        position: "absolute",
        top: "100%",
        right: 0,
        width: "400px",
        maxHeight: "500px",
        backgroundColor: "white",
        border: "1px solid #ddd",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 1000,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid #eee",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>
          Notifications
        </h3>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            style={{
              background: "none",
              border: "none",
              color: "#007bff",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div style={{ maxHeight: "400px", overflowY: "auto" }}>
        {notifications.length === 0 ? (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              color: "#666",
            }}
          >
            No notifications
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid #f0f0f0",
                cursor: "pointer",
                backgroundColor:
                  notification.status === "Unread" ? "#f8f9fa" : "white",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = "#f0f0f0";
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor =
                  notification.status === "Unread" ? "#f8f9fa" : "white";
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                {/* Priority indicator */}
                <div
                  style={{
                    width: "4px",
                    height: "100%",
                    backgroundColor: getPriorityColor(notification.priority),
                    borderRadius: "2px",
                    flexShrink: 0,
                  }}
                />

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "4px",
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        fontSize: "14px",
                        fontWeight:
                          notification.status === "Unread" ? "600" : "400",
                        color:
                          notification.status === "Unread" ? "#000" : "#666",
                      }}
                    >
                      {notification.title}
                    </h4>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#999",
                      }}
                    >
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      fontSize: "13px",
                      color: "#666",
                      lineHeight: "1.4",
                    }}
                  >
                    {notification.message}
                  </p>

                  {notification.status === "Unread" && (
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        backgroundColor: "#007bff",
                        borderRadius: "50%",
                        marginTop: "8px",
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid #eee",
          textAlign: "center",
        }}
      >
        <button
          onClick={() => (window.location.href = "/notifications")}
          style={{
            background: "none",
            border: "none",
            color: "#007bff",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          View all notifications
        </button>
      </div>
    </div>
  );
};

export default NotificationDropdown;
```

### 5. Main Notification Component

Create the main notification component that combines badge and dropdown:

```javascript
// components/NotificationBell.js
import React, { useState } from "react";
import { useNotifications } from "../contexts/NotificationContext";
import NotificationBadge from "./NotificationBadge";
import NotificationDropdown from "./NotificationDropdown";

const NotificationBell = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { unreadCount } = useNotifications();

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <div onClick={toggleDropdown} style={{ cursor: "pointer" }}>
        <NotificationBadge onClick={toggleDropdown} />
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      </div>

      <NotificationDropdown isOpen={isDropdownOpen} onClose={closeDropdown} />
    </div>
  );
};

export default NotificationBell;
```

### 6. App Integration

Integrate the notification system into your main app:

```javascript
// App.js or main layout component
import React from "react";
import { NotificationProvider } from "./contexts/NotificationContext";
import NotificationBell from "./components/NotificationBell";

const App = () => {
  return (
    <NotificationProvider>
      <div className="app">
        {/* Header */}
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px",
            borderBottom: "1px solid #eee",
          }}
        >
          <h1>RentalEase CRM</h1>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <NotificationBell />
            {/* Other header items */}
          </div>
        </header>

        {/* Main content */}
        <main>{/* Your app content */}</main>
      </div>
    </NotificationProvider>
  );
};

export default App;
```

### 7. CSS Styles (Optional)

Add custom CSS for better styling:

```css
/* styles/notifications.css */
.notification-badge {
  position: relative;
  display: inline-block;
}

.notification-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: 400px;
  max-height: 500px;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
}

.notification-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s;
}

.notification-item:hover {
  background-color: #f0f0f0;
}

.notification-item.unread {
  background-color: #f8f9fa;
}

.notification-item.unread:hover {
  background-color: #e9ecef;
}

.notification-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.notification-message {
  font-size: 13px;
  color: #666;
  line-height: 1.4;
}

.notification-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.notification-unread-indicator {
  width: 8px;
  height: 8px;
  background-color: #007bff;
  border-radius: 50%;
  margin-top: 8px;
}
```

## Implementation Steps for AI Agent

### Step 1: Create Service Layer

1. Create `services/notificationService.js`
2. Implement all API methods
3. Add proper error handling

### Step 2: Create Context

1. Create `contexts/NotificationContext.js`
2. Implement state management
3. Add polling mechanism

### Step 3: Create Components

1. Create `components/NotificationBadge.js`
2. Create `components/NotificationDropdown.js`
3. Create `components/NotificationBell.js`

### Step 4: Integrate into App

1. Wrap app with `NotificationProvider`
2. Add `NotificationBell` to header
3. Test functionality

### Step 5: Add Styling

1. Add CSS styles
2. Customize appearance
3. Test responsive design

## Testing Checklist

- [ ] Notifications load on app start
- [ ] Unread count updates correctly
- [ ] Polling works every 30 seconds
- [ ] Mark as read functionality works
- [ ] Mark all as read works
- [ ] Archive/delete notifications work
- [ ] Notification navigation works
- [ ] Badge shows correct count
- [ ] Dropdown opens/closes properly
- [ ] Responsive design works
- [ ] Error handling works

## Troubleshooting

### Common Issues:

1. **CORS Errors**: Ensure backend allows frontend domain
2. **Authentication Errors**: Check token format and expiration
3. **Polling Not Working**: Check network connectivity and API endpoints
4. **Badge Not Updating**: Verify context is properly connected
5. **Dropdown Not Opening**: Check z-index and positioning

### Debug Commands:

```javascript
// Test API directly
fetch("http://localhost:4000/api/v1/notifications/unread-count", {
  headers: { Authorization: "Bearer YOUR_TOKEN" },
})
  .then((r) => r.json())
  .then(console.log);

// Check context state
console.log("Notifications:", notifications);
console.log("Unread count:", unreadCount);
```

This implementation provides a complete, production-ready notification system that works for both Super Users and Agencies with proper error handling, polling, and user experience features.

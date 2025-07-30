# Notification System Documentation

## Overview

The notification system provides Facebook-style in-app notifications for agencies and super users. It automatically sends notifications when jobs are created (both manually and through compliance cron jobs) and provides APIs to manage notifications.

## Features

- **In-App Notifications**: Facebook-style notifications stored in database
- **Automatic Job Notifications**: Sent when jobs are created manually or through cron jobs
- **Multi-Recipient Support**: Notifications sent to agencies and super users
- **Status Management**: Mark as read, archive, and delete notifications
- **Extensible Design**: Ready for future email/SMS integration
- **Real-time Ready**: Works with API polling (no WebSocket required)

## Database Schema

### Notification Model

```javascript
{
  recipient: {
    recipientType: "Agency" | "SuperUser",
    recipientId: ObjectId
  },
  type: "JOB_CREATED" | "JOB_ASSIGNED" | "JOB_COMPLETED" | "COMPLIANCE_DUE" | "SYSTEM_ALERT" | "GENERAL",
  title: String,
  message: String,
  data: Object, // Additional data
  status: "Unread" | "Read" | "Archived",
  priority: "Low" | "Medium" | "High" | "Urgent",
  readAt: Date,
  expiresAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

## API Endpoints

### Get Notifications

```
GET /api/v1/notifications
```

**Query Parameters:**

- `status`: Filter by status (Unread, Read, Archived)
- `limit`: Number of notifications to return (default: 50)
- `skip`: Number of notifications to skip (default: 0)
- `sortBy`: Field to sort by (default: createdAt)
- `sortOrder`: Sort order (-1 for desc, 1 for asc, default: -1)

**Response:**

```json
{
  "status": "success",
  "message": "Notifications retrieved successfully",
  "data": {
    "notifications": [...],
    "unreadCount": 5,
    "pagination": {
      "limit": 50,
      "skip": 0,
      "total": 25
    }
  }
}
```

### Get Unread Count

```
GET /api/v1/notifications/unread-count
```

**Response:**

```json
{
  "status": "success",
  "message": "Unread count retrieved successfully",
  "data": {
    "unreadCount": 5
  }
}
```

### Mark Notification as Read

```
PATCH /api/v1/notifications/:notificationId/read
```

**Response:**

```json
{
  "status": "success",
  "message": "Notification marked as read",
  "data": {
    "notification": {...}
  }
}
```

### Mark All Notifications as Read

```
PATCH /api/v1/notifications/mark-all-read
```

**Response:**

```json
{
  "status": "success",
  "message": "All notifications marked as read",
  "data": {
    "modifiedCount": 10
  }
}
```

### Archive Notification

```
PATCH /api/v1/notifications/:notificationId/archive
```

### Delete Notification

```
DELETE /api/v1/notifications/:notificationId
```

### Send Test Notification

```
POST /api/v1/notifications/test
```

**Body:**

```json
{
  "title": "Test Notification",
  "message": "This is a test notification",
  "type": "GENERAL"
}
```

## Integration Points

### Job Creation (Manual)

When a job is created manually through the API, notifications are automatically sent to:

- The agency that owns the job
- All super users

**Location:** `src/routes/job.routes.js`

```javascript
// Send notification to agency and super users about job creation
try {
  const property = await Property.findById(property).populate("address");
  const creator = getUserInfo(req);

  if (property && creator) {
    // Send notification asynchronously (don't wait for it)
    notificationService.sendJobCreationNotification(job, property, creator);
  }
} catch (notificationError) {
  // Log error but don't fail the job creation
  console.error("Failed to send job creation notification:", {
    jobId: job._id,
    error: notificationError.message,
    timestamp: new Date().toISOString(),
  });
}
```

### Compliance Job Creation (Cron Job)

When compliance jobs are created automatically by the cron job, notifications are sent to:

- The agency that owns the property
- All super users

**Location:** `src/services/complianceCronJob.js`

```javascript
// Send notification for compliance job creation
try {
  await notificationService.sendComplianceJobNotification(newJob, property);
} catch (notificationError) {
  // Log error but don't fail the job creation
  console.error("Failed to send compliance job notification:", {
    jobId: newJob._id,
    propertyId: property._id,
    error: notificationError.message,
    timestamp: new Date().toISOString(),
  });
}
```

## Notification Types

### JOB_CREATED

- **Triggered by:** Manual job creation
- **Recipients:** Agency owner + All super users
- **Title:** "New [JobType] Job Created"
- **Message:** "A new [JobType] job has been created for property at [Address]. Due date: [Date]"

### COMPLIANCE_DUE

- **Triggered by:** Compliance cron job
- **Recipients:** Agency owner + All super users
- **Title:** "Compliance [JobType] Due"
- **Message:** "A compliance [JobType] inspection is due for property at [Address]. Due date: [Date]"

### JOB_ASSIGNED

- **Triggered by:** Job assignment to technician
- **Recipients:** Assigned technician
- **Title:** "Job Assigned"
- **Message:** "You have been assigned a [JobType] job for property at [Address]"

### JOB_COMPLETED

- **Triggered by:** Job completion
- **Recipients:** Agency owner + All super users
- **Title:** "Job Completed"
- **Message:** "A [JobType] job has been completed for property at [Address]"

### SYSTEM_ALERT

- **Triggered by:** System events
- **Recipients:** All super users
- **Title:** "System Alert"
- **Message:** System alert message

### GENERAL

- **Triggered by:** Manual or system events
- **Recipients:** Specified recipients
- **Title:** Custom title
- **Message:** Custom message

## Frontend Integration

### Polling for Notifications

Since we're not using WebSockets, the frontend should poll for new notifications:

```javascript
// Poll for notifications every 30 seconds
setInterval(async () => {
  try {
    const response = await fetch("/api/v1/notifications/unread-count", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();

    if (data.data.unreadCount > 0) {
      // Update notification badge
      updateNotificationBadge(data.data.unreadCount);

      // Optionally fetch full notifications
      const notificationsResponse = await fetch(
        "/api/v1/notifications?limit=10"
      );
      const notificationsData = await notificationsResponse.json();
      updateNotificationsList(notificationsData.data.notifications);
    }
  } catch (error) {
    console.error("Failed to poll notifications:", error);
  }
}, 30000);
```

### Notification Badge

Display unread count in the UI:

```javascript
const updateNotificationBadge = (count) => {
  const badge = document.getElementById("notification-badge");
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = "block";
  } else {
    badge.style.display = "none";
  }
};
```

### Notification List

Display notifications in a dropdown or sidebar:

```javascript
const updateNotificationsList = (notifications) => {
  const container = document.getElementById("notifications-list");
  container.innerHTML = notifications
    .map(
      (notification) => `
    <div class="notification-item ${
      notification.status === "Unread" ? "unread" : ""
    }">
      <div class="notification-title">${notification.title}</div>
      <div class="notification-message">${notification.message}</div>
      <div class="notification-time">${new Date(
        notification.createdAt
      ).toLocaleString()}</div>
    </div>
  `
    )
    .join("");
};
```

## Future Enhancements

### Email Integration

The system is designed to easily add email notifications:

```javascript
// In notification.service.js
async sendEmailNotification(recipient, notificationData) {
  const user = await this.getUserById(recipient.recipientType, recipient.recipientId);

  await emailService.sendNotificationEmail({
    to: user.email,
    subject: notificationData.title,
    message: notificationData.message,
    data: notificationData.data
  });
}
```

### SMS Integration

Similarly for SMS:

```javascript
// In notification.service.js
async sendSMSNotification(recipient, notificationData) {
  const user = await this.getUserById(recipient.recipientType, recipient.recipientId);

  await smsService.sendNotificationSMS({
    to: user.phone,
    message: notificationData.message
  });
}
```

### WebSocket Integration

For real-time notifications, add WebSocket support:

```javascript
// In notification.service.js
async sendWebSocketNotification(recipient, notificationData) {
  const io = require('socket.io');

  io.to(`user-${recipient.recipientType}-${recipient.recipientId}`).emit('notification', {
    type: notificationData.type,
    title: notificationData.title,
    message: notificationData.message,
    data: notificationData.data
  });
}
```

## Testing

### Run Test Script

```bash
node src/examples/testNotificationSystem.js
```

This will:

1. Send test notifications to agencies and super users
2. Test notification retrieval
3. Test marking notifications as read
4. Display results

### Manual Testing

1. **Create a job** through the API to trigger job creation notifications
2. **Trigger compliance check** to create compliance job notifications
3. **Use the notification endpoints** to retrieve and manage notifications

## Error Handling

The notification system is designed to be non-blocking:

- Notification failures don't prevent job creation
- All notification errors are logged but don't throw exceptions
- The system continues to function even if notifications fail

## Performance Considerations

- Notifications are sent asynchronously
- Database indexes optimize notification queries
- TTL index automatically removes expired notifications
- Pagination prevents loading too many notifications at once

## Security

- All notification endpoints require authentication
- Users can only access their own notifications
- Notification data is validated before storage
- No sensitive information is stored in notification messages

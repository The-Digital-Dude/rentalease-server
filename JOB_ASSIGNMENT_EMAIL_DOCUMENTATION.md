# Job Assignment Email Notifications

## Overview

This document describes the job assignment email notification feature implemented in the RentalEase CRM backend. When a technician is assigned to a job, they will automatically receive an email notification with all the relevant job details.

## Features

### Email Notifications Sent When:
1. **Creating a new job** with an assigned technician
2. **Updating an existing job** to assign a technician (newly assigned)
3. **Updating an existing job** to reassign to a different technician
4. **Using the dedicated assignment endpoint** to assign a technician to a job

### Email Content Includes:
- 📋 **Job Details**: Job ID, property address, job type, due date, priority
- ⏱️ **Timing Information**: Estimated duration (if provided)
- 📝 **Descriptions**: Job description and additional notes (if provided)
- 👤 **Assignment Information**: Who assigned the job and their role
- 🔧 **Professional Reminders**: Safety requirements, documentation, status updates

## Implementation Details

### Files Modified:

#### 1. Email Template (`src/utils/emailTemplates.js`)
- Added `jobAssignmentTemplate` function
- Creates a professional, detailed email with:
  - Clear job information table
  - Priority-based color coding
  - Conditional sections for description and notes
  - Special urgent job handling
  - Professional reminders and next steps

#### 2. Email Service (`src/services/email.service.js`)
- Added `sendJobAssignmentEmail` method
- Handles email sending with proper error handling
- Formats due dates for better readability
- Validates all required data before sending

#### 3. Job Routes (`src/routes/job.routes.js`)
- Added email service import
- Added helper functions:
  - `getUserInfo()`: Gets user information for email context
  - `sendJobAssignmentNotification()`: Handles email sending with error logging
- Modified three endpoints to send notifications:
  - `POST /` (Create job)
  - `PUT /:id` (Update job)
  - `PATCH /:id/assign` (Assign job)

### Email Scenarios Handled:

#### 1. New Job Creation with Assignment
```javascript
// When creating a job with assignedTechnician
POST /api/v1/jobs
{
  "propertyAddress": "123 Main St",
  "jobType": "Electrical",
  "assignedTechnician": "technicianId",
  // ... other fields
}
```

#### 2. Job Update with New Assignment
```javascript
// When updating a job to assign a technician
PUT /api/v1/jobs/:id
{
  "assignedTechnician": "technicianId"
}
```

#### 3. Job Reassignment
```javascript
// When changing technician assignment
PUT /api/v1/jobs/:id
{
  "assignedTechnician": "newTechnicianId"
}
```

#### 4. Direct Assignment
```javascript
// Using dedicated assignment endpoint
PATCH /api/v1/jobs/:id/assign
{
  "technicianId": "technicianId"
}
```

## Email Template Features

### Dynamic Content
- **Job Type Badge**: Color-coded job type display
- **Priority Indicators**: Different colors and urgency levels
- **Conditional Sections**: Description and notes only show if provided
- **Urgent Job Alerts**: Special styling and messaging for urgent jobs
- **Professional Layout**: Clean, mobile-friendly design

### Color Coding
- **Priority Colors**:
  - Urgent: Red (#f44336)
  - High: Orange (#ff9800)
  - Medium: Blue (#2196f3)
  - Low: Green (#4caf50)

### Professional Elements
- Company branding header
- Clear contact information
- Professional reminders checklist
- Responsive design for mobile devices

## Error Handling

### Robust Error Management
- **Non-blocking**: Email failures don't prevent job assignment
- **Detailed Logging**: Comprehensive error and success logging
- **Graceful Degradation**: System continues to function if email service is unavailable

### Validation
- Validates technician data (email, name)
- Validates job data (ID, address, type, due date, priority)
- Validates assigner data (name, type)

## Usage Examples

### Creating a Job with Assignment
```javascript
const response = await fetch('/api/v1/jobs', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    propertyAddress: '123 Main Street, City',
    jobType: 'Gas',
    dueDate: '2024-02-15',
    assignedTechnician: '65abc123456789',
    priority: 'High',
    description: 'Gas leak inspection required',
    estimatedDuration: 2,
    notes: 'Customer will be home after 2 PM'
  })
});
```

### Assigning a Job to Technician
```javascript
const response = await fetch('/api/v1/jobs/65def456789012/assign', {
  method: 'PATCH',
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    technicianId: '65abc123456789'
  })
});
```

## Security & Permissions

### Access Control
- Only authenticated users can assign jobs
- Super Users can assign any job
- Property Managers can only assign jobs they own
- Technicians must belong to the same organization as the job

### Data Privacy
- Email addresses are validated before sending
- Only authorized users can trigger notifications
- Personal information is handled securely

## Monitoring & Logging

### Success Logging
```javascript
{
  jobId: 'J-123456',
  technicianEmail: 'tech@example.com',
  technicianName: 'John Smith',
  assignedBy: 'Admin User',
  timestamp: '2024-01-15T10:30:00.000Z'
}
```

### Error Logging
```javascript
{
  jobId: 'J-123456',
  technicianEmail: 'tech@example.com',
  technicianName: 'John Smith',
  assignedBy: 'Admin User',
  error: 'Failed to send email: Invalid API key',
  timestamp: '2024-01-15T10:30:00.000Z'
}
```

## Future Enhancements

### Potential Improvements
1. **Email Preferences**: Allow technicians to opt-out of notifications
2. **SMS Notifications**: Add SMS backup for urgent jobs
3. **Push Notifications**: Mobile app integration
4. **Email Templates**: Multiple template options for different job types
5. **Scheduling**: Delayed sending for future-dated jobs
6. **Read Receipts**: Track if emails are opened
7. **Reminder Emails**: Follow-up notifications for approaching due dates

## Configuration

### Environment Variables Required
```env
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@yourcompany.com
```

### Email Service Provider
Currently uses Resend for email delivery. The service can be easily swapped by modifying the email service configuration.

## Testing

### Manual Testing Steps
1. Create a job with an assigned technician
2. Check technician's email inbox
3. Verify email content and formatting
4. Test error scenarios (invalid email, missing data)
5. Test reassignment scenarios

### API Testing with Postman
Collection should include:
- Job creation with assignment
- Job update with assignment
- Job reassignment
- Direct assignment endpoint

## Conclusion

The job assignment email notification system provides a professional, reliable way to keep technicians informed about their assignments. The implementation is robust, with proper error handling and comprehensive logging to ensure system reliability. 
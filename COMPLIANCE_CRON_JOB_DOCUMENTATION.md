# Compliance Cron Job Documentation

## Overview

The Compliance Cron Job system automatically creates jobs for property compliance inspections based on the compliance schedule. It monitors properties for upcoming compliance requirements and creates appropriate jobs when inspections are due within 15 days.

## Features

- **Automatic Job Creation**: Creates jobs for Gas, Electrical, and Smoke Alarm compliance inspections
- **Duplicate Prevention**: Prevents creating duplicate jobs for the same property and compliance type
- **Scheduled Execution**: Runs daily at 2:00 AM (Australia/Sydney timezone)
- **Manual Trigger**: API endpoint to manually trigger compliance checks
- **Graceful Shutdown**: Properly stops cron jobs when server shuts down

## How It Works

### Compliance Types Monitored

1. **Gas Compliance** (`gasCompliance`)
2. **Electrical Safety** (`electricalSafety`)
3. **Smoke Alarms** (`smokeAlarms`)

### Job Creation Logic

The system creates jobs when:

- A property's compliance inspection is due within 15 days
- The compliance type is marked as `required: true`
- No existing job exists for the same property and compliance type
- The property is active (`isActive: true`)

### Job Details

Created jobs include:

- **Job Type**: Gas, Electrical, or Smoke (mapped from compliance type)
- **Due Date**: Set to the compliance inspection date
- **Status**: Pending
- **Priority**: High
- **Description**: Auto-generated description with property address
- **Estimated Duration**: 2 hours (default)
- **Owner**: Set to the property's agency

## Files Structure

```
src/
├── services/
│   └── complianceCronJob.js          # Main cron job service
├── routes/
│   └── compliance.routes.js          # API routes for manual triggers
├── examples/
│   └── testComplianceCron.js         # Test script
└── server/
    └── index.js                      # Server startup (integrated cron job)
```

## API Endpoints

### Manual Trigger

- **POST** `/api/v1/compliance/trigger-compliance-check`
- **Description**: Manually trigger the compliance check
- **Response**: Success/failure message

### Status Check

- **GET** `/api/v1/compliance/status`
- **Description**: Check if the cron job is running
- **Response**: Current status and running state

## Usage

### Starting the Server

The cron job automatically starts when the server starts:

```bash
npm run dev
# or
npm start
```

### Manual Testing

1. **Run the test script**:

```bash
node src/examples/testComplianceCron.js
```

2. **Use the API endpoint**:

```bash
curl -X POST http://localhost:4000/api/v1/compliance/trigger-compliance-check
```

3. **Check status**:

```bash
curl http://localhost:4000/api/v1/compliance/status
```

## Configuration

### Cron Schedule

- **Default**: Daily at 1:00 AM Bangladesh time
- **Pattern**: `0 1 * * *`
- **Timezone**: Asia/Dhaka
- **Note**: The cron job runs automatically every day at 1:00 AM Bangladesh time to check compliance schedules and create jobs

### Time Windows

- **Compliance Check**: 15 days before due date
- **Overdue Check**: Any past due dates
- **Initial Check**: 5 seconds after server startup

## Dependencies

- `node-cron`: For scheduling cron jobs
- `mongoose`: For database operations
- `express`: For API endpoints

## Installation

The required dependencies are automatically installed:

```bash
pnpm add node-cron
```

## Monitoring

### Console Logs

The system provides detailed console logs:

- `🚀 Starting compliance cron job...`
- `⏰ Running daily compliance check...`
- `🔍 Starting compliance schedule check...`
- `✅ Created [type] job for property [id]`
- `✅ Compliance check completed. Created [X] new jobs.`

### Error Handling

- Duplicate job prevention
- Database connection errors
- Invalid property data
- Graceful error recovery

## Troubleshooting

### Common Issues

1. **No jobs created**: Check if properties have compliance schedules with future dates
2. **Duplicate jobs**: System automatically prevents duplicates
3. **Timezone issues**: Ensure server timezone matches Australia/Sydney
4. **Database connection**: Verify MongoDB connection

### Debug Mode

Enable detailed logging by checking console output for:

- Property compliance schedules
- Job creation attempts
- Error messages

## Future Enhancements

- Email notifications for created jobs
- Configurable time windows
- Priority-based job creation
- Integration with external compliance systems
- Dashboard for monitoring compliance status

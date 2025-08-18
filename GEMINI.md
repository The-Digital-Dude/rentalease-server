# RentalEase-CRM-Server

This document provides a comprehensive overview of the RentalEase-CRM-Server, a Node.js application designed to manage properties, jobs, and various user roles within a rental management ecosystem.

## Project Overview

The RentalEase-CRM-Server is a robust backend system built with Node.js, Express, and MongoDB. It serves as the central API for the RentalEase CRM platform, handling data management, user authentication, and business logic for property, job, and user-related operations. The system is designed to support multiple user roles, including Super Users, Agencies, Property Managers, and Technicians, each with specific permissions and access levels.

## Key Features

*   **User Management:** Supports multiple user roles (Super User, Agency, Property Manager, Technician, Team Member) with a comprehensive authentication and authorization system.
*   **Property Management:** Allows for the creation, management, and assignment of properties, including detailed compliance tracking for Australian standards.
*   **Job Management:** A full-featured job management system for creating, assigning, and tracking maintenance and compliance jobs.
*   **Invoice and Payment System:** Automated creation of invoices and technician payments upon job completion.
*   **Notification System:** In-app and email notifications for key events like job creation, assignment, and completion.
*   **Calendar Integration:** Provides calendar feeds for technicians to sync their job schedules.
*   **File Uploads:** Supports file uploads to Cloudinary for job reports and other documents.
*   **Duplicate Prevention:** Built-in logic to prevent the creation of duplicate jobs and emails.

## Technologies Used

*   **Backend:** Node.js, Express.js
*   **Database:** MongoDB with Mongoose ODM
*   **Authentication:** JSON Web Tokens (JWT)
*   **File Storage:** Cloudinary
*   **Email Service:** Resend
*   **Scheduling:** node-cron for automated jobs

## Folder Structure

The project follows a standard Node.js application structure:

```
.
├── src
│   ├── config          # Configuration files (database, cloudinary, email)
│   ├── controllers     # Request handlers for routes
│   ├── examples        # Test and example scripts
│   ├── middleware      # Express middleware (authentication, security)
│   ├── models          # Mongoose models for database schemas
│   ├── routes          # API route definitions
│   ├── server          # Express server setup
│   ├── services        # Business logic and services (email, notifications, etc.)
│   └── utils           # Utility functions and helpers
├── .env              # Environment variables (not included in repo)
├── index.js          # Application entry point
└── package.json      # Project dependencies and scripts
```

## Getting Started

### Prerequisites

*   Node.js (v16 or higher)
*   pnpm (or npm/yarn)
*   MongoDB instance (local or cloud)
*   Cloudinary account
*   Resend account

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    pnpm install
    ```
3.  Create a `.env` file in the root directory and add the following environment variables:
    ```
    MONGODB_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret
    CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
    CLOUDINARY_API_KEY=your_cloudinary_api_key
    CLOUDINARY_API_SECRET=your_cloudinary_api_secret
    RESEND_API_KEY=your_resend_api_key
    EMAIL_FROM=your_default_from_email
    FRONTEND_URL=your_frontend_url
    ```

### Running the Server

*   **Development Mode:**
    ```bash
    pnpm run dev
    ```
    This will start the server with nodemon, which automatically restarts on file changes.

*   **Production Mode:**
    ```bash
    pnpm start
    ```

The server will be running on `http://localhost:4000` (or the port specified in your `.env` file).

## API Documentation

The project includes extensive API documentation in Markdown files, covering all major features:

*   `API_OVERVIEW_DOCUMENTATION.md`
*   `AUTHENTICATION_API_DOCUMENTATION.md`
*   `AGENCY_PROPERTYMANAGER_MANAGEMENT_DOCUMENTATION.md`
*   `JOB_ASSIGNMENT_API_DOCUMENTATION.md`
*   `JOB_COMPLETION_API_DOCUMENTATION.md`
*   `INVOICE_SYSTEM_API_DOCUMENTATION.md`
*   And many more...

## Database Models

The core database models are:

*   `Agency`: Manages properties and staff.
*   `Contact`: Stores contact information for various roles.
*   `EmailLog`: Tracks sent emails for compliance and notifications.
*   `Invoice`: Represents invoices for completed jobs.
*   `Job`: Defines jobs to be performed on properties.
*   `Notification`: Stores in-app notifications for users.
*   `Property`: Represents a rental property.
*   `PropertyManager`: Manages assigned properties.
*   `SuperUser`: System administrators with full access.
*   `TeamMember`: Staff members with administrative access.
*   `Technician`: Performs jobs on properties.
*   `TechnicianPayment`: Tracks payments to technicians for completed jobs.

## Testing

The `src/examples` directory contains numerous test scripts for different parts of the application. These can be run directly with Node.js to test specific functionalities. For example:

```bash
node src/examples/testJobCompletion.js
```

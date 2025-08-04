/**
 * Booking Notification Email Templates
 * Different templates for different recipient types after a tenant books an inspection
 */

/**
 * Email template for tenant booking confirmation
 * @param {Object} data - Template data
 * @param {string} data.tenantName - Tenant's name
 * @param {string} data.propertyAddress - Property address
 * @param {string} data.jobType - Type of inspection
 * @param {string} data.scheduledDate - Scheduled date and time
 * @param {string} data.jobId - Job ID
 * @param {string} data.complianceType - Type of compliance
 * @returns {Object} - Email template configuration
 */
const tenantBookingConfirmationTemplate = (data) => ({
  subject: `✅ Inspection Confirmed - ${data.propertyAddress}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #28a745; margin-bottom: 10px;">✅ Booking Confirmed!</h1>
          <div style="width: 50px; height: 3px; background-color: #28a745; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Dear ${data.tenantName},</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Your <strong>${data.jobType}</strong> inspection has been successfully scheduled! 
          We've confirmed your booking and a technician will be assigned shortly.
        </p>
        
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #155724; margin: 0 0 15px 0; font-size: 18px;">📅 Booking Details</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold; width: 40%;">Inspection Type:</td>
              <td style="padding: 8px 0; color: #333; font-weight: bold;">${data.jobType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Property Address:</td>
              <td style="padding: 8px 0; color: #333;">${data.propertyAddress}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Scheduled Date:</td>
              <td style="padding: 8px 0; color: #333;">${data.scheduledDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Booking Reference:</td>
              <td style="padding: 8px 0; color: #333; font-family: monospace;">${data.jobId}</td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #856404; margin: 0 0 10px 0; font-size: 16px;">📋 What to Expect</h4>
          <ul style="color: #856404; margin: 10px 0 0 20px; line-height: 1.6;">
            <li>You'll receive another email once a technician is assigned</li>
            <li>The technician will contact you 24 hours before the inspection</li>
            <li>Please ensure someone is available at the property during the scheduled time</li>
            <li>Clear access to all areas that need to be inspected</li>
          </ul>
        </div>
        
        <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #0c5460; margin: 0 0 10px 0; font-size: 16px;">📞 Need to Reschedule?</h4>
          <p style="color: #0c5460; margin: 0; line-height: 1.6;">
            If you need to reschedule, please contact us as soon as possible:<br>
            <strong>Email:</strong> support@rentalease-crm.com<br>
            <strong>Phone:</strong> 1300 123 456
          </p>
        </div>
        
        <p style="color: #333; margin-top: 30px;">
          Thank you for choosing RentalEase!<br>
          <strong>The RentalEase Property Management Team</strong>
        </p>
        
        <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
        <p style="font-size: 12px; color: #7f8c8d; text-align: center;">
          This is an automated confirmation. Please do not reply to this email.
        </p>
      </div>
    </div>
  `,
});

/**
 * Email template for agency notification
 * @param {Object} data - Template data
 * @param {string} data.agencyName - Agency name
 * @param {string} data.propertyAddress - Property address
 * @param {string} data.jobType - Type of inspection
 * @param {string} data.scheduledDate - Scheduled date and time
 * @param {string} data.jobId - Job ID
 * @param {string} data.tenantName - Tenant name
 * @param {string} data.tenantEmail - Tenant email
 * @returns {Object} - Email template configuration
 */
const agencyBookingNotificationTemplate = (data) => ({
  subject: `🔔 New Inspection Booking - ${data.propertyAddress}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #007bff; margin-bottom: 10px;">🔔 New Inspection Booking</h1>
          <div style="width: 50px; height: 3px; background-color: #007bff; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Hello ${data.agencyName},</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          A new <strong>${data.jobType}</strong> inspection has been booked by a tenant for one of your properties.
        </p>
        
        <div style="background-color: #e3f2fd; border: 1px solid #bbdefb; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #1565c0; margin: 0 0 15px 0; font-size: 18px;">📋 Job Details</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold; width: 40%;">Job ID:</td>
              <td style="padding: 8px 0; color: #333; font-family: monospace;">${data.jobId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Property Address:</td>
              <td style="padding: 8px 0; color: #333;">${data.propertyAddress}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Inspection Type:</td>
              <td style="padding: 8px 0; color: #333; font-weight: bold;">${data.jobType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Scheduled Date:</td>
              <td style="padding: 8px 0; color: #333;">${data.scheduledDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Tenant:</td>
              <td style="padding: 8px 0; color: #333;">${data.tenantName} (${data.tenantEmail})</td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #856404; margin: 0 0 10px 0; font-size: 16px;">📋 Next Steps</h4>
          <ul style="color: #856404; margin: 10px 0 0 20px; line-height: 1.6;">
            <li>A technician will be automatically assigned to this job</li>
            <li>You'll receive updates on job progress</li>
            <li>Inspection report will be available once completed</li>
            <li>Invoice will be generated after completion</li>
          </ul>
        </div>
        
        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>The RentalEase CRM Team</strong>
        </p>
        
        <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
        <p style="font-size: 12px; color: #7f8c8d; text-align: center;">
          This is an automated notification. Please do not reply to this email.
        </p>
      </div>
    </div>
  `,
});

/**
 * Email template for property manager notification
 * @param {Object} data - Template data
 * @param {string} data.propertyManagerName - Property manager name
 * @param {string} data.propertyAddress - Property address
 * @param {string} data.jobType - Type of inspection
 * @param {string} data.scheduledDate - Scheduled date and time
 * @param {string} data.jobId - Job ID
 * @param {string} data.tenantName - Tenant name
 * @param {string} data.tenantEmail - Tenant email
 * @returns {Object} - Email template configuration
 */
const propertyManagerBookingNotificationTemplate = (data) => ({
  subject: `🏠 New Inspection Booking - ${data.propertyAddress}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #6f42c1; margin-bottom: 10px;">🏠 New Inspection Booking</h1>
          <div style="width: 50px; height: 3px; background-color: #6f42c1; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Hello ${data.propertyManagerName},</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          A tenant has booked a <strong>${data.jobType}</strong> inspection for a property you manage.
        </p>
        
        <div style="background-color: #f3e5f5; border: 1px solid #e1bee7; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #7b1fa2; margin: 0 0 15px 0; font-size: 18px;">📋 Property Details</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold; width: 40%;">Job ID:</td>
              <td style="padding: 8px 0; color: #333; font-family: monospace;">${data.jobId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Property Address:</td>
              <td style="padding: 8px 0; color: #333;">${data.propertyAddress}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Inspection Type:</td>
              <td style="padding: 8px 0; color: #333; font-weight: bold;">${data.jobType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Scheduled Date:</td>
              <td style="padding: 8px 0; color: #333;">${data.scheduledDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Tenant:</td>
              <td style="padding: 8px 0; color: #333;">${data.tenantName} (${data.tenantEmail})</td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #856404; margin: 0 0 10px 0; font-size: 16px;">📋 Your Role</h4>
          <ul style="color: #856404; margin: 10px 0 0 20px; line-height: 1.6;">
            <li>Monitor the job progress through your dashboard</li>
            <li>Coordinate with the tenant if needed</li>
            <li>Review inspection reports once completed</li>
            <li>Address any issues that may arise</li>
          </ul>
        </div>
        
        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>The RentalEase CRM Team</strong>
        </p>
        
        <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
        <p style="font-size: 12px; color: #7f8c8d; text-align: center;">
          This is an automated notification. Please do not reply to this email.
        </p>
      </div>
    </div>
  `,
});

/**
 * Email template for landlord notification
 * @param {Object} data - Template data
 * @param {string} data.landlordName - Landlord name
 * @param {string} data.propertyAddress - Property address
 * @param {string} data.jobType - Type of inspection
 * @param {string} data.scheduledDate - Scheduled date and time
 * @param {string} data.jobId - Job ID
 * @param {string} data.tenantName - Tenant name
 * @returns {Object} - Email template configuration
 */
const landlordBookingNotificationTemplate = (data) => ({
  subject: `🏡 Inspection Scheduled - ${data.propertyAddress}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #fd7e14; margin-bottom: 10px;">🏡 Inspection Scheduled</h1>
          <div style="width: 50px; height: 3px; background-color: #fd7e14; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Dear ${data.landlordName},</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          A <strong>${data.jobType}</strong> inspection has been scheduled for your property. 
          This is a routine compliance inspection to ensure your property meets safety standards.
        </p>
        
        <div style="background-color: #fff3e0; border: 1px solid #ffcc02; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #e65100; margin: 0 0 15px 0; font-size: 18px;">📋 Property Details</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold; width: 40%;">Property Address:</td>
              <td style="padding: 8px 0; color: #333;">${data.propertyAddress}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Inspection Type:</td>
              <td style="padding: 8px 0; color: #333; font-weight: bold;">${data.jobType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Scheduled Date:</td>
              <td style="padding: 8px 0; color: #333;">${data.scheduledDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Tenant:</td>
              <td style="padding: 8px 0; color: #333;">${data.tenantName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Reference:</td>
              <td style="padding: 8px 0; color: #333; font-family: monospace;">${data.jobId}</td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #e8f5e8; border: 1px solid #c8e6c9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #2e7d32; margin: 0 0 10px 0; font-size: 16px;">ℹ️ Important Information</h4>
          <ul style="color: #2e7d32; margin: 10px 0 0 20px; line-height: 1.6;">
            <li>This is a routine compliance inspection required by law</li>
            <li>Your tenant has already confirmed their availability</li>
            <li>No action is required from you at this time</li>
            <li>You'll receive the inspection report once completed</li>
          </ul>
        </div>
        
        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>The RentalEase Property Management Team</strong>
        </p>
        
        <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
        <p style="font-size: 12px; color: #7f8c8d; text-align: center;">
          This is an automated notification. Please do not reply to this email.
        </p>
      </div>
    </div>
  `,
});

/**
 * Email template for super user notification
 * @param {Object} data - Template data
 * @param {string} data.superUserName - Super user name
 * @param {string} data.propertyAddress - Property address
 * @param {string} data.jobType - Type of inspection
 * @param {string} data.scheduledDate - Scheduled date and time
 * @param {string} data.jobId - Job ID
 * @param {string} data.tenantName - Tenant name
 * @param {string} data.agencyName - Agency name
 * @returns {Object} - Email template configuration
 */
const superUserBookingNotificationTemplate = (data) => ({
  subject: `📊 New Inspection Booking - ${data.propertyAddress}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #dc3545; margin-bottom: 10px;">📊 New Inspection Booking</h1>
          <div style="width: 50px; height: 3px; background-color: #dc3545; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Hello ${data.superUserName},</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          A new <strong>${data.jobType}</strong> inspection has been booked through the tenant portal.
        </p>
        
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #721c24; margin: 0 0 15px 0; font-size: 18px;">📋 System Activity</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold; width: 40%;">Job ID:</td>
              <td style="padding: 8px 0; color: #333; font-family: monospace;">${data.jobId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Property Address:</td>
              <td style="padding: 8px 0; color: #333;">${data.propertyAddress}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Inspection Type:</td>
              <td style="padding: 8px 0; color: #333; font-weight: bold;">${data.jobType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Scheduled Date:</td>
              <td style="padding: 8px 0; color: #333;">${data.scheduledDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Agency:</td>
              <td style="padding: 8px 0; color: #333;">${data.agencyName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Tenant:</td>
              <td style="padding: 8px 0; color: #333;">${data.tenantName}</td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #0c5460; margin: 0 0 10px 0; font-size: 16px;">📊 System Overview</h4>
          <ul style="color: #0c5460; margin: 10px 0 0 20px; line-height: 1.6;">
            <li>Job has been automatically created in the system</li>
            <li>Technician assignment will be processed automatically</li>
            <li>All stakeholders have been notified</li>
            <li>Job can be monitored through the admin dashboard</li>
          </ul>
        </div>
        
        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>The RentalEase CRM System</strong>
        </p>
        
        <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
        <p style="font-size: 12px; color: #7f8c8d; text-align: center;">
          This is an automated system notification. Please do not reply to this email.
        </p>
      </div>
    </div>
  `,
});

/**
 * Email template for available technicians notification
 * @param {Object} data - Template data
 * @param {string} data.technicianName - Technician name
 * @param {string} data.propertyAddress - Property address
 * @param {string} data.jobType - Type of inspection
 * @param {string} data.scheduledDate - Scheduled date and time
 * @param {string} data.jobId - Job ID
 * @param {string} data.estimatedDuration - Estimated duration
 * @returns {Object} - Email template configuration
 */
const technicianJobAvailableTemplate = (data) => ({
  subject: `🔧 New Job Available - ${data.jobType} Inspection`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #17a2b8; margin-bottom: 10px;">🔧 New Job Available</h1>
          <div style="width: 50px; height: 3px; background-color: #17a2b8; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Hello ${data.technicianName},</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          A new <strong>${data.jobType}</strong> inspection job is available and matches your skills and availability!
        </p>
        
        <div style="background-color: #e3f2fd; border: 1px solid #bbdefb; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #1565c0; margin: 0 0 15px 0; font-size: 18px;">📋 Job Details</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold; width: 40%;">Job ID:</td>
              <td style="padding: 8px 0; color: #333; font-family: monospace;">${data.jobId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Property Address:</td>
              <td style="padding: 8px 0; color: #333;">${data.propertyAddress}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Inspection Type:</td>
              <td style="padding: 8px 0; color: #333; font-weight: bold;">${data.jobType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Scheduled Date:</td>
              <td style="padding: 8px 0; color: #333;">${data.scheduledDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Estimated Duration:</td>
              <td style="padding: 8px 0; color: #333;">${data.estimatedDuration} hours</td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #155724; margin: 0 0 10px 0; font-size: 16px;">🎯 Claim This Job</h4>
          <p style="color: #155724; margin: 0; line-height: 1.6;">
            Log into your technician dashboard to claim this job. First come, first served!
          </p>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #856404; margin: 0 0 10px 0; font-size: 16px;">📋 Job Requirements</h4>
          <ul style="color: #856404; margin: 10px 0 0 20px; line-height: 1.6;">
            <li>Ensure you have the necessary equipment and certifications</li>
            <li>Contact the tenant 24 hours before the inspection</li>
            <li>Complete the inspection report after finishing</li>
            <li>Upload any required documentation</li>
          </ul>
        </div>
        
        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>The RentalEase CRM Team</strong>
        </p>
        
        <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
        <p style="font-size: 12px; color: #7f8c8d; text-align: center;">
          This is an automated notification. Please do not reply to this email.
        </p>
      </div>
    </div>
  `,
});

// Export all templates
const bookingNotificationTemplates = {
  tenantBookingConfirmation: tenantBookingConfirmationTemplate,
  agencyBookingNotification: agencyBookingNotificationTemplate,
  propertyManagerBookingNotification:
    propertyManagerBookingNotificationTemplate,
  landlordBookingNotification: landlordBookingNotificationTemplate,
  superUserBookingNotification: superUserBookingNotificationTemplate,
  technicianJobAvailable: technicianJobAvailableTemplate,
};

export default bookingNotificationTemplates;

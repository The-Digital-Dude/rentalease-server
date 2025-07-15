/**
 * Email template for welcoming new users
 * @param {Object} data - Template data
 * @param {string} data.name - User's name
 * @returns {Object} - Email template configuration
 */
const welcomeTemplate = (data) => ({
  subject: 'Welcome to RentalLease System From Juhan',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2>Welcome to RentalLease System, ${data.name}!</h2>
      <br>
      <p style="color: #333; line-height: 1.6;">We're excited to have you on board as a Super User.</p>
      <p style="color: #333; line-height: 1.6;">You now have access to manage and oversee the RentalLease platform. Our system provides you with powerful tools to manage properties, leases, and users efficiently.</p>
      <div style="margin: 30px 0;">
        <p style="color: #666;">If you have any questions or need assistance, please don't hesitate to reach out to our support team.</p>
      </div>
      <p style="color: #333;">Best regards,<br>The RentalLease Team</p>
    </div>
  `
});

/**
 * Email template for password reset OTP
 * @param {Object} data - Template data
 * @param {string} data.name - User's name
 * @param {string} data.otp - OTP code
 * @param {number} data.expirationMinutes - OTP expiration time in minutes
 * @returns {Object} - Email template configuration
 */
const passwordResetOTPTemplate = (data) => ({
  subject: 'Password Reset OTP - RentalLease System',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">Password Reset Request</h1>
          <div style="width: 50px; height: 3px; background-color: #007bff; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Hello ${data.name},</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          You have requested to reset your password for your RentalLease account. 
          Please use the following OTP (One-Time Password) to complete your password reset:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; background-color: #007bff; color: white; padding: 15px 30px; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px; font-family: monospace;">
            ${data.otp}
          </div>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            <strong>⚠️ Important:</strong> This OTP will expire in ${data.expirationMinutes} minutes. 
            Please use it immediately to reset your password.
          </p>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          If you didn't request this password reset, please ignore this email. 
          Your password will remain unchanged.
        </p>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated message from RentalLease System. Please do not reply to this email.
          </p>
        </div>
        
        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>The RentalLease Team</strong>
        </p>
      </div>
    </div>
  `
});

/**
 * Email template for welcoming new property managers
 * @param {Object} data - Template data
 * @param {string} data.name - Property manager's contact person name
 * @param {string} data.companyName - Property manager's company name
 * @returns {Object} - Email template configuration
 */
const propertyManagerWelcomeTemplate = (data) => ({
  subject: 'Welcome to RentalEase CRM - Property Manager Registration',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">Welcome to RentalEase CRM!</h1>
          <div style="width: 50px; height: 3px; background-color: #28a745; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Hello ${data.name},</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Welcome to RentalEase CRM! We're excited to have <strong>${data.companyName}</strong> join our platform as a Property Manager.
        </p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Your property management account has been successfully created by our admin team and is currently pending approval. Our team will review your registration and activate your account shortly.
        </p>
        
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #155724; margin: 0; font-size: 14px;">
            <strong>📋 What's Next:</strong>
          </p>
          <ul style="color: #155724; margin: 10px 0 0 20px;">
            <li>Our team will verify your company details and compliance requirements</li>
            <li>You'll receive a confirmation email once your account is activated</li>
            <li>Once approved, you can log in to access your dashboard</li>
            <li>You'll be able to manage all your properties from one central location</li>
          </ul>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            <strong>📝 Important:</strong> Please keep this email for your records. You'll need your registered email address to log in once your account is activated.
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #495057; margin: 0 0 10px 0; font-size: 14px;">
            <strong>📋 Your Registration Details:</strong>
          </p>
          <p style="color: #495057; margin: 0; font-size: 14px; line-height: 1.5;">
            <strong>Company:</strong> ${data.companyName}<br>
            <strong>Contact Person:</strong> ${data.name}<br>
            <strong>Email:</strong> ${data.email}
          </p>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          With RentalEase CRM, you'll be able to:
        </p>
        
        <ul style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          <li>Manage all your properties in one place</li>
          <li>Track rental income and expenses</li>
          <li>Manage tenant relationships</li>
          <li>Generate reports and analytics</li>
          <li>Handle maintenance requests efficiently</li>
        </ul>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          If you have any questions or need assistance, please don't hesitate to contact our support team.
        </p>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated message from RentalEase CRM. Please do not reply to this email.
          </p>
        </div>
        
        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>The RentalEase CRM Team</strong>
        </p>
      </div>
    </div>
  `
});

/**
 * Email template for property manager password reset OTP
 * @param {Object} data - Template data
 * @param {string} data.name - Property manager's contact person name
 * @param {string} data.companyName - Property manager's company name
 * @param {string} data.otp - OTP code
 * @param {number} data.expirationMinutes - OTP expiration time in minutes
 * @returns {Object} - Email template configuration
 */
const propertyManagerPasswordResetOTPTemplate = (data) => ({
  subject: 'Password Reset OTP - RentalEase CRM Property Manager',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">Password Reset Request</h1>
          <div style="width: 50px; height: 3px; background-color: #dc3545; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Hello ${data.name},</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          You have requested to reset your password for your RentalEase CRM Property Manager account associated with <strong>${data.companyName}</strong>.
        </p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Please use the following OTP (One-Time Password) to complete your password reset:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; background-color: #dc3545; color: white; padding: 15px 30px; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px; font-family: monospace;">
            ${data.otp}
          </div>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            <strong>⚠️ Important:</strong> This OTP will expire in ${data.expirationMinutes} minutes. 
            Please use it immediately to reset your password.
          </p>
        </div>
        
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #721c24; margin: 0; font-size: 14px;">
            <strong>🔒 Security Note:</strong> If you didn't request this password reset, please contact our support team immediately.
          </p>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          For your security, please ensure you're accessing your account from a secure location.
        </p>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated message from RentalEase CRM. Please do not reply to this email.
          </p>
        </div>
        
        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>The RentalEase CRM Team</strong>
        </p>
      </div>
    </div>
  `
});

/**
 * Email template for job assignment notifications to technicians
 * @param {Object} data - Template data
 * @param {string} data.technicianName - Technician's name
 * @param {string} data.jobId - Job ID
 * @param {string} data.propertyAddress - Property address
 * @param {string} data.jobType - Type of job (Gas, Electrical, etc.)
 * @param {string} data.dueDate - Due date for the job
 * @param {string} data.priority - Job priority (Low, Medium, High, Urgent)
 * @param {string} data.description - Job description
 * @param {string} data.estimatedDuration - Estimated duration in hours
 * @param {string} data.assignedBy - Name of person who assigned the job
 * @param {string} data.assignedByType - Type of assigner (Super User or Property Manager)
 * @param {string} data.notes - Additional notes
 * @returns {Object} - Email template configuration
 */
const jobAssignmentTemplate = (data) => ({
  subject: `New Job Assignment - ${data.jobId} | ${data.jobType} at ${data.propertyAddress}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">🔧 New Job Assignment</h1>
          <div style="width: 50px; height: 3px; background-color: #17a2b8; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Hello ${data.technicianName},</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          You have been assigned a new job! Please review the details below and prepare accordingly.
        </p>
        
        <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin: 20px 0;">
          <h3 style="color: #1976d2; margin: 0 0 15px 0; font-size: 18px;">📋 Job Details</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold; width: 40%;">Job ID:</td>
              <td style="padding: 8px 0; color: #333; font-weight: bold; font-size: 16px;">${data.jobId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Property Address:</td>
              <td style="padding: 8px 0; color: #333;">${data.propertyAddress}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Job Type:</td>
              <td style="padding: 8px 0;">
                <span style="background-color: #4caf50; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                  ${data.jobType}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Due Date:</td>
              <td style="padding: 8px 0; color: #333; font-weight: bold;">${data.dueDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Priority:</td>
              <td style="padding: 8px 0;">
                <span style="background-color: ${data.priority === 'Urgent' ? '#f44336' : data.priority === 'High' ? '#ff9800' : data.priority === 'Medium' ? '#2196f3' : '#4caf50'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                  ${data.priority}
                </span>
              </td>
            </tr>
            ${data.estimatedDuration ? `
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Estimated Duration:</td>
              <td style="padding: 8px 0; color: #333;">${data.estimatedDuration} hours</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Assigned By:</td>
              <td style="padding: 8px 0; color: #333;">${data.assignedBy} (${data.assignedByType})</td>
            </tr>
          </table>
        </div>
        
        ${data.description ? `
          <div style="background-color: #fff8e1; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
            <h4 style="color: #f57c00; margin: 0 0 10px 0;">📝 Job Description</h4>
            <p style="color: #333; margin: 0; line-height: 1.6;">${data.description}</p>
          </div>
        ` : ''}
        
        ${data.notes ? `
          <div style="background-color: #f3e5f5; border-left: 4px solid #9c27b0; padding: 15px; margin: 20px 0;">
            <h4 style="color: #7b1fa2; margin: 0 0 10px 0;">💬 Additional Notes</h4>
            <p style="color: #333; margin: 0; line-height: 1.6;">${data.notes}</p>
          </div>
        ` : ''}
        
        <div style="background-color: ${data.priority === 'Urgent' ? '#ffebee' : '#e8f5e8'}; border: 1px solid ${data.priority === 'Urgent' ? '#ffcdd2' : '#c8e6c8'}; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: ${data.priority === 'Urgent' ? '#c62828' : '#2e7d32'}; margin: 0; font-size: 14px;">
            <strong>${data.priority === 'Urgent' ? '🚨 URGENT:' : '✅ Next Steps:'}</strong>
            ${data.priority === 'Urgent' 
              ? 'This is an urgent job that requires immediate attention. Please prioritize this assignment and begin work as soon as possible.'
              : 'Please review the job details carefully and prepare the necessary tools and materials. Contact the property manager or supervisor if you have any questions before starting the work.'
            }
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #495057; margin: 0 0 10px 0;">📞 Important Reminders</h4>
          <ul style="color: #495057; margin: 10px 0 0 20px; line-height: 1.6;">
            <li>Ensure you have all necessary tools and safety equipment</li>
            <li>Contact the property owner/tenant before arrival if required</li>
            <li>Take before and after photos for documentation</li>
            <li>Update job status once work is completed</li>
            <li>Report any issues or complications immediately</li>
          </ul>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          If you have any questions about this assignment or need to discuss scheduling, please contact ${data.assignedBy} directly.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #666; font-size: 14px; margin: 0;">
            Good luck with your assignment! We appreciate your expertise and professionalism.
          </p>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated message from RentalEase CRM. Please do not reply to this email.
          </p>
        </div>
        
        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>The RentalEase CRM Team</strong>
        </p>
      </div>
    </div>
  `
});

// Add more email templates here as needed
const templates = {
  welcome: welcomeTemplate,
  passwordResetOTP: passwordResetOTPTemplate,
  propertyManagerWelcome: propertyManagerWelcomeTemplate,
  propertyManagerPasswordResetOTP: propertyManagerPasswordResetOTPTemplate
};

/**
 * Email template for welcoming new staff members
 * @param {Object} data - Template data
 * @param {string} data.staffName - Staff member's name
 * @param {string} data.ownerName - Owner's name (Super User or Property Manager)
 * @param {string} data.ownerType - Type of owner (SuperUser or PropertyManager)
 * @param {string} data.tradeType - Staff member's trade type
 * @returns {Object} - Email template configuration
 */
const staffWelcomeTemplate = (data) => ({
  subject: 'Welcome to the Staff Team!',
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">Welcome to Our Staff Team!</h1>
          <div style="width: 50px; height: 3px; background-color: #28a745; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Dear ${data.staffName},</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          We're excited to welcome you to our team! You have been added as a <strong>${data.tradeType}</strong> staff member by ${data.ownerName} (${data.ownerType}).
        </p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Your profile is now active and you can start receiving job assignments. Please ensure your contact information is up to date and all required documents are submitted.
        </p>
        
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #155724; margin: 0; font-size: 14px;">
            <strong>📋 Next Steps:</strong>
          </p>
          <ul style="color: #155724; margin: 10px 0 0 20px;">
            <li>Verify your contact information is correct</li>
            <li>Submit all required licensing documents</li>
            <li>Upload current insurance documents</li>
            <li>Set your availability status</li>
            <li>Review your assigned service regions</li>
          </ul>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          If you have any questions or need assistance, please don't hesitate to contact us.
        </p>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated message from RentalEase CRM. Please do not reply to this email.
          </p>
        </div>
        
        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>The RentalEase Team</strong>
        </p>
      </div>
    </div>
  `
});

/**
 * Email template for staff status updates
 * @param {Object} data - Template data
 * @param {string} data.staffName - Staff member's name
 * @param {string} data.newStatus - New staff status
 * @param {string} data.ownerName - Owner's name who made the change
 * @param {string} data.reason - Optional reason for the status change
 * @returns {Object} - Email template configuration
 */
const staffStatusUpdateTemplate = (data) => ({
  subject: `Staff Status Update - ${data.newStatus}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">Staff Status Update</h1>
          <div style="width: 50px; height: 3px; background-color: #007bff; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Dear ${data.staffName},</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Your staff status has been updated to: <strong style="color: #007bff;">${data.newStatus}</strong>
        </p>
        
        ${data.reason ? `
          <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="color: #495057; margin: 0; font-size: 14px;">
              <strong>📝 Reason:</strong> ${data.reason}
            </p>
          </div>
        ` : ''}
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          This update was made by ${data.ownerName}. If you have any questions about this change, please contact them directly.
        </p>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated message from RentalEase CRM. Please do not reply to this email.
          </p>
        </div>
        
        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>The RentalEase Team</strong>
        </p>
      </div>
    </div>
  `
});

/**
 * Email template for staff document reminder
 * @param {Object} data - Template data
 * @param {string} data.staffName - Staff member's name
 * @param {string} data.documentType - Type of document needed
 * @param {string} data.ownerName - Owner's name
 * @param {string} data.dueDate - Optional due date for documents
 * @returns {Object} - Email template configuration
 */
const staffDocumentReminderTemplate = (data) => ({
  subject: `Document Update Required - ${data.documentType}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">Document Update Required</h1>
          <div style="width: 50px; height: 3px; background-color: #ffc107; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Dear ${data.staffName},</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          This is a reminder that your <strong>${data.documentType}</strong> documents need to be updated or are missing.
        </p>
        
        ${data.dueDate ? `
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>⏰ Due Date:</strong> ${data.dueDate}
            </p>
          </div>
        ` : ''}
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Please upload the required documents as soon as possible to maintain your active status and continue receiving job assignments.
        </p>
        
        <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #0c5460; margin: 0; font-size: 14px;">
            <strong>📋 Required Documents:</strong>
          </p>
          <ul style="color: #0c5460; margin: 10px 0 0 20px;">
            <li>Current and valid licensing documents</li>
            <li>Up-to-date insurance certificates</li>
            <li>Any trade-specific certifications</li>
          </ul>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Contact ${data.ownerName} if you need assistance with the document upload process or have any questions.
        </p>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated message from RentalEase CRM. Please do not reply to this email.
          </p>
        </div>
        
        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>The RentalEase Team</strong>
        </p>
      </div>
    </div>
  `
});

/**
 * Email template for property manager credentials
 * @param {Object} data - Template data
 * @param {string} data.name - Property manager's contact person name
 * @param {string} data.companyName - Property manager's company name
 * @param {string} data.email - Property manager's email
 * @param {string} data.password - Property manager's password
 * @param {string} data.abn - Property manager's ABN
 * @param {string} data.region - Property manager's region
 * @param {string} data.compliance - Property manager's compliance level
 * @param {string} data.loginUrl - Login URL for the system
 * @returns {Object} - Email template configuration
 */
const propertyManagerCredentialsTemplate = (data) => ({
  subject: `Welcome to RentalEase CRM - Your Account Credentials (${data.companyName})`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #28a745; margin-bottom: 10px;">🎉 Welcome to RentalEase CRM!</h1>
          <div style="width: 50px; height: 3px; background-color: #28a745; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Hello ${data.name},</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Congratulations! Your property management account for <strong>${data.companyName}</strong> has been successfully created and approved. 
          You can now access the RentalEase CRM system to manage your properties efficiently.
        </p>
        
        <div style="background-color: #e8f5e8; border: 2px solid #28a745; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #1e7e34; margin: 0 0 15px 0; font-size: 18px;">🔐 Your Login Credentials</h3>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
            <p style="color: #333; margin: 0 0 10px 0; font-size: 14px;"><strong>📧 Email:</strong></p>
            <p style="color: #007bff; margin: 0; font-size: 16px; font-weight: bold; word-break: break-all;">${data.email}</p>
          </div>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
            <p style="color: #333; margin: 0 0 10px 0; font-size: 14px;"><strong>🔑 Password:</strong></p>
            <p style="color: #dc3545; margin: 0; font-size: 16px; font-weight: bold; letter-spacing: 1px; font-family: monospace;">${data.password}</p>
          </div>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px;">
            <p style="color: #333; margin: 0 0 10px 0; font-size: 14px;"><strong>🌐 Login URL:</strong></p>
            <p style="color: #007bff; margin: 0; font-size: 16px; font-weight: bold; word-break: break-all;">${data.loginUrl || 'https://rentalease-crm.com/login'}</p>
          </div>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            <strong>🔒 Security Reminder:</strong> Please change your password after your first login for enhanced security. 
            Keep your login credentials secure and don't share them with unauthorized personnel.
          </p>
        </div>
        
        <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #495057; margin: 0 0 15px 0; font-size: 16px;">📋 Your Company Information</h4>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold; width: 40%;">Company Name:</td>
              <td style="padding: 8px 0; color: #333; font-weight: bold;">${data.companyName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Contact Person:</td>
              <td style="padding: 8px 0; color: #333;">${data.name}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Email:</td>
              <td style="padding: 8px 0; color: #333;">${data.email}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">ABN:</td>
              <td style="padding: 8px 0; color: #333;">${data.abn}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Region:</td>
              <td style="padding: 8px 0; color: #333;">${data.region}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Compliance Level:</td>
              <td style="padding: 8px 0;">
                <span style="background-color: #007bff; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                  ${data.compliance}
                </span>
              </td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #0c5460; margin: 0 0 10px 0; font-size: 16px;">🚀 What You Can Do Now</h4>
          <ul style="color: #0c5460; margin: 10px 0 0 20px; line-height: 1.6;">
            <li>Log in to your dashboard and explore the system</li>
            <li>Add and manage your properties</li>
            <li>Create and assign jobs to technicians</li>
            <li>Monitor job progress and completion</li>
            <li>Generate reports and track performance</li>
            <li>Manage staff and technician teams</li>
          </ul>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          If you have any questions or need assistance getting started, please don't hesitate to contact our support team. 
          We're here to help you make the most of the RentalEase CRM system.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.loginUrl || 'https://rentalease-crm.com/login'}" 
             style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            🚀 Login to Your Dashboard
          </a>
        </div>
        
        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This email contains sensitive login information. Please store it securely and delete it after changing your password.
          </p>
        </div>
        
        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>The RentalEase CRM Team</strong>
        </p>
      </div>
    </div>
  `
});

// Add new templates to the existing templates object
templates.staffWelcome = staffWelcomeTemplate;
templates.staffStatusUpdate = staffStatusUpdateTemplate;
templates.staffDocumentReminder = staffDocumentReminderTemplate;
templates.jobAssignment = jobAssignmentTemplate;
templates.propertyManagerCredentials = propertyManagerCredentialsTemplate;

export default templates; 
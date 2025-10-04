/**
 * Email template for welcoming new users
 * @param {Object} data - Template data
 * @param {string} data.name - User's name
 * @returns {Object} - Email template configuration
 */
const welcomeTemplate = (data) => ({
  subject: "Welcome to RentalLease System From Juhan",
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
  `,
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
  subject: "Password Reset OTP - RentalLease System",
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
  `,
});

/**
 * Email template for welcoming new property managers
 * @param {Object} data - Template data
 * @param {string} data.name - Property manager's contact person name
 * @param {string} data.companyName - Property manager's company name
 * @returns {Object} - Email template configuration
 */
const propertyManagerWelcomeTemplate = (data) => ({
  subject: "Welcome to RentalEase CRM - Property Manager Registration",
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
  `,
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
  subject: "Password Reset OTP - RentalEase CRM Property Manager",
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
  `,
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
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Hello ${
          data.technicianName
        },</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          You have been assigned a new job! Please review the details below and prepare accordingly.
        </p>
        
        <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin: 20px 0;">
          <h3 style="color: #1976d2; margin: 0 0 15px 0; font-size: 18px;">📋 Job Details</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold; width: 40%;">Job ID:</td>
              <td style="padding: 8px 0; color: #333; font-weight: bold; font-size: 16px;">${
                data.jobId
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Property Address:</td>
              <td style="padding: 8px 0; color: #333;">${
                data.propertyAddress
              }</td>
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
              <td style="padding: 8px 0; color: #333; font-weight: bold;">${
                data.dueDate
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Priority:</td>
              <td style="padding: 8px 0;">
                <span style="background-color: ${
                  data.priority === "Urgent"
                    ? "#f44336"
                    : data.priority === "High"
                    ? "#ff9800"
                    : data.priority === "Medium"
                    ? "#2196f3"
                    : "#4caf50"
                }; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                  ${data.priority}
                </span>
              </td>
            </tr>
            ${
              data.estimatedDuration
                ? `
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Estimated Duration:</td>
              <td style="padding: 8px 0; color: #333;">${data.estimatedDuration} hours</td>
            </tr>
            `
                : ""
            }
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Assigned By:</td>
              <td style="padding: 8px 0; color: #333;">${data.assignedBy} (${
    data.assignedByType
  })</td>
            </tr>
          </table>
        </div>
        
        ${
          data.description
            ? `
          <div style="background-color: #fff8e1; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
            <h4 style="color: #f57c00; margin: 0 0 10px 0;">📝 Job Description</h4>
            <p style="color: #333; margin: 0; line-height: 1.6;">${data.description}</p>
          </div>
        `
            : ""
        }
        
        ${
          data.notes
            ? `
          <div style="background-color: #f3e5f5; border-left: 4px solid #9c27b0; padding: 15px; margin: 20px 0;">
            <h4 style="color: #7b1fa2; margin: 0 0 10px 0;">💬 Additional Notes</h4>
            <p style="color: #333; margin: 0; line-height: 1.6;">${data.notes}</p>
          </div>
        `
            : ""
        }
        
        <div style="background-color: ${
          data.priority === "Urgent" ? "#ffebee" : "#e8f5e8"
        }; border: 1px solid ${
    data.priority === "Urgent" ? "#ffcdd2" : "#c8e6c8"
  }; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: ${
            data.priority === "Urgent" ? "#c62828" : "#2e7d32"
          }; margin: 0; font-size: 14px;">
            <strong>${
              data.priority === "Urgent" ? "🚨 URGENT:" : "✅ Next Steps:"
            }</strong>
            ${
              data.priority === "Urgent"
                ? "This is an urgent job that requires immediate attention. Please prioritize this assignment and begin work as soon as possible."
                : "Please review the job details carefully and prepare the necessary tools and materials. Contact the agency or supervisor if you have any questions before starting the work."
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
          If you have any questions about this assignment or need to discuss scheduling, please contact ${
            data.assignedBy
          } directly.
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
  `,
});

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
  subject: "Welcome to the Staff Team!",
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
  `,
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
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Dear ${
          data.staffName
        },</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Your staff status has been updated to: <strong style="color: #007bff;">${
            data.newStatus
          }</strong>
        </p>
        
        ${
          data.reason
            ? `
          <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="color: #495057; margin: 0; font-size: 14px;">
              <strong>📝 Reason:</strong> ${data.reason}
            </p>
          </div>
        `
            : ""
        }
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          This update was made by ${
            data.ownerName
          }. If you have any questions about this change, please contact them directly.
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
  `,
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
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Dear ${
          data.staffName
        },</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          This is a reminder that your <strong>${
            data.documentType
          }</strong> documents need to be updated or are missing.
        </p>
        
        ${
          data.dueDate
            ? `
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="color: #856404; margin: 0; font-size: 14px;">
              <strong>⏰ Due Date:</strong> ${data.dueDate}
            </p>
          </div>
        `
            : ""
        }
        
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
          Contact ${
            data.ownerName
          } if you need assistance with the document upload process or have any questions.
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
  `,
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
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Hello ${
          data.name
        },</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Congratulations! Your property management account for <strong>${
            data.companyName
          }</strong> has been successfully created and approved. 
          You can now access the RentalEase CRM system to manage your properties efficiently.
        </p>
        
        <div style="background-color: #e8f5e8; border: 2px solid #28a745; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #1e7e34; margin: 0 0 15px 0; font-size: 18px;">🔐 Your Login Credentials</h3>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
            <p style="color: #333; margin: 0 0 10px 0; font-size: 14px;"><strong>📧 Email:</strong></p>
            <p style="color: #007bff; margin: 0; font-size: 16px; font-weight: bold; word-break: break-all;">${
              data.email
            }</p>
          </div>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
            <p style="color: #333; margin: 0 0 10px 0; font-size: 14px;"><strong>🔑 Password:</strong></p>
            <p style="color: #dc3545; margin: 0; font-size: 16px; font-weight: bold; letter-spacing: 1px; font-family: monospace;">${
              data.password
            }</p>
          </div>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px;">
            <p style="color: #333; margin: 0 0 10px 0; font-size: 14px;"><strong>🌐 Login URL:</strong></p>
            <p style="color: #007bff; margin: 0; font-size: 16px; font-weight: bold; word-break: break-all;">${
              data.loginUrl || "https://rentalease-client.vercel.app/login"
            }</p>
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
              <td style="padding: 8px 0; color: #333; font-weight: bold;">${
                data.companyName
              }</td>
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
          <a href="${
            data.loginUrl || "https://rentalease-client.vercel.app/login"
          }" 
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
  `,
});

/**
 * Email template for welcoming new agencies
 * @param {Object} data - Template data
 * @param {string} data.name - Agency's contact person name
 * @param {string} data.companyName - Agency's company name
 * @returns {Object} - Email template configuration
 */
const agencyWelcomeTemplate = (data) => ({
  subject: "Welcome to RentalEase CRM - Your Account is Active!",
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">Welcome to RentalEase CRM!</h1>
          <div style="width: 50px; height: 3px; background-color: #28a745; margin: 0 auto;"></div>
        </div>

        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Hello ${data.name},</p>

        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          🎉 Congratulations! Your payment has been successfully processed and <strong>${data.companyName}</strong> is now active on RentalEase CRM!
        </p>

        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #155724; margin: 0 0 15px 0; font-size: 16px;">🔑 Your Login Credentials</h3>
          <p style="color: #155724; margin: 0; font-size: 14px; line-height: 1.5;">
            <strong>Email:</strong> ${data.email || 'Your registered email'}<br>
            <strong>Password:</strong> The password you set during registration<br>
            <strong>Login URL:</strong> <a href="${data.loginUrl || process.env.FRONTEND_URL || 'http://localhost:5173'}/login" style="color: #155724; text-decoration: underline;">${data.loginUrl || process.env.FRONTEND_URL || 'http://localhost:5173'}/login</a>
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.loginUrl || process.env.FRONTEND_URL || 'http://localhost:5173'}/login"
             style="background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            🚀 Access Your CRM Dashboard
          </a>
        </div>

        <div style="background-color: #e7f3ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #0056b3; margin: 0; font-size: 14px;">
            <strong>🆓 14-Day Free Trial:</strong>
          </p>
          <ul style="color: #0056b3; margin: 10px 0 0 20px;">
            <li>Your subscription of <strong>$${data.subscriptionAmount}/month</strong> starts after your trial ends</li>
            <li>Trial period ends on: <strong>${data.trialEndDate ? new Date(data.trialEndDate).toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' }) : '14 days from today'}</strong></li>
            <li>Full access to all CRM features during the trial</li>
            <li>No charges until your trial period expires</li>
          </ul>
        </div>

        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            <strong>🚀 What You Can Do Now:</strong>
          </p>
          <ul style="color: #856404; margin: 10px 0 0 20px;">
            <li>Log in to your agency dashboard immediately</li>
            <li>Add and manage your property portfolio</li>
            <li>Create jobs and assign them to technicians</li>
            <li>Track compliance requirements and deadlines</li>
            <li>Manage team members and property managers</li>
          </ul>
        </div>

        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>The RentalEase CRM Team</strong>
        </p>
      </div>
    </div>
  `,
});

/**
 * Email template for agency password reset OTP
 * @param {Object} data - Template data
 * @param {string} data.name - Agency's contact person name
 * @param {string} data.companyName - Agency's company name
 * @param {string} data.otp - OTP code
 * @param {number} data.expirationMinutes - OTP expiration in minutes
 * @returns {Object} - Email template configuration
 */
const agencyPasswordResetOTPTemplate = (data) => ({
  subject: "Password Reset OTP - RentalEase CRM Agency",
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">Password Reset Request</h1>
          <div style="width: 50px; height: 3px; background-color: #dc3545; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Hello ${data.name},</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          You have requested to reset your password for your RentalEase CRM Agency account associated with <strong>${data.companyName}</strong>.
        </p>
        
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 5px; margin: 20px 0; text-align: center;">
          <p style="color: #721c24; margin: 0 0 10px 0; font-size: 14px;"><strong>Your OTP Code:</strong></p>
          <p style="color: #721c24; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 3px; font-family: monospace;">${data.otp}</p>
          <p style="color: #721c24; margin: 10px 0 0 0; font-size: 12px;">This code expires in ${data.expirationMinutes} minutes</p>
        </div>
        
        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>The RentalEase CRM Team</strong>
        </p>
      </div>
    </div>
  `,
});

/**
 * Email template for agency credentials
 * @param {Object} data - Template data
 * @param {string} data.name - Agency's contact person name
 * @param {string} data.companyName - Agency's company name
 * @param {string} data.email - Agency's email
 * @param {string} data.password - Agency's password
 * @param {string} data.abn - Agency's ABN
 * @param {string} data.region - Agency's region
 * @param {string} data.compliance - Agency's compliance level
 * @param {string} data.loginUrl - Login URL for the system
 * @returns {Object} - Email template configuration
 */
const agencyCredentialsTemplate = (data) => ({
  subject: `Welcome to RentalEase CRM - Your Account Credentials (${data.companyName})`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #28a745; margin-bottom: 10px;">🎉 Welcome to RentalEase CRM!</h1>
          <div style="width: 50px; height: 3px; background-color: #28a745; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Hello ${
          data.name
        },</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Congratulations! Your agency account for <strong>${
            data.companyName
          }</strong> has been successfully created and approved. 
          You can now access the RentalEase CRM system to manage your properties efficiently.
        </p>
        
        <div style="background-color: #e8f5e8; border: 2px solid #28a745; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #1e7e34; margin: 0 0 15px 0; font-size: 18px;">🔐 Your Login Credentials</h3>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
            <p style="color: #333; margin: 0 0 10px 0; font-size: 14px;"><strong>📧 Email:</strong></p>
            <p style="color: #007bff; margin: 0; font-size: 16px; font-weight: bold; word-break: break-all;">${
              data.email
            }</p>
          </div>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
            <p style="color: #333; margin: 0 0 10px 0; font-size: 14px;"><strong>🔑 Password:</strong></p>
            <p style="color: #dc3545; margin: 0; font-size: 16px; font-weight: bold; letter-spacing: 1px; font-family: monospace;">${
              data.password
            }</p>
          </div>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px;">
            <p style="color: #333; margin: 0 0 10px 0; font-size: 14px;"><strong>🌐 Login URL:</strong></p>
            <p style="color: #007bff; margin: 0; font-size: 16px; font-weight: bold; word-break: break-all;">${
              data.loginUrl || "https://rentalease-client.vercel.app/login"
            }</p>
          </div>
        </div>
        
        <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #495057; margin: 0 0 15px 0; font-size: 16px;">📋 Your Company Information</h4>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold; width: 40%;">Company Name:</td>
              <td style="padding: 8px 0; color: #333; font-weight: bold;">${
                data.companyName
              }</td>
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
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${
            data.loginUrl || "https://rentalease-client.vercel.app/login"
          }" 
             style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            🚀 Login to Your Dashboard
          </a>
        </div>
        
        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>The RentalEase CRM Team</strong>
        </p>
      </div>
    </div>
  `,
});

/**
 * Email template for agency payment link with subscription details
 * @param {Object} data - Template data
 * @param {string} data.name - Agency contact person's name
 * @param {string} data.companyName - Agency company name
 * @param {string} data.email - Agency email
 * @param {number} data.subscriptionAmount - Monthly subscription amount
 * @param {string} data.paymentLinkUrl - Stripe checkout URL
 * @param {string} data.loginPassword - Login password for the agency
 * @param {string} data.loginUrl - Login URL for the CRM
 * @returns {Object} - Email template configuration
 */
const agencyPaymentLinkTemplate = (data) => ({
  subject: `Complete Your RentalEase CRM Subscription - ${data.companyName}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #28a745; margin-bottom: 10px;">🎉 Welcome to RentalEase CRM!</h1>
          <div style="width: 50px; height: 3px; background-color: #28a745; margin: 0 auto;"></div>
        </div>

        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Hello ${data.name},</p>

        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Great news! Your agency account for <strong>${data.companyName}</strong> has been successfully created.
          To activate your CRM access, please complete your subscription setup below.
        </p>

        <div style="background-color: #e8f4f8; border: 2px solid #007bff; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #007bff; margin: 0 0 15px 0; font-size: 18px;">💰 Your Subscription Details</h3>

          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
            <p style="color: #333; margin: 0 0 10px 0; font-size: 14px;"><strong>📊 Monthly Subscription:</strong></p>
            <p style="color: #28a745; margin: 0; font-size: 24px; font-weight: bold;">$${data.subscriptionAmount} AUD/month</p>
          </div>

          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
            <p style="color: #333; margin: 0; font-size: 14px;"><strong>✨ Includes:</strong></p>
            <ul style="color: #333; margin: 10px 0 0 0; padding-left: 20px;">
              <li>Full CRM access</li>
              <li>Property management tools</li>
              <li>Job tracking & compliance</li>
              <li>Email support</li>
            </ul>
          </div>

          <div style="text-align: center;">
            <a href="${data.paymentLinkUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; margin: 10px 0;">
              🚀 Complete Your Subscription
            </a>
          </div>
        </div>

        <div style="background-color: #fff3cd; border: 2px solid #ffc107; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #856404; margin: 0 0 15px 0; font-size: 18px;">🔐 Your Login Credentials</h3>
          <p style="color: #856404; margin: 0 0 15px 0; font-size: 14px;">
            <strong>Note:</strong> You can log in straight away, and full functionality will be available once your subscription is activated.
          </p>

          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
            <p style="color: #333; margin: 0 0 10px 0; font-size: 14px;"><strong>📧 Email:</strong></p>
            <p style="color: #007bff; margin: 0; font-size: 16px; font-weight: bold; word-break: break-all;">${data.email}</p>
          </div>

          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
            <p style="color: #333; margin: 0 0 10px 0; font-size: 14px;"><strong>🔑 Password:</strong></p>
            <p style="color: #dc3545; margin: 0; font-size: 16px; font-weight: bold; letter-spacing: 1px; font-family: monospace;">${data.loginPassword}</p>
          </div>

          <div style="text-align: center; margin-top: 20px;">
            <a href="${data.loginUrl}" style="display: inline-block; background-color: #6c757d; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-size: 14px;">
              🔑 Login to CRM
            </a>
          </div>
        </div>

        <div style="border-left: 4px solid #28a745; padding-left: 20px; margin: 25px 0;">
          <h4 style="color: #28a745; margin: 0 0 10px 0;">What happens next?</h4>
          <ol style="color: #333; line-height: 1.6; margin: 0; padding-left: 20px;">
            <li>Click the "Complete Your Subscription" button above</li>
            <li>Finish your payment setup with Stripe</li>
            <li>Start using RentalEase CRM right away</li>
            <li>Your subscription will auto-renew monthly at $${data.subscriptionAmount} AUD</li>
          </ol>
        </div>

        <p style="color: #666; line-height: 1.6; margin: 30px 0 0 0; font-size: 14px;">
          Need help? Contact our support team or reply to this email. We're here to help you get the most out of RentalEase CRM.
        </p>

        <p style="color: #333; margin-top: 30px;">Best regards,<br>The RentalEase Team</p>
      </div>
    </div>
  `,
});

/**
 * Email template for team member credentials with login information
 * @param {Object} data - Template data
 * @param {string} data.name - Team member's name
 * @param {string} data.email - Team member's email
 * @param {string} data.password - Team member's password
 * @param {string} data.loginUrl - Login URL for the system
 * @returns {Object} - Email template configuration
 */
const teamMemberCredentialsTemplate = (data) => ({
  subject: `Welcome to RentalEase CRM - Your Team Member Account Credentials`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #024974; margin-bottom: 10px;">🎉 Welcome to RentalEase CRM!</h1>
          <div style="width: 50px; height: 3px; background-color: #024974; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Hello ${
          data.name
        },</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Congratulations! Your team member account has been successfully created. 
          You now have full administrative access to the RentalEase CRM system to help manage properties, agencies, jobs, and users efficiently.
        </p>
        
        <div style="background-color: #e8f4f8; border: 2px solid #024974; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #024974; margin: 0 0 15px 0; font-size: 18px;">🔐 Your Login Credentials</h3>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
            <p style="color: #333; margin: 0 0 10px 0; font-size: 14px;"><strong>📧 Email:</strong></p>
            <p style="color: #007bff; margin: 0; font-size: 16px; font-weight: bold; word-break: break-all;">${
              data.email
            }</p>
          </div>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
            <p style="color: #333; margin: 0 0 10px 0; font-size: 14px;"><strong>🔑 Password:</strong></p>
            <p style="color: #dc3545; margin: 0; font-size: 16px; font-weight: bold; letter-spacing: 1px; font-family: monospace;">${
              data.password
            }</p>
          </div>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px;">
            <p style="color: #333; margin: 0 0 10px 0; font-size: 14px;"><strong>🌐 Login URL:</strong></p>
            <p style="color: #007bff; margin: 0; font-size: 16px; font-weight: bold; word-break: break-all;">${
              data.loginUrl || "https://rentalease-client.vercel.app/login"
            }</p>
          </div>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            <strong>🔒 Security Reminder:</strong> Please change your password after your first login for enhanced security. 
            Keep your login credentials secure and don't share them with unauthorized personnel.
          </p>
        </div>
        
        <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #0c5460; margin: 0 0 10px 0; font-size: 16px;">🚀 What You Can Do Now</h4>
          <ul style="color: #0c5460; margin: 10px 0 0 20px; line-height: 1.6;">
            <li>Log in to your admin dashboard</li>
            <li>Manage agencies and their operations</li>
            <li>Oversee property management activities</li>
            <li>Handle job assignments and tracking</li>
            <li>Manage user accounts and permissions</li>
            <li>Access comprehensive reporting tools</li>
            <li>Perform all Super User level operations</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${
            data.loginUrl || "https://rentalease-client.vercel.app/login"
          }" 
             style="background-color: #024974; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
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
  `,
});

/**
 * Email template for technician credentials with login information
 * @param {Object} data - Template data
 * @param {string} data.fullName - Technician's full name
 * @param {string} data.email - Technician's email
 * @param {string} data.password - Technician's password
 * @param {string} data.ownerName - Owner's name (Agency or SuperUser)
 * @param {string} data.ownerType - Owner type (Agency or SuperUser)
 * @param {string} data.loginUrl - Login URL for the system
 * @returns {Object} - Email template configuration
 */
const technicianCredentialsTemplate = (data) => ({
  subject: `Welcome to RentalEase CRM - Your Technician Account Credentials`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #28a745; margin-bottom: 10px;">🎉 Welcome to RentalEase CRM!</h1>
          <div style="width: 50px; height: 3px; background-color: #28a745; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Hello ${
          data.fullName
        },</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Congratulations! Your technician account has been successfully created by <strong>${
            data.ownerName
          }</strong> (${data.ownerType}). 
          You can now access the RentalEase CRM system to manage your jobs and assignments efficiently.
        </p>
        
        <div style="background-color: #e8f5e8; border: 2px solid #28a745; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #1e7e34; margin: 0 0 15px 0; font-size: 18px;">🔐 Your Login Credentials</h3>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
            <p style="color: #333; margin: 0 0 10px 0; font-size: 14px;"><strong>📧 Email:</strong></p>
            <p style="color: #007bff; margin: 0; font-size: 16px; font-weight: bold; word-break: break-all;">${
              data.email
            }</p>
          </div>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
            <p style="color: #333; margin: 0 0 10px 0; font-size: 14px;"><strong>🔑 Password:</strong></p>
            <p style="color: #dc3545; margin: 0; font-size: 16px; font-weight: bold; letter-spacing: 1px; font-family: monospace;">${
              data.password
            }</p>
          </div>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px;">
            <p style="color: #333; margin: 0 0 10px 0; font-size: 14px;"><strong>🌐 Login URL:</strong></p>
            <p style="color: #007bff; margin: 0; font-size: 16px; font-weight: bold; word-break: break-all;">${
              data.loginUrl || "https://rentalease-client.vercel.app/login"
            }</p>
          </div>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            <strong>🔒 Security Reminder:</strong> Please change your password after your first login for enhanced security. 
            Keep your login credentials secure and don't share them with unauthorized personnel.
          </p>
        </div>
        
        <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #0c5460; margin: 0 0 10px 0; font-size: 16px;">🚀 What You Can Do Now</h4>
          <ul style="color: #0c5460; margin: 10px 0 0 20px; line-height: 1.6;">
            <li>Log in to your technician dashboard</li>
            <li>View and accept job assignments</li>
            <li>Update job status and progress</li>
            <li>Upload job completion photos and documents</li>
            <li>Track your earnings and payments</li>
            <li>Manage your availability and schedule</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${
            data.loginUrl || "https://rentalease-client.vercel.app/login"
          }" 
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
  `,
});

/**
 * Email template for job creation notification to all stakeholders
 * @param {Object} data - Template data
 * @param {string} data.recipientName - Recipient's name
 * @param {string} data.recipientType - Recipient type (SuperUser, Agency, PropertyManager, Technician)
 * @param {string} data.jobId - Job ID
 * @param {string} data.propertyAddress - Property address
 * @param {string} data.jobType - Job type
 * @param {string} data.dueDate - Due date
 * @param {string} data.priority - Job priority
 * @param {string} data.description - Job description
 * @param {string} data.creatorName - Creator's name
 * @param {string} data.creatorType - Creator type
 * @param {string} data.assignedTechnician - Assigned technician name (if any)
 * @returns {Object} - Email template configuration
 */
const jobCreationNotificationTemplate = (data) => ({
  subject: `New ${data.jobType} Job Created - ${data.propertyAddress}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #007bff; margin-bottom: 10px;">🆕 New Job Created</h1>
          <div style="width: 50px; height: 3px; background-color: #007bff; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Hello ${
          data.recipientName
        },</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          A new <strong>${
            data.jobType
          }</strong> job has been created and you have been notified as a stakeholder.
        </p>
        
        <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #495057; margin: 0 0 15px 0; font-size: 18px;">📋 Job Details</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold; width: 40%;">Job ID:</td>
              <td style="padding: 8px 0; color: #333; font-weight: bold;">${
                data.jobId
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Property Address:</td>
              <td style="padding: 8px 0; color: #333;">${
                data.propertyAddress
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Job Type:</td>
              <td style="padding: 8px 0; color: #333;">${data.jobType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Due Date:</td>
              <td style="padding: 8px 0; color: #333;">${data.dueDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Priority:</td>
              <td style="padding: 8px 0;">
                <span style="background-color: ${
                  data.priority === "Urgent"
                    ? "#dc3545"
                    : data.priority === "High"
                    ? "#fd7e14"
                    : "#28a745"
                }; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                  ${data.priority}
                </span>
              </td>
            </tr>
            ${
              data.assignedTechnician
                ? `
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Assigned Technician:</td>
              <td style="padding: 8px 0; color: #333;">${data.assignedTechnician}</td>
            </tr>
            `
                : ""
            }
          </table>
        </div>
        
        ${
          data.description
            ? `
        <div style="background-color: #e3f2fd; border: 1px solid #bbdefb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #1565c0; margin: 0 0 10px 0; font-size: 16px;">📝 Job Description</h4>
          <p style="color: #1565c0; margin: 0; line-height: 1.6;">${data.description}</p>
        </div>
        `
            : ""
        }
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            <strong>👤 Created by:</strong> ${data.creatorName} (${
    data.creatorType
  })
          </p>
        </div>
        
        <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #0c5460; margin: 0 0 10px 0; font-size: 16px;">🔔 Next Steps</h4>
          <ul style="color: #0c5460; margin: 10px 0 0 20px; line-height: 1.6;">
            <li>Monitor job progress through your dashboard</li>
            <li>Ensure timely completion within the due date</li>
            <li>Communicate with other stakeholders as needed</li>
            <li>Review job completion reports and documentation</li>
          </ul>
        </div>
        
        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>The RentalEase CRM Team</strong>
        </p>
      </div>
    </div>
  `,
});

/**
 * Email template for job assignment notification to all stakeholders
 * @param {Object} data - Template data
 * @param {string} data.recipientName - Recipient's name
 * @param {string} data.recipientType - Recipient type (SuperUser, Agency, PropertyManager, Technician)
 * @param {string} data.jobId - Job ID
 * @param {string} data.propertyAddress - Property address
 * @param {string} data.jobType - Job type
 * @param {string} data.dueDate - Due date
 * @param {string} data.priority - Job priority
 * @param {string} data.assignedTechnician - Assigned technician name
 * @param {string} data.assignedBy - Who assigned the job
 * @param {string} data.assignedByType - Type of person who assigned
 * @returns {Object} - Email template configuration
 */
const jobAssignmentNotificationTemplate = (data) => ({
  subject: `Job Assigned to Technician - ${data.jobType} at ${data.propertyAddress}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #28a745; margin-bottom: 10px;">👷 Job Assigned</h1>
          <div style="width: 50px; height: 3px; background-color: #28a745; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Hello ${
          data.recipientName
        },</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          A <strong>${
            data.jobType
          }</strong> job has been assigned to a technician and you have been notified as a stakeholder.
        </p>
        
        <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #495057; margin: 0 0 15px 0; font-size: 18px;">📋 Job Assignment Details</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold; width: 40%;">Job ID:</td>
              <td style="padding: 8px 0; color: #333; font-weight: bold;">${
                data.jobId
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Property Address:</td>
              <td style="padding: 8px 0; color: #333;">${
                data.propertyAddress
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Job Type:</td>
              <td style="padding: 8px 0; color: #333;">${data.jobType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Due Date:</td>
              <td style="padding: 8px 0; color: #333;">${data.dueDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Priority:</td>
              <td style="padding: 8px 0;">
                <span style="background-color: ${
                  data.priority === "Urgent"
                    ? "#dc3545"
                    : data.priority === "High"
                    ? "#fd7e14"
                    : "#28a745"
                }; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                  ${data.priority}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Assigned Technician:</td>
              <td style="padding: 8px 0; color: #333; font-weight: bold;">${
                data.assignedTechnician
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Assigned By:</td>
              <td style="padding: 8px 0; color: #333;">${data.assignedBy} (${
    data.assignedByType
  })</td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #155724; margin: 0; font-size: 14px;">
            <strong>✅ Assignment Status:</strong> The job has been successfully assigned and the technician has been notified.
          </p>
        </div>
        
        <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #0c5460; margin: 0 0 10px 0; font-size: 16px;">🔔 Next Steps</h4>
          <ul style="color: #0c5460; margin: 10px 0 0 20px; line-height: 1.6;">
            <li>Monitor job progress through your dashboard</li>
            <li>Track technician's work and completion status</li>
            <li>Review job completion reports and documentation</li>
            <li>Ensure quality standards are met</li>
          </ul>
        </div>
        
        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>The RentalEase CRM Team</strong>
        </p>
      </div>
    </div>
  `,
});

/**
 * Email template for job completion notification to all stakeholders
 * @param {Object} data - Template data
 * @param {string} data.recipientName - Recipient's name
 * @param {string} data.recipientType - Recipient type (SuperUser, Agency, PropertyManager, Technician)
 * @param {string} data.jobId - Job ID
 * @param {string} data.propertyAddress - Property address
 * @param {string} data.jobType - Job type
 * @param {string} data.completedBy - Technician who completed the job
 * @param {string} data.completionDate - Completion date
 * @param {string} data.completionNotes - Completion notes
 * @param {string} data.totalCost - Total cost of the job
 * @returns {Object} - Email template configuration
 */
const jobCompletionNotificationTemplate = (data) => ({
  subject: `Job Completed - ${data.jobType} at ${data.propertyAddress}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #28a745; margin-bottom: 10px;">✅ Job Completed</h1>
          <div style="width: 50px; height: 3px; background-color: #28a745; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Hello ${
          data.recipientName
        },</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Great news! A <strong>${
            data.jobType
          }</strong> job has been successfully completed and you have been notified as a stakeholder.
        </p>
        
        <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #495057; margin: 0 0 15px 0; font-size: 18px;">📋 Job Completion Details</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold; width: 40%;">Job ID:</td>
              <td style="padding: 8px 0; color: #333; font-weight: bold;">${
                data.jobId
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Property Address:</td>
              <td style="padding: 8px 0; color: #333;">${
                data.propertyAddress
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Job Type:</td>
              <td style="padding: 8px 0; color: #333;">${data.jobType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Completed By:</td>
              <td style="padding: 8px 0; color: #333; font-weight: bold;">${
                data.completedBy
              }</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Completion Date:</td>
              <td style="padding: 8px 0; color: #333;">${
                data.completionDate
              }</td>
            </tr>
            ${
              data.totalCost
                ? `
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Total Cost:</td>
              <td style="padding: 8px 0; color: #333; font-weight: bold;">$${data.totalCost}</td>
            </tr>
            `
                : ""
            }
          </table>
        </div>
        
        ${
          data.completionNotes
            ? `
        <div style="background-color: #e3f2fd; border: 1px solid #bbdefb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #1565c0; margin: 0 0 10px 0; font-size: 16px;">📝 Completion Notes</h4>
          <p style="color: #1565c0; margin: 0; line-height: 1.6;">${data.completionNotes}</p>
        </div>
        `
            : ""
        }
        
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #155724; margin: 0; font-size: 14px;">
            <strong>✅ Status:</strong> Job has been marked as completed and all documentation has been submitted.
          </p>
        </div>
        
        <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #0c5460; margin: 0 0 10px 0; font-size: 16px;">🔔 Next Steps</h4>
          <ul style="color: #0c5460; margin: 10px 0 0 20px; line-height: 1.6;">
            <li>Review the completed work and documentation</li>
            <li>Approve the job completion if satisfied</li>
            <li>Process any associated invoices or payments</li>
            <li>Update property records as needed</li>
          </ul>
        </div>
        
        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>The RentalEase CRM Team</strong>
        </p>
      </div>
    </div>
  `,
});

/**
 * Email template for compliance job notification to all stakeholders
 * @param {Object} data - Template data
 * @param {string} data.recipientName - Recipient's name
 * @param {string} data.recipientType - Recipient type (SuperUser, Agency, PropertyManager, Technician)
 * @param {string} data.jobId - Job ID
 * @param {string} data.propertyAddress - Property address
 * @param {string} data.jobType - Job type (Gas, Electrical, Smoke)
 * @param {string} data.dueDate - Due date
 * @param {string} data.complianceType - Compliance type
 * @returns {Object} - Email template configuration
 */
const complianceJobNotificationTemplate = (data) => ({
  subject: `Compliance ${data.jobType} Due - ${data.propertyAddress}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #dc3545; margin-bottom: 10px;">⚠️ Compliance Due</h1>
          <div style="width: 50px; height: 3px; background-color: #dc3545; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Hello ${data.recipientName},</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          A <strong>${data.jobType}</strong> compliance inspection is due and you have been notified as a stakeholder.
        </p>
        
        <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #495057; margin: 0 0 15px 0; font-size: 18px;">📋 Compliance Details</h3>
          
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold; width: 40%;">Job ID:</td>
              <td style="padding: 8px 0; color: #333; font-weight: bold;">${data.jobId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Property Address:</td>
              <td style="padding: 8px 0; color: #333;">${data.propertyAddress}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Compliance Type:</td>
              <td style="padding: 8px 0; color: #333;">${data.jobType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Due Date:</td>
              <td style="padding: 8px 0; color: #333;">${data.dueDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Priority:</td>
              <td style="padding: 8px 0;">
                <span style="background-color: #dc3545; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                  High
                </span>
              </td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            <strong>⚠️ Important:</strong> This is a compliance requirement that must be completed by the due date to ensure property safety and legal compliance.
          </p>
        </div>
        
        <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #0c5460; margin: 0 0 10px 0; font-size: 16px;">🔔 Required Actions</h4>
          <ul style="color: #0c5460; margin: 10px 0 0 20px; line-height: 1.6;">
            <li>Assign a qualified technician to perform the inspection</li>
            <li>Ensure the inspection is completed before the due date</li>
            <li>Upload inspection reports and compliance certificates</li>
            <li>Update property compliance records</li>
            <li>Schedule follow-up inspections as required</li>
          </ul>
        </div>
        
        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>The RentalEase CRM Team</strong>
        </p>
      </div>
    </div>
  `,
});

/**
 * Email template for tenant inspection date selection
 * @param {Object} data - Template data
 * @param {string} data.tenantName - Tenant's name
 * @param {string} data.propertyAddress - Property address
 * @param {string} data.jobType - Type of inspection
 * @param {string} data.inspectionDate - Due date for inspection
 * @param {string} data.bookingLink - Link to book/reschedule inspection
 * @param {string} data.complianceType - Type of compliance
 * @returns {Object} - Email template configuration
 */
const tenantInspectionBookingTemplate = (data) => {
  console.log(data, "Tenant Booking Template Data");
  return {
    subject: `Schedule Your ${data.jobType} - ${data.propertyAddress}`,
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #28a745; margin-bottom: 10px;">📅 Schedule Your Inspection</h1>
          <div style="width: 50px; height: 3px; background-color: #28a745; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Dear ${data.tenantName},</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          We need to schedule a <strong>${data.jobType}</strong> for your property at <strong>${data.propertyAddress}</strong>. 
          This is a required compliance inspection to ensure your property meets safety standards.
        </p>
        
        <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #495057; margin: 0 0 15px 0; font-size: 18px;">📋 Inspection Details</h3>
          
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
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Due Date:</td>
              <td style="padding: 8px 0; color: #333;">${data.inspectionDate}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #666; font-weight: bold;">Compliance Type:</td>
              <td style="padding: 8px 0; color: #333;">${data.complianceType}</td>
            </tr>
          </table>
        </div>
        
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 25px 0;">
          <h3 style="color: #155724; margin: 0 0 15px 0; font-size: 18px;">🎯 Choose Your Preferred Date</h3>
          
          <p style="color: #155724; line-height: 1.6; margin-bottom: 20px;">
            Please click the button below to select your preferred inspection date and time. 
            We'll do our best to accommodate your schedule.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.bookingLink}" style="background-color: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-size: 16px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              📅 Book Inspection Date
            </a>
          </div>
          
          <p style="color: #155724; font-size: 14px; margin: 0; text-align: center;">
            <em>Click the button above to open the booking calendar</em>
          </p>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #856404; margin: 0 0 10px 0; font-size: 16px;">⚠️ Important Information</h4>
          <ul style="color: #856404; margin: 10px 0 0 20px; line-height: 1.6;">
            <li>Please ensure someone is available at the property during the inspection</li>
            <li>Clear access to all areas that need to be inspected</li>
            <li>Inspection typically takes 30-60 minutes</li>
            <li>You'll receive a confirmation email once scheduled</li>
          </ul>
        </div>
        
        <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h4 style="color: #0c5460; margin: 0 0 10px 0; font-size: 16px;">📞 Need Help?</h4>
          <p style="color: #0c5460; margin: 0; line-height: 1.6;">
            If you have any questions or need assistance with scheduling, please contact us at:<br>
            <strong>Email:</strong> support@rentalease-crm.com<br>
            <strong>Phone:</strong> 1300 123 456
          </p>
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
  };
};

/**
 * Email template for tenant booking time selection request
 * @param {Object} data - Template data
 * @param {string} data.recipientName - Tenant's name
 * @param {string} data.propertyAddress - Property address
 * @param {string} data.complianceType - Type of compliance (Gas, Electrical, Smoke Alarm)
 * @param {string} data.bookingLink - Link to select time slots
 * @param {string} data.dueDate - Due date for compliance
 * @returns {Object} - Email template configuration
 */
const tenantBookingRequestTemplate = (data) => ({
  subject: `Schedule Your ${data.complianceType} Safety Inspection - ${data.propertyAddress}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">Safety Inspection Required</h1>
          <div style="width: 50px; height: 3px; background-color: #007bff; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Dear ${data.recipientName},</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Your property requires a ${data.complianceType} safety inspection to ensure compliance with Australian safety regulations.
        </p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #495057; margin-top: 0;">Property Details:</h3>
          <p style="margin: 5px 0; color: #666;"><strong>Address:</strong> ${data.propertyAddress}</p>
          <p style="margin: 5px 0; color: #666;"><strong>Inspection Type:</strong> ${data.complianceType} Safety Check</p>
          <p style="margin: 5px 0; color: #666;"><strong>Due Date:</strong> ${data.dueDate}</p>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 25px;">
          Please select your preferred time slot for the inspection by clicking the button below:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.bookingLink}" 
             style="display: inline-block; background-color: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
            Select Your Time Slot
          </a>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #856404; margin-top: 0;">Important Notes:</h4>
          <ul style="color: #856404; margin: 0; padding-left: 20px;">
            <li>The inspection typically takes 30-60 minutes</li>
            <li>Someone must be present during the inspection</li>
            <li>Please ensure access to all required areas</li>
            <li>No special preparation is needed</li>
          </ul>
        </div>
        
        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>RentalEase Property Management</strong>
        </p>
        
        <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
        <p style="font-size: 12px; color: #7f8c8d; text-align: center;">
          This is an automated notification. If you have questions, please contact your property manager.
        </p>
      </div>
    </div>
  `,
});

/**
 * Email template for tenant booking confirmation
 * @param {Object} data - Template data
 * @param {string} data.recipientName - Tenant's name
 * @param {string} data.propertyAddress - Property address
 * @param {string} data.complianceType - Type of compliance
 * @param {string} data.selectedDate - Selected date
 * @param {string} data.selectedTime - Selected time
 * @param {string} data.technicianName - Technician name
 * @param {string} data.technicianPhone - Technician phone
 * @returns {Object} - Email template configuration
 */
const tenantBookingConfirmationTemplate = (data) => ({
  subject: `Inspection Confirmed - ${data.complianceType} Safety Check on ${data.selectedDate}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #28a745; margin-bottom: 10px;">✅ Inspection Confirmed</h1>
          <div style="width: 50px; height: 3px; background-color: #28a745; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Dear ${data.recipientName},</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Your ${data.complianceType} safety inspection has been successfully scheduled.
        </p>
        
        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #155724; margin-top: 0;">Appointment Details:</h3>
          <p style="margin: 8px 0; color: #155724;"><strong>Date:</strong> ${data.selectedDate}</p>
          <p style="margin: 8px 0; color: #155724;"><strong>Time:</strong> ${data.selectedTime}</p>
          <p style="margin: 8px 0; color: #155724;"><strong>Property:</strong> ${data.propertyAddress}</p>
          <p style="margin: 8px 0; color: #155724;"><strong>Inspection:</strong> ${data.complianceType} Safety Check</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #495057; margin-top: 0;">Technician Details:</h3>
          <p style="margin: 5px 0; color: #666;"><strong>Name:</strong> ${data.technicianName}</p>
          <p style="margin: 5px 0; color: #666;"><strong>Phone:</strong> ${data.technicianPhone}</p>
        </div>
        
        <div style="background-color: #cce7ff; border: 1px solid #99d6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="color: #0056b3; margin-top: 0;">Please Remember:</h4>
          <ul style="color: #0056b3; margin: 0; padding-left: 20px;">
            <li>Be available at the scheduled time</li>
            <li>Provide access to all areas requiring inspection</li>
            <li>The technician will call if there are any delays</li>
            <li>A compliance certificate will be issued upon completion</li>
          </ul>
        </div>
        
        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>RentalEase Property Management</strong>
        </p>
        
        <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
        <p style="font-size: 12px; color: #7f8c8d; text-align: center;">
          Need to reschedule? Please contact your property manager as soon as possible.
        </p>
      </div>
    </div>
  `,
});

/**
 * Email template for compliance due notifications
 * @param {Object} data - Template data
 * @param {string} data.recipientName - Recipient's name
 * @param {string} data.complianceType - Type of compliance
 * @param {string} data.propertyAddress - Property address
 * @param {string} data.dueDate - Due date
 * @returns {Object} - Email template configuration
 */
const complianceDueTemplate = (data) => ({
  subject: `Urgent: ${data.complianceType} Compliance Due - ${data.propertyAddress}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #dc3545; margin-bottom: 10px;">⚠️ Compliance Due</h1>
          <div style="width: 50px; height: 3px; background-color: #dc3545; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Dear ${data.recipientName},</p>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          This is a reminder that ${data.complianceType} compliance is due for the following property:
        </p>
        
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #721c24; margin-top: 0;">Urgent Action Required:</h3>
          <p style="margin: 8px 0; color: #721c24;"><strong>Property:</strong> ${data.propertyAddress}</p>
          <p style="margin: 8px 0; color: #721c24;"><strong>Compliance Type:</strong> ${data.complianceType}</p>
          <p style="margin: 8px 0; color: #721c24;"><strong>Due Date:</strong> ${data.dueDate}</p>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Please schedule the required inspection immediately to maintain compliance with Australian safety regulations.
        </p>
        
        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>RentalEase Compliance Team</strong>
        </p>
      </div>
    </div>
  `,
});

/**
 * General email template for custom notifications
 * @param {Object} data - Template data
 * @param {string} data.recipientName - Recipient's name
 * @param {string} data.subject - Email subject
 * @param {string} data.message - Email message
 * @returns {Object} - Email template configuration
 */
const generalTemplate = (data) => ({
  subject: data.subject || "Notification from RentalEase",
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">RentalEase Notification</h1>
          <div style="width: 50px; height: 3px; background-color: #007bff; margin: 0 auto;"></div>
        </div>
        
        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Dear ${data.recipientName},</p>
        
        <div style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          ${data.message}
        </div>
        
        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>RentalEase Team</strong>
        </p>
      </div>
    </div>
  `,
});

/**
 * Email template for quotation request notification to SuperUser
 * @param {Object} data - Template data
 * @param {string} data.agencyName - Agency name
 * @param {string} data.jobType - Type of job requested
 * @param {string} data.propertyAddress - Property address
 * @param {string} data.dueDate - Due date for the job
 * @param {string} data.description - Job description
 * @returns {Object} - Email template configuration
 */
const quotationRequestTemplate = (data) => ({
  subject: `New Quotation Request from ${data.agencyName}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">New Quotation Request</h1>
          <div style="width: 50px; height: 3px; background-color: #17a2b8; margin: 0 auto;"></div>
        </div>

        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          A new quotation request has been submitted by <strong>${data.agencyName}</strong> for beyond-compliance services.
        </p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Request Details:</h3>
          <ul style="color: #333; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li><strong>Service Type:</strong> ${data.jobType}</li>
            <li><strong>Property:</strong> ${data.propertyAddress}</li>
            <li><strong>Required by:</strong> ${new Date(data.dueDate).toLocaleDateString()}</li>
            <li><strong>Description:</strong> ${data.description}</li>
          </ul>
        </div>

        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Please review this request and provide a quotation at your earliest convenience.
        </p>

        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated notification from RentalEase CRM.
          </p>
        </div>

        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>RentalEase CRM System</strong>
        </p>
      </div>
    </div>
  `,
});

/**
 * Email template for quotation received notification to Agency
 * @param {Object} data - Template data
 * @param {string} data.agencyName - Agency name
 * @param {string} data.jobType - Type of job
 * @param {string} data.propertyAddress - Property address
 * @param {number} data.amount - Quotation amount
 * @param {string} data.validUntil - Quotation expiry date
 * @param {string} data.notes - Additional notes
 * @returns {Object} - Email template configuration
 */
const quotationReceivedTemplate = (data) => ({
  subject: `Quotation Received for ${data.jobType} - ${data.propertyAddress}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">Quotation Received</h1>
          <div style="width: 50px; height: 3px; background-color: #28a745; margin: 0 auto;"></div>
        </div>

        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">Dear ${data.agencyName},</p>

        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          We've prepared a quotation for your requested beyond-compliance service.
        </p>

        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #333; margin-top: 0;">Quotation Details:</h3>
          <ul style="color: #333; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li><strong>Service:</strong> ${data.jobType}</li>
            <li><strong>Property:</strong> ${data.propertyAddress}</li>
            <li><strong>Amount:</strong> <span style="color: #28a745; font-size: 18px; font-weight: bold;">$${data.amount}</span></li>
            <li><strong>Valid Until:</strong> ${new Date(data.validUntil).toLocaleDateString()}</li>
            ${data.notes ? `<li><strong>Notes:</strong> ${data.notes}</li>` : ''}
          </ul>
        </div>

        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="color: #856404; margin: 0; font-size: 14px;">
            <strong>⏰ Time-Sensitive:</strong> This quotation expires on ${new Date(data.validUntil).toLocaleDateString()}.
            Please accept or reject this quotation before the expiry date.
          </p>
        </div>

        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Please log into your RentalEase CRM dashboard to review and respond to this quotation.
        </p>

        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated notification from RentalEase CRM.
          </p>
        </div>

        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>RentalEase Team</strong>
        </p>
      </div>
    </div>
  `,
});

/**
 * Email template for quotation acceptance notification to SuperUser
 * @param {Object} data - Template data
 * @param {string} data.agencyName - Agency name
 * @param {string} data.jobType - Type of job
 * @param {string} data.propertyAddress - Property address
 * @param {number} data.amount - Quotation amount
 * @param {string} data.responseNotes - Agency response notes
 * @returns {Object} - Email template configuration
 */
const quotationAcceptedTemplate = (data) => ({
  subject: `Quotation Accepted by ${data.agencyName} - ${data.jobType}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">Quotation Accepted ✅</h1>
          <div style="width: 50px; height: 3px; background-color: #28a745; margin: 0 auto;"></div>
        </div>

        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          Great news! <strong>${data.agencyName}</strong> has accepted your quotation.
        </p>

        <div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #155724; margin-top: 0;">Accepted Quotation:</h3>
          <ul style="color: #155724; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li><strong>Service:</strong> ${data.jobType}</li>
            <li><strong>Property:</strong> ${data.propertyAddress}</li>
            <li><strong>Amount:</strong> <span style="font-size: 18px; font-weight: bold;">$${data.amount}</span></li>
            ${data.responseNotes ? `<li><strong>Agency Notes:</strong> ${data.responseNotes}</li>` : ''}
          </ul>
        </div>

        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          The job and invoice have been automatically created. You can now assign a technician to complete this work.
        </p>

        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated notification from RentalEase CRM.
          </p>
        </div>

        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>RentalEase CRM System</strong>
        </p>
      </div>
    </div>
  `,
});

/**
 * Email template for quotation rejection notification to SuperUser
 * @param {Object} data - Template data
 * @param {string} data.agencyName - Agency name
 * @param {string} data.jobType - Type of job
 * @param {string} data.propertyAddress - Property address
 * @param {number} data.amount - Quotation amount
 * @param {string} data.responseNotes - Agency response notes
 * @returns {Object} - Email template configuration
 */
const quotationRejectedTemplate = (data) => ({
  subject: `Quotation Rejected by ${data.agencyName} - ${data.jobType}`,
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin-bottom: 10px;">Quotation Rejected</h1>
          <div style="width: 50px; height: 3px; background-color: #dc3545; margin: 0 auto;"></div>
        </div>

        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          <strong>${data.agencyName}</strong> has rejected your quotation for the following service:
        </p>

        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #721c24; margin-top: 0;">Rejected Quotation:</h3>
          <ul style="color: #721c24; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li><strong>Service:</strong> ${data.jobType}</li>
            <li><strong>Property:</strong> ${data.propertyAddress}</li>
            <li><strong>Amount:</strong> $${data.amount}</li>
            ${data.responseNotes ? `<li><strong>Agency Notes:</strong> ${data.responseNotes}</li>` : ''}
          </ul>
        </div>

        <p style="color: #333; line-height: 1.6; margin-bottom: 20px;">
          You may consider revising your quotation or reaching out to the agency for further discussion.
        </p>

        <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
          <p style="color: #666; font-size: 12px; margin: 0;">
            This is an automated notification from RentalEase CRM.
          </p>
        </div>

        <p style="color: #333; margin-top: 30px;">
          Best regards,<br>
          <strong>RentalEase CRM System</strong>
        </p>
      </div>
    </div>
  `,
});

// Create templates object with all email templates
const templates = {
  // Original templates
  welcome: welcomeTemplate,
  passwordResetOTP: passwordResetOTPTemplate,
  propertyManagerWelcome: propertyManagerWelcomeTemplate,
  propertyManagerPasswordResetOTP: propertyManagerPasswordResetOTPTemplate,

  // Staff templates
  staffWelcome: staffWelcomeTemplate,
  staffStatusUpdate: staffStatusUpdateTemplate,
  staffDocumentReminder: staffDocumentReminderTemplate,

  // Job templates
  jobAssignment: jobAssignmentTemplate,
  jobCreationNotification: jobCreationNotificationTemplate,
  jobAssignmentNotification: jobAssignmentNotificationTemplate,
  jobCompletionNotification: jobCompletionNotificationTemplate,

  // Credentials templates
  propertyManagerCredentials: propertyManagerCredentialsTemplate,
  agencyWelcome: agencyWelcomeTemplate,
  agencyPasswordResetOTP: agencyPasswordResetOTPTemplate,
  agencyCredentials: agencyCredentialsTemplate,
  agencyPaymentLink: agencyPaymentLinkTemplate,
  technicianCredentials: technicianCredentialsTemplate,
  teamMemberCredentials: teamMemberCredentialsTemplate,

  // Compliance templates
  complianceJobNotification: complianceJobNotificationTemplate,
  tenantInspectionBooking: tenantInspectionBookingTemplate,

  // Tenant booking templates
  tenantBookingRequest: tenantBookingRequestTemplate,
  tenantBookingConfirmation: tenantBookingConfirmationTemplate,
  complianceDue: complianceDueTemplate,
  general: generalTemplate,

  // Quotation templates
  quotationRequest: quotationRequestTemplate,
  quotationReceived: quotationReceivedTemplate,
  quotationAccepted: quotationAcceptedTemplate,
  quotationRejected: quotationRejectedTemplate,
};

export default templates;

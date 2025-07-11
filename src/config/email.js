const emailConfig = {
  resendApiKey: process.env.RESEND_API_KEY || '', // Fallback for development
  defaultFrom: process.env.EMAIL_FROM || 'onboarding@resend.dev',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@rentallease.com',
  environment: process.env.NODE_ENV || 'development'
};

export default emailConfig; 
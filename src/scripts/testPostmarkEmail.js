#!/usr/bin/env node

import "dotenv/config";

const recipient = process.argv[2] || process.env.TEST_EMAIL_TO;

const requiredEnvVars = [
  "EMAIL_FROM",
];

if (
  process.env.EMAIL_PROVIDER === "smtp" ||
  (!process.env.POSTMARK_SERVER_TOKEN && process.env.SMTP_USER)
) {
  requiredEnvVars.push("SMTP_HOST", "SMTP_PORT");
  const usesSmtpAuth = !!process.env.SMTP_USER || !!process.env.SMTP_PASSWORD;
  if (usesSmtpAuth) {
    requiredEnvVars.push("SMTP_USER", "SMTP_PASSWORD");
  }
} else {
  requiredEnvVars.push("POSTMARK_SERVER_TOKEN");
}

const missingEnvVars = requiredEnvVars.filter((key) => !process.env[key]);

if (!recipient) {
  console.error(
    "❌ Missing recipient. Run `pnpm test-postmark your@email.com` or set TEST_EMAIL_TO."
  );
  process.exit(1);
}

if (missingEnvVars.length > 0) {
  console.error(
    `❌ Missing required env vars: ${missingEnvVars.join(", ")}`
  );
  process.exit(1);
}

async function main() {
  const { default: emailService } = await import("../services/email.service.js");

  console.log("📧 Sending email test...");
  console.log(`From: ${emailService.defaultFrom}`);
  console.log(`Reply-To: ${emailService.defaultReplyTo}`);
  console.log(`To: ${recipient}`);
  console.log(`Provider: ${emailService.providerName}`);
  if (emailService.providerName === "postmark") {
    console.log(
      `Message stream: ${process.env.POSTMARK_MESSAGE_STREAM || "outbound"}`
    );
  }

  const result = await emailService.sendUserEmail({
    from: emailService.defaultFrom,
    to: [{ email: recipient }],
    subject: "RentalEase email test",
    bodyHtml: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Email test successful</h2>
        <p>This email was sent from the RentalEase backend.</p>
        <p><strong>Environment:</strong> ${process.env.NODE_ENV || "development"}</p>
        <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
      </div>
    `,
    bodyText: `Email test successful\nEnvironment: ${
      process.env.NODE_ENV || "development"
    }\nTimestamp: ${new Date().toISOString()}`,
  });

  console.log("✅ Provider accepted the message");
  console.log(`Message ID: ${result.id}`);
  if (result.submittedAt) {
    console.log(`Submitted At: ${result.submittedAt}`);
  }
}

main().catch((error) => {
  console.error("❌ Email test failed");
  console.error(error.message || error);
  if (error.response) {
    console.error(JSON.stringify(error.response, null, 2));
  }
  process.exit(1);
});

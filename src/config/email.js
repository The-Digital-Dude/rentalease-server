const DEFAULT_FROM_FALLBACK = "noreply@notify.rentalease.com.au";
const DEFAULT_SUPPORT_FALLBACK = "support@rentallease.com";

const sanitizeEmailValue = (value = "") =>
  String(value).replace(/[\r\n\t]/g, "").trim();

const isValidEmail = (value = "") =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizeEmailValue(value));

const resolveConfiguredEmail = ({
  rawValue,
  fallback,
  label,
  allowEmpty = false,
}) => {
  const sanitizedValue = sanitizeEmailValue(rawValue);

  if (!sanitizedValue) {
    if (!allowEmpty) {
      console.warn(
        `⚠️ ${label} is not configured. Falling back to ${fallback}.`
      );
    }
    return fallback;
  }

  if (!isValidEmail(sanitizedValue)) {
    console.warn(
      `⚠️ ${label} is invalid ("${sanitizedValue}"). Falling back to ${fallback}.`
    );
    return fallback;
  }

  return sanitizedValue;
};

const emailConfig = {
  emailProvider: sanitizeEmailValue(
    process.env.EMAIL_PROVIDER || "auto"
  ).toLowerCase(),
  postmarkServerToken: sanitizeEmailValue(
    process.env.POSTMARK_SERVER_TOKEN || ""
  ),
  postmarkMessageStream: sanitizeEmailValue(
    process.env.POSTMARK_MESSAGE_STREAM || "outbound"
  ),
  defaultFrom: resolveConfiguredEmail({
    rawValue: process.env.EMAIL_FROM,
    fallback: DEFAULT_FROM_FALLBACK,
    label: "EMAIL_FROM",
  }),
  supportEmail: resolveConfiguredEmail({
    rawValue: process.env.SUPPORT_EMAIL,
    fallback: DEFAULT_SUPPORT_FALLBACK,
    label: "SUPPORT_EMAIL",
  }),
  replyToEmail: resolveConfiguredEmail({
    rawValue: process.env.REPLY_TO_EMAIL || process.env.SUPPORT_EMAIL,
    fallback: DEFAULT_SUPPORT_FALLBACK,
    label: "REPLY_TO_EMAIL",
  }),
  smtpHost: sanitizeEmailValue(process.env.SMTP_HOST || "smtp.gmail.com"),
  smtpPort: Number(process.env.SMTP_PORT || 465),
  smtpSecure:
    sanitizeEmailValue(process.env.SMTP_SECURE || "true").toLowerCase() !==
    "false",
  smtpName: sanitizeEmailValue(
    process.env.SMTP_NAME || "rentalease.com.au"
  ),
  smtpUser: sanitizeEmailValue(process.env.SMTP_USER || ""),
  smtpPassword: sanitizeEmailValue(process.env.SMTP_PASSWORD || ""),
  smtpFrom: resolveConfiguredEmail({
    rawValue: process.env.SMTP_FROM || process.env.SMTP_USER,
    fallback: DEFAULT_SUPPORT_FALLBACK,
    label: "SMTP_FROM",
  }),
  postmarkWebhookUsername: sanitizeEmailValue(
    process.env.POSTMARK_WEBHOOK_USERNAME || ""
  ),
  postmarkWebhookPassword: sanitizeEmailValue(
    process.env.POSTMARK_WEBHOOK_PASSWORD || ""
  ),
  environment: process.env.NODE_ENV || "development",
};

export { sanitizeEmailValue, isValidEmail };
export default emailConfig;

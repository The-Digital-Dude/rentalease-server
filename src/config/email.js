const DEFAULT_FROM_FALLBACK = "onboarding@resend.dev";
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
  resendApiKey: sanitizeEmailValue(process.env.RESEND_API_KEY || ""),
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
  environment: process.env.NODE_ENV || "development",
};

export { sanitizeEmailValue, isValidEmail };
export default emailConfig;

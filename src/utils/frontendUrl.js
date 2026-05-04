const DEFAULT_PRODUCTION_FRONTEND_URL = "https://app.rentalease.com.au";
const DEFAULT_LOCAL_FRONTEND_URL = "http://localhost:5173";

const normalizeUrl = (value) => String(value || "").trim().replace(/\/+$/, "");

export const resolveFrontendUrl = () => {
  const configuredUrl = normalizeUrl(process.env.FRONTEND_URL);

  if (!configuredUrl) {
    return process.env.NODE_ENV === "production"
      ? DEFAULT_PRODUCTION_FRONTEND_URL
      : DEFAULT_LOCAL_FRONTEND_URL;
  }

  if (
    process.env.NODE_ENV === "production" &&
    /localhost|127\.0\.0\.1/i.test(configuredUrl)
  ) {
    return DEFAULT_PRODUCTION_FRONTEND_URL;
  }

  return configuredUrl;
};

export default resolveFrontendUrl;

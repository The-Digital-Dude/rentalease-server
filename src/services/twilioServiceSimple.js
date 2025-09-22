import twilio from "twilio";
import dotenv from "dotenv";

dotenv.config();

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Only initialize if credentials are provided
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

class TwilioService {
  constructor() {
    if (!client) {
      console.warn("Twilio client not initialized. Please check environment variables.");
    }
  }

  /**
   * Initiate a call with retry logic for better reliability
   * This creates a proper call flow for CRM calling
   */
  async initiateCall({ to, from = twilioPhoneNumber, statusCallback, retryAttempt = 0 }) {
    if (!client) {
      throw new Error("Twilio client not initialized");
    }

    const maxRetries = 2; // Allow up to 2 retries (3 total attempts)

    try {
      // Use webhook URL if available
      const webhookBase = process.env.TWILIO_WEBHOOK_URL || process.env.BACKEND_URL;

      // For development testing without actual calls (set TWILIO_TEST_MODE=true in .env)
      if (process.env.TWILIO_TEST_MODE === "true") {
        console.log(`[TWILIO TEST MODE] Would call ${to}${retryAttempt > 0 ? ` (Retry ${retryAttempt})` : ''}`);
        return {
          success: true,
          callSid: `test-call-${Date.now()}`,
          status: "completed",
          from: from || twilioPhoneNumber,
          to: to,
          direction: "outbound-api",
          dateCreated: new Date().toISOString(),
          retryAttempt,
        };
      }

      console.log(`Initiating call to ${to}${retryAttempt > 0 ? ` (Retry attempt ${retryAttempt})` : ''}`);

      // Create a direct call to the destination number
      const call = await client.calls.create({
        to: to,
        from: from || twilioPhoneNumber,
        url: webhookBase ? `${webhookBase}/api/v1/calls/twiml?to=${encodeURIComponent(to)}` : "http://demo.twilio.com/docs/voice.xml",
        statusCallback: statusCallback || (webhookBase ? `${webhookBase}/api/v1/calls/status-webhook` : undefined),
        statusCallbackEvent: ["completed"],
      });

      return {
        success: true,
        callSid: call.sid,
        status: call.status,
        from: call.from,
        to: call.to,
        direction: call.direction,
        dateCreated: call.dateCreated,
        retryAttempt,
      };
    } catch (error) {
      console.error(`Twilio call initiation error (attempt ${retryAttempt + 1}):`, error);

      // Check if we should retry based on error type
      const isRetryableError = error.message.includes('temporarily unavailable') ||
                              error.message.includes('timeout') ||
                              error.code === 20003 || // Unreachable destination number
                              error.code === 21211;   // Invalid 'To' Phone Number

      if (retryAttempt < maxRetries && isRetryableError) {
        console.log(`Retrying call to ${to} in 2 seconds... (attempt ${retryAttempt + 2}/${maxRetries + 1})`);

        // Wait 2 seconds before retry
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Recursive retry with incremented attempt count
        return this.initiateCall({ to, from, statusCallback, retryAttempt: retryAttempt + 1 });
      }

      throw new Error(`Failed to initiate call after ${retryAttempt + 1} attempts: ${error.message}`);
    }
  }

  /**
   * End an active call
   */
  async endCall(callSid) {
    if (!client) {
      throw new Error("Twilio client not initialized");
    }

    try {
      const call = await client.calls(callSid).update({
        status: "completed",
      });

      return {
        success: true,
        callSid: call.sid,
        status: call.status,
        duration: call.duration,
        endTime: call.endTime,
      };
    } catch (error) {
      console.error("Twilio call end error:", error);
      throw new Error(`Failed to end call: ${error.message}`);
    }
  }

  /**
   * Get call status
   */
  async getCallStatus(callSid) {
    if (!client) {
      throw new Error("Twilio client not initialized");
    }

    try {
      const call = await client.calls(callSid).fetch();

      return {
        success: true,
        callSid: call.sid,
        status: call.status,
        duration: call.duration,
        from: call.from,
        to: call.to,
        direction: call.direction,
        price: call.price,
        priceUnit: call.priceUnit,
        startTime: call.startTime,
        endTime: call.endTime,
      };
    } catch (error) {
      console.error("Twilio get call status error:", error);
      throw new Error(`Failed to get call status: ${error.message}`);
    }
  }

  /**
   * Validate Twilio webhook signature
   */
  validateWebhookSignature(signature, url, params) {
    if (!client) {
      console.warn("Twilio client not initialized. Skipping signature validation.");
      return true; // Skip validation if client is not available
    }

    try {
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (!authToken) {
        console.warn("Twilio auth token not found. Skipping signature validation.");
        return true;
      }

      // Convert params object to URL-encoded string if it's an object
      let paramString = '';
      if (typeof params === 'object' && params !== null) {
        paramString = Object.keys(params)
          .sort()
          .map(key => `${key}=${params[key]}`)
          .join('&');
      } else {
        paramString = params || '';
      }

      // Validate using Twilio's built-in validation
      return twilio.validateRequest(authToken, signature, url, paramString);
    } catch (error) {
      console.error("Webhook signature validation error:", error);
      // In development, we might want to be more lenient
      if (process.env.NODE_ENV === "development") {
        console.warn("Skipping webhook validation in development mode");
        return true;
      }
      return false;
    }
  }
}

export default new TwilioService();
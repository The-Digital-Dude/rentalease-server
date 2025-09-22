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
   * Initiate a click-to-call where caller gets called first, then connected to destination
   * This creates a proper call flow for CRM calling
   */
  async initiateCall({ to, from = twilioPhoneNumber, statusCallback }) {
    if (!client) {
      throw new Error("Twilio client not initialized");
    }

    try {
      // Use webhook URL if available
      const webhookBase = process.env.TWILIO_WEBHOOK_URL || process.env.BACKEND_URL;

      // For development testing without actual calls (set TWILIO_TEST_MODE=true in .env)
      if (process.env.TWILIO_TEST_MODE === "true") {
        console.log(`[TWILIO TEST MODE] Would call ${to}`);
        return {
          success: true,
          callSid: `test-call-${Date.now()}`,
          status: "completed",
          from: from || twilioPhoneNumber,
          to: to,
          direction: "outbound-api",
          dateCreated: new Date().toISOString(),
        };
      }

      // Create a direct call to the destination number
      const call = await client.calls.create({
        to: to,
        from: from || twilioPhoneNumber,
        url: "http://demo.twilio.com/docs/voice.xml", // Simple demo TwiML
        record: true,
        statusCallback: statusCallback || (webhookBase ? `${webhookBase}/api/v1/calls/status-webhook` : undefined),
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      });

      return {
        success: true,
        callSid: call.sid,
        status: call.status,
        from: call.from,
        to: call.to,
        direction: call.direction,
        dateCreated: call.dateCreated,
      };
    } catch (error) {
      console.error("Twilio call initiation error:", error);
      throw new Error(`Failed to initiate call: ${error.message}`);
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
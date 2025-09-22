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
  async initiateCall({ to, from = twilioPhoneNumber, callerPhone, statusCallback }) {
    if (!client) {
      throw new Error("Twilio client not initialized");
    }

    try {
      // Use ngrok URL if available
      const webhookBase = process.env.TWILIO_WEBHOOK_URL || process.env.BACKEND_URL;

      // Default caller phone (the verified number that should receive the call)
      const defaultCallerPhone = process.env.VERIFIED_CALLER_PHONE || "+8801620692839";
      const actualCallerPhone = callerPhone || defaultCallerPhone;

      // For development testing without actual calls (set TWILIO_TEST_MODE=true in .env)
      if (process.env.TWILIO_TEST_MODE === "true") {
        console.log(`[TWILIO TEST MODE] Would call ${actualCallerPhone} and connect to ${to}`);
        return {
          success: true,
          callSid: `test-call-${Date.now()}`,
          status: "completed",
          from: from || twilioPhoneNumber,
          to: actualCallerPhone,
          direction: "outbound-api",
          dateCreated: new Date().toISOString(),
        };
      }

      if (!webhookBase || webhookBase.includes("localhost")) {
        // For localhost testing, create a simple call to the caller
        const call = await client.calls.create({
          to: actualCallerPhone,
          from: from || twilioPhoneNumber,
          url: "http://demo.twilio.com/docs/voice.xml",
          record: true,
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
      }

      // Step 1: Call the caller (you) first
      const callerCall = await client.calls.create({
        to: actualCallerPhone, // Call your verified phone number
        from: from || twilioPhoneNumber,
        url: `${webhookBase}/api/v1/calls/twiml/connect?destination=${encodeURIComponent(to)}`,
        record: true,
        statusCallback: statusCallback || `${webhookBase}/api/v1/calls/status-webhook`,
        statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      });

      return {
        success: true,
        callSid: callerCall.sid,
        status: callerCall.status,
        from: callerCall.from,
        to: callerCall.to,
        direction: callerCall.direction,
        dateCreated: callerCall.dateCreated,
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
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
   * Initiate an outbound call
   * @param {Object} params - Call parameters
   * @param {string} params.to - The number to call
   * @param {string} params.from - The Twilio number to call from
   * @param {string} params.statusCallback - URL for status updates
   * @returns {Promise<Object>} - Twilio call object
   */
  async initiateCall({ to, from = twilioPhoneNumber, statusCallback }) {
    if (!client) {
      throw new Error("Twilio client not initialized");
    }

    try {
      // For development, we'll use Twilio's demo TwiML
      // In production, you'd use your actual server URL or ngrok for local testing
      const baseUrl = process.env.TWILIO_WEBHOOK_URL || process.env.BACKEND_URL || "http://localhost:4000";

      // Create inline TwiML that will handle the call
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('Connecting your call. This call may be recorded for quality purposes.');
      twiml.dial(to);

      // For local development, we'll use Twilio's TwiML Bin or a demo URL
      // In production, you would use ngrok or your actual server URL
      const twimlUrl = "http://demo.twilio.com/docs/voice.xml";

      const call = await client.calls.create({
        to,
        from: from || twilioPhoneNumber,
        url: twimlUrl, // TwiML instructions for the call
        // For local testing, comment out the statusCallback lines or use ngrok
        // statusCallback: statusCallback || `${baseUrl}/api/v1/calls/status-webhook`,
        // statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
        record: true, // Record the call
        // recordingStatusCallback: `${baseUrl}/api/v1/calls/recording-webhook`,
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
   * @param {string} callSid - The call SID to end
   * @returns {Promise<Object>} - Updated call object
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
   * @param {string} callSid - The call SID
   * @returns {Promise<Object>} - Call details
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
   * Get call recordings
   * @param {string} callSid - The call SID
   * @returns {Promise<Array>} - List of recordings
   */
  async getCallRecordings(callSid) {
    if (!client) {
      throw new Error("Twilio client not initialized");
    }

    try {
      const recordings = await client.recordings.list({
        callSid: callSid,
        limit: 20,
      });

      return recordings.map((recording) => ({
        recordingSid: recording.sid,
        duration: recording.duration,
        dateCreated: recording.dateCreated,
        uri: recording.uri,
        mediaUrl: `https://api.twilio.com${recording.uri.replace(".json", ".mp3")}`,
      }));
    } catch (error) {
      console.error("Twilio get recordings error:", error);
      throw new Error(`Failed to get call recordings: ${error.message}`);
    }
  }

  /**
   * Generate TwiML for incoming calls
   * @param {string} message - Message to say
   * @returns {string} - TwiML response
   */
  generateTwiML(message = "Connecting your call") {
    const response = new twilio.twiml.VoiceResponse();
    response.say(message);
    // You can add more TwiML commands here like dial, gather, etc.
    return response.toString();
  }

  /**
   * Validate Twilio webhook signature
   * @param {string} signature - The X-Twilio-Signature header
   * @param {string} url - The webhook URL
   * @param {Object} params - The request parameters
   * @returns {boolean} - Whether the signature is valid
   */
  validateWebhookSignature(signature, url, params) {
    if (!authToken) {
      console.warn("Cannot validate webhook without auth token");
      return false;
    }

    return twilio.validateRequest(authToken, signature, url, params);
  }

  /**
   * Get call logs for a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} - List of calls
   */
  async getCallLogs(startDate, endDate) {
    if (!client) {
      throw new Error("Twilio client not initialized");
    }

    try {
      const calls = await client.calls.list({
        startTimeAfter: startDate,
        startTimeBefore: endDate,
        limit: 100,
      });

      return calls.map((call) => ({
        callSid: call.sid,
        from: call.from,
        to: call.to,
        status: call.status,
        direction: call.direction,
        duration: call.duration,
        price: call.price,
        priceUnit: call.priceUnit,
        startTime: call.startTime,
        endTime: call.endTime,
      }));
    } catch (error) {
      console.error("Twilio get call logs error:", error);
      throw new Error(`Failed to get call logs: ${error.message}`);
    }
  }
}

export default new TwilioService();
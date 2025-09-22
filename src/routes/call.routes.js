import express from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import {
  initiateCall,
  endCall,
  getCallHistory,
  getCallDetails,
  updateCallNotes,
  handleStatusWebhook,
  handleRecordingWebhook,
  generateTwiML,
  generateConferenceTwiML,
  generateConnectTwiML,
  getCallStatistics,
} from "../controllers/call.controller.js";

const router = express.Router();

// Twilio webhook endpoints (no authentication required)
router.post("/status-webhook", handleStatusWebhook);
router.post("/recording-webhook", handleRecordingWebhook);
router.post("/twiml", generateTwiML);
router.get("/twiml", generateTwiML);
router.post("/twiml/conference", generateConferenceTwiML);
router.get("/twiml/conference", generateConferenceTwiML);
router.post("/twiml/connect", generateConnectTwiML);
router.get("/twiml/connect", generateConnectTwiML);

// Protected routes - require authentication
router.use(authenticate);

// Call management endpoints
router.post("/initiate", initiateCall);
router.post("/:callId/end", endCall);
router.get("/history", getCallHistory);
router.get("/statistics", getCallStatistics);
router.get("/:callId", getCallDetails);
router.patch("/:callId/notes", updateCallNotes);

export default router;
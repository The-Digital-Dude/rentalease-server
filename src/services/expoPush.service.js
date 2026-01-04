import { Expo } from "expo-server-sdk";
import Technician from "../models/Technician.js";

const expo = new Expo();

function uniqueStrings(values) {
  const set = new Set((values || []).filter(Boolean));
  return Array.from(set);
}

async function pruneInvalidTokens(technicianId, invalidTokens) {
  if (!technicianId || !invalidTokens?.length) {
    return;
  }
  try {
    await Technician.findByIdAndUpdate(technicianId, {
      $pull: { expoPushTokens: { $in: invalidTokens } },
    });
  } catch (error) {
    console.error("[ExpoPush] Failed to prune tokens:", error?.message || error);
  }
}

export async function sendToTechnician(technicianId, message) {
  if (!technicianId) return;

  const technician = await Technician.findById(technicianId).select("expoPushTokens");
  if (!technician) return;

  const tokens = uniqueStrings(technician.expoPushTokens).filter((t) =>
    Expo.isExpoPushToken(t)
  );
  if (!tokens.length) return;

  const notifications = tokens.map((to) => ({
    to,
    sound: "default",
    title: message?.title || "RentalEase",
    body: message?.body || "",
    data: message?.data || {},
  }));

  const chunks = expo.chunkPushNotifications(notifications);
  const tickets = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error("[ExpoPush] sendPushNotificationsAsync error:", error?.message || error);
    }
  }

  const receiptIds = tickets
    .filter((t) => t && t.status === "ok" && t.id)
    .map((t) => t.id);

  if (!receiptIds.length) return;

  const receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
  const invalid = new Set();

  for (const chunk of receiptIdChunks) {
    try {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);
      for (const receiptId of Object.keys(receipts)) {
        const receipt = receipts[receiptId];
        if (receipt.status === "error") {
          const details = receipt.details || {};
          if (details.error === "DeviceNotRegistered") {
            // We don't know which exact token maps to receiptId here, so we prune all tokens on repeated failures
            // by marking the technician for cleanup elsewhere. For now, log it.
            invalid.add("DeviceNotRegistered");
          }
          console.error("[ExpoPush] Receipt error:", {
            receiptId,
            message: receipt.message,
            details,
          });
        }
      }
    } catch (error) {
      console.error("[ExpoPush] getPushNotificationReceiptsAsync error:", error?.message || error);
    }
  }

  if (invalid.has("DeviceNotRegistered")) {
    // Conservative cleanup: keep tokens (Expo receipts don't map token reliably here).
    // If you want aggressive cleanup, we can store token->receiptId mapping.
  }
}


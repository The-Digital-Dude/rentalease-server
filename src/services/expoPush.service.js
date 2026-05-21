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
  if (!technicianId) {
    console.warn("[ExpoPush] Skipping push because technicianId is missing");
    return;
  }

  const technician = await Technician.findById(technicianId).select("expoPushTokens");
  if (!technician) {
    console.warn("[ExpoPush] Skipping push because technician was not found", {
      technicianId,
    });
    return;
  }

  const tokens = uniqueStrings(technician.expoPushTokens).filter((t) =>
    Expo.isExpoPushToken(t)
  );
  if (!tokens.length) {
    console.warn("[ExpoPush] No valid Expo push tokens found for technician", {
      technicianId,
      storedTokenCount: technician.expoPushTokens?.length || 0,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  console.log("[ExpoPush] Sending push notification", {
    technicianId,
    tokenCount: tokens.length,
    title: message?.title || "RentalEase",
    hasBody: Boolean(message?.body),
    timestamp: new Date().toISOString(),
  });

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
      ticketChunk.forEach((ticket, index) => {
        if (ticket?.status !== "ok") {
          console.error("[ExpoPush] Ticket error:", {
            technicianId,
            tokenPreview: `${chunk[index]?.to?.slice?.(0, 24) || "unknown"}...`,
            status: ticket?.status,
            message: ticket?.message,
            details: ticket?.details || null,
          });
        }
      });
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error("[ExpoPush] sendPushNotificationsAsync error:", error?.message || error);
    }
  }

  const receiptIds = tickets
    .filter((t) => t && t.status === "ok" && t.id)
    .map((t) => t.id);

  if (!receiptIds.length) {
    console.log("[ExpoPush] No successful ticket receipt IDs returned", {
      technicianId,
      ticketCount: tickets.length,
    });
    return;
  }

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
            technicianId,
            receiptId,
            message: receipt.message,
            details,
          });
        } else {
          console.log("[ExpoPush] Receipt ok:", {
            technicianId,
            receiptId,
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


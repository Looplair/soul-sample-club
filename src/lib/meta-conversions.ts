/**
 * Meta Conversions API - Server-side event tracking
 * Sends events directly to Meta's servers, bypassing ad blockers
 * and getting higher priority in Meta's attribution system.
 */

const META_PIXEL_ID = process.env.META_PIXEL_ID;
const META_ACCESS_TOKEN = process.env.META_CONVERSIONS_API_TOKEN;

interface MetaEventData {
  eventName: string;
  eventTime?: number;
  userData: {
    email?: string;
    firstName?: string;
    lastName?: string;
    externalId?: string;
  };
  customData?: {
    currency?: string;
    value?: number;
    content_name?: string;
  };
  eventSourceUrl?: string;
  actionSource?: "website" | "email" | "app" | "phone_call" | "chat" | "physical_store" | "system_generated" | "other";
}

// Hash function for PII (Meta requires SHA256 hashing)
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sendMetaConversionEvent(data: MetaEventData): Promise<boolean> {
  if (!META_PIXEL_ID || !META_ACCESS_TOKEN) {
    console.warn("Meta Conversions API not configured - missing PIXEL_ID or ACCESS_TOKEN");
    return false;
  }

  try {
    // Hash user data as required by Meta
    const hashedUserData: Record<string, string> = {};

    if (data.userData.email) {
      hashedUserData.em = await sha256(data.userData.email);
    }
    if (data.userData.firstName) {
      hashedUserData.fn = await sha256(data.userData.firstName);
    }
    if (data.userData.lastName) {
      hashedUserData.ln = await sha256(data.userData.lastName);
    }
    if (data.userData.externalId) {
      hashedUserData.external_id = await sha256(data.userData.externalId);
    }

    const eventPayload = {
      data: [
        {
          event_name: data.eventName,
          event_time: data.eventTime || Math.floor(Date.now() / 1000),
          action_source: data.actionSource || "website",
          event_source_url: data.eventSourceUrl || "https://www.soulsampleclub.com/feed",
          user_data: hashedUserData,
          custom_data: data.customData,
        },
      ],
    };

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventPayload),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("Meta Conversions API error:", result);
      return false;
    }

    console.log("Meta Conversions API success:", {
      eventName: data.eventName,
      eventsReceived: result.events_received,
    });

    return true;
  } catch (error) {
    console.error("Meta Conversions API error:", error);
    return false;
  }
}

/**
 * Send StartTrial event when a user starts a subscription
 */
export async function sendStartTrialEvent(params: {
  email: string;
  userId: string;
  firstName?: string;
}): Promise<boolean> {
  return sendMetaConversionEvent({
    eventName: "StartTrial",
    userData: {
      email: params.email,
      externalId: params.userId,
      firstName: params.firstName,
    },
    customData: {
      currency: "USD",
      value: 0.99,
      content_name: "Soul Sample Club Membership",
    },
    actionSource: "website",
  });
}

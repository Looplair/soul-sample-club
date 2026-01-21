/**
 * Klaviyo API Integration
 *
 * This module handles syncing users to Klaviyo for email marketing.
 * Docs: https://developers.klaviyo.com/en/reference/
 */

const KLAVIYO_API_URL = "https://a.klaviyo.com/api";
const KLAVIYO_API_VERSION = "2024-10-15";

interface KlaviyoProfile {
  email: string;
  first_name?: string;
  last_name?: string;
  properties?: Record<string, string | number | boolean | null>;
}

interface KlaviyoError {
  id: string;
  status: number;
  code: string;
  title: string;
  detail: string;
}

interface KlaviyoResponse {
  data?: unknown;
  errors?: KlaviyoError[];
}

/**
 * Get Klaviyo API headers
 */
function getHeaders(): HeadersInit {
  const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY;
  if (!apiKey) {
    throw new Error("KLAVIYO_PRIVATE_API_KEY is not configured");
  }

  return {
    Authorization: `Klaviyo-API-Key ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    revision: KLAVIYO_API_VERSION,
  };
}

/**
 * Update an existing profile in Klaviyo by ID
 */
async function updateProfile(
  profileId: string,
  profile: KlaviyoProfile
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${KLAVIYO_API_URL}/profiles/${profileId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({
        data: {
          type: "profile",
          id: profileId,
          attributes: {
            first_name: profile.first_name || undefined,
            last_name: profile.last_name || undefined,
            properties: profile.properties || {},
          },
        },
      }),
    });

    if (!response.ok) {
      const data: KlaviyoResponse = await response.json();
      console.error("Klaviyo updateProfile error:", data.errors);
      return {
        success: false,
        error: data.errors?.[0]?.detail || "Failed to update profile",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Klaviyo updateProfile exception:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Create or update a profile in Klaviyo
 */
export async function upsertProfile(profile: KlaviyoProfile): Promise<{ success: boolean; profileId?: string; error?: string }> {
  try {
    const response = await fetch(`${KLAVIYO_API_URL}/profiles`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        data: {
          type: "profile",
          attributes: {
            email: profile.email,
            first_name: profile.first_name || undefined,
            last_name: profile.last_name || undefined,
            properties: profile.properties || {},
          },
        },
      }),
    });

    const data: KlaviyoResponse = await response.json();

    if (!response.ok) {
      // Check if it's a duplicate profile error (profile already exists)
      if (data.errors?.[0]?.code === "duplicate_profile") {
        // Profile exists - get the ID and UPDATE the profile with new properties
        const existingProfileId = await getProfileByEmail(profile.email);
        if (existingProfileId) {
          // Actually update the existing profile with the new properties
          const updateResult = await updateProfile(existingProfileId, profile);
          if (updateResult.success) {
            return { success: true, profileId: existingProfileId };
          }
          return { success: false, error: updateResult.error };
        }
      }

      console.error("Klaviyo upsertProfile error:", data.errors);
      return {
        success: false,
        error: data.errors?.[0]?.detail || "Failed to create profile",
      };
    }

    const profileId = (data.data as { id: string })?.id;
    return { success: true, profileId };
  } catch (error) {
    console.error("Klaviyo upsertProfile exception:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get profile ID by email
 */
export async function getProfileByEmail(email: string): Promise<string | null> {
  try {
    const response = await fetch(
      `${KLAVIYO_API_URL}/profiles?filter=equals(email,"${encodeURIComponent(email)}")`,
      {
        method: "GET",
        headers: getHeaders(),
      }
    );

    const data: KlaviyoResponse = await response.json();

    if (!response.ok) {
      console.error("Klaviyo getProfileByEmail error:", data.errors);
      return null;
    }

    const profiles = data.data as Array<{ id: string }>;
    return profiles?.[0]?.id || null;
  } catch (error) {
    console.error("Klaviyo getProfileByEmail exception:", error);
    return null;
  }
}

/**
 * Subscribe profiles to a list
 */
export async function subscribeToList(
  emails: string[],
  listId?: string
): Promise<{ success: boolean; error?: string }> {
  const targetListId = listId || process.env.KLAVIYO_LIST_ID;

  if (!targetListId) {
    return { success: false, error: "KLAVIYO_LIST_ID is not configured" };
  }

  try {
    const response = await fetch(`${KLAVIYO_API_URL}/profile-subscription-bulk-create-jobs`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        data: {
          type: "profile-subscription-bulk-create-job",
          attributes: {
            profiles: {
              data: emails.map((email) => ({
                type: "profile",
                attributes: {
                  email,
                  subscriptions: {
                    email: {
                      marketing: {
                        consent: "SUBSCRIBED",
                      },
                    },
                  },
                },
              })),
            },
          },
          relationships: {
            list: {
              data: {
                type: "list",
                id: targetListId,
              },
            },
          },
        },
      }),
    });

    const data: KlaviyoResponse = await response.json();

    if (!response.ok) {
      console.error("Klaviyo subscribeToList error:", data.errors);
      return {
        success: false,
        error: data.errors?.[0]?.detail || "Failed to subscribe profiles",
      };
    }

    return { success: true };
  } catch (error) {
    console.error("Klaviyo subscribeToList exception:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Sync a single user to Klaviyo (create profile + subscribe to list)
 */
export async function syncUserToKlaviyo(user: {
  email: string;
  fullName?: string | null;
  subscriptionType?: "stripe_active" | "stripe_trialing" | "patreon" | "free" | "canceled";
  joinedAt?: string;
}): Promise<{ success: boolean; error?: string }> {
  // Check if Klaviyo is configured
  if (!process.env.KLAVIYO_PRIVATE_API_KEY) {
    console.log("Klaviyo not configured, skipping sync");
    return { success: true }; // Don't treat as error if not configured
  }

  // Parse name
  const nameParts = user.fullName?.split(" ") || [];
  const firstName = nameParts[0] || undefined;
  const lastName = nameParts.slice(1).join(" ") || undefined;

  // Create/update profile with custom properties
  const profileResult = await upsertProfile({
    email: user.email,
    first_name: firstName,
    last_name: lastName,
    properties: {
      subscription_type: user.subscriptionType || "free",
      joined_at: user.joinedAt || new Date().toISOString(),
      source: "soul_sample_club",
    },
  });

  if (!profileResult.success) {
    return { success: false, error: profileResult.error };
  }

  // Subscribe to default list if configured
  if (process.env.KLAVIYO_LIST_ID) {
    const subscribeResult = await subscribeToList([user.email]);
    if (!subscribeResult.success) {
      console.warn("Failed to subscribe user to list:", subscribeResult.error);
      // Don't fail the whole sync if subscription fails
    }
  }

  return { success: true };
}

/**
 * Bulk sync multiple users to Klaviyo
 */
export async function bulkSyncUsersToKlaviyo(
  users: Array<{
    email: string;
    fullName?: string | null;
    subscriptionType?: "stripe_active" | "stripe_trialing" | "patreon" | "free" | "canceled";
    joinedAt?: string;
  }>
): Promise<{ success: boolean; synced: number; failed: number; errors: string[] }> {
  if (!process.env.KLAVIYO_PRIVATE_API_KEY) {
    return { success: false, synced: 0, failed: 0, errors: ["Klaviyo not configured"] };
  }

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  // Process in batches of 100 (Klaviyo recommendation)
  const batchSize = 100;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);

    for (const user of batch) {
      const result = await syncUserToKlaviyo(user);
      if (result.success) {
        synced++;
      } else {
        failed++;
        if (result.error) {
          errors.push(`${user.email}: ${result.error}`);
        }
      }
    }

    // Small delay between batches to respect rate limits
    if (i + batchSize < users.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return {
    success: failed === 0,
    synced,
    failed,
    errors: errors.slice(0, 10), // Only return first 10 errors
  };
}

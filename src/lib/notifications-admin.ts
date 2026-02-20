/**
 * Admin notifications - sends alerts to you when important events happen
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = "hello@soulsampleclub.com";
const FROM_EMAIL = "Soul Sample Club <noreply@soulsampleclub.com>";

interface SendEmailParams {
  subject: string;
  html: string;
}

async function sendAdminEmail({ subject, html }: SendEmailParams): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured - skipping admin notification");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Resend API error:", error);
      return false;
    }

    console.log("Admin notification sent:", subject);
    return true;
  } catch (error) {
    console.error("Failed to send admin notification:", error);
    return false;
  }
}

/**
 * Notify when someone starts a free trial
 */
export async function notifyNewTrial(params: {
  email: string;
  name?: string | null;
}): Promise<boolean> {
  const { email, name } = params;

  return sendAdminEmail({
    subject: `🎉 New Trial: ${name || email}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">
        <h2 style="color: #1a1a1a; margin-bottom: 20px;">New Free Trial Signup</h2>
        <p style="color: #333; font-size: 16px; margin-bottom: 10px;">
          <strong>Email:</strong> ${email}
        </p>
        ${name ? `<p style="color: #333; font-size: 16px; margin-bottom: 10px;"><strong>Name:</strong> ${name}</p>` : ""}
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          They've just started their subscription ($0.99 first month).
        </p>
      </div>
    `,
  });
}

/**
 * Notify when someone converts from trial to paid
 */
export async function notifyTrialConverted(params: {
  email: string;
  name?: string | null;
}): Promise<boolean> {
  const { email, name } = params;

  return sendAdminEmail({
    subject: `💰 Trial Converted: ${name || email}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">
        <h2 style="color: #1a1a1a; margin-bottom: 20px;">Trial Converted to Paid</h2>
        <p style="color: #333; font-size: 16px; margin-bottom: 10px;">
          <strong>Email:</strong> ${email}
        </p>
        ${name ? `<p style="color: #333; font-size: 16px; margin-bottom: 10px;"><strong>Name:</strong> ${name}</p>` : ""}
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          Their trial has ended and they're now a paying member! 🎉
        </p>
      </div>
    `,
  });
}

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface InviteEmailParams {
  to: string;
  organizationName: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
}

export async function sendInviteEmail({
  to,
  organizationName,
  inviterName,
  role,
  inviteUrl,
}: InviteEmailParams) {
  const roleLabel = role === "ADMIN" ? "an admin" : "a team member";

  const { data, error } = await resend.emails.send({
    from: "GO4IT <noreply@go4it.live>",
    to,
    subject: `You've been invited to join ${organizationName} on GO4IT`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="font-size: 28px; font-weight: 800; background: linear-gradient(to right, #f97316, #ec4899, #9333ea); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0;">
                GO4IT
              </h1>
            </div>

            <h2 style="font-size: 20px; color: #111827; margin-bottom: 16px;">
              You're invited!
            </h2>

            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
              <strong>${inviterName}</strong> has invited you to join <strong>${organizationName}</strong> as ${roleLabel} on GO4IT.
            </p>

            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 32px;">
              GO4IT is a platform for deploying and using SaaS apps for your business. Click the button below to accept this invitation.
            </p>

            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #ec4899, #9333ea); color: white; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
                Accept Invitation
              </a>
            </div>

            <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">
              This invitation will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              GO4IT · Free software tools to help small businesses do big things.
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error("Failed to send invite email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

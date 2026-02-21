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
              <h1 style="display: inline-block; font-size: 28px; font-weight: 800; color: #ffffff; background: linear-gradient(135deg, #f97316, #ec4899, #9333ea); padding: 8px 24px; border-radius: 8px; margin: 0;">
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

interface PasswordResetEmailParams {
  to: string;
  resetUrl: string;
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: PasswordResetEmailParams) {
  const { data, error } = await resend.emails.send({
    from: "GO4IT <noreply@go4it.live>",
    to,
    subject: "Reset your GO4IT password",
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
              <h1 style="display: inline-block; font-size: 28px; font-weight: 800; color: #ffffff; background: linear-gradient(135deg, #f97316, #ec4899, #9333ea); padding: 8px 24px; border-radius: 8px; margin: 0;">
                GO4IT
              </h1>
            </div>

            <h2 style="font-size: 20px; color: #111827; margin-bottom: 16px;">
              Reset your password
            </h2>

            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
              We received a request to reset the password for your GO4IT account. Click the button below to choose a new password.
            </p>

            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #ec4899, #9333ea); color: white; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
                Reset Password
              </a>
            </div>

            <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">
              This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              GO4IT &middot; Free software tools to help small businesses do big things.
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error("Failed to send password reset email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

interface VerificationEmailParams {
  to: string;
  verificationUrl: string;
}

export async function sendVerificationEmail({
  to,
  verificationUrl,
}: VerificationEmailParams) {
  const { data, error } = await resend.emails.send({
    from: "GO4IT <noreply@go4it.live>",
    to,
    subject: "Verify your GO4IT account",
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
              <h1 style="display: inline-block; font-size: 28px; font-weight: 800; color: #ffffff; background: linear-gradient(135deg, #f97316, #ec4899, #9333ea); padding: 8px 24px; border-radius: 8px; margin: 0;">
                GO4IT
              </h1>
            </div>

            <h2 style="font-size: 20px; color: #111827; margin-bottom: 16px;">
              Verify your email
            </h2>

            <p style="color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
              Thanks for signing up for GO4IT! Click the button below to verify your email address and get started.
            </p>

            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #ec4899, #9333ea); color: white; font-weight: 600; padding: 14px 32px; border-radius: 8px; text-decoration: none;">
                Verify Email
              </a>
            </div>

            <p style="color: #9ca3af; font-size: 14px; line-height: 1.6;">
              This link will expire in 24 hours. If you didn't create a GO4IT account, you can safely ignore this email.
            </p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 32px 0;">

            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              GO4IT &middot; Free software tools to help small businesses do big things.
            </p>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    console.error("Failed to send verification email:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}

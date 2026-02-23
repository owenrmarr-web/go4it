import { Resend } from "resend";
import { generateIcs } from "@/lib/ics";
import { formatDateTime, formatTimeInTz } from "@/lib/date-utils";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface BookingEmailData {
  customerName: string;
  customerEmail: string;
  serviceName: string;
  providerName: string;
  startTime: Date;
  endTime: Date;
  amountPaid?: number;
  manageToken: string;
  businessName: string;
  timezone: string;
}

export async function sendBookingConfirmation(data: BookingEmailData) {
  if (!resend) {
    console.log("RESEND_API_KEY not set, skipping email:", data.customerEmail);
    return;
  }

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const manageUrl = `${baseUrl}/book/manage/${data.manageToken}`;
  const startFormatted = formatDateTime(data.startTime, data.timezone);
  const timeFormatted = formatTimeInTz(data.startTime, data.timezone);
  const endTimeFormatted = formatTimeInTz(data.endTime, data.timezone);

  const icsContent = generateIcs({
    title: `${data.serviceName} at ${data.businessName}`,
    description: `Appointment with ${data.providerName}`,
    startTime: data.startTime,
    endTime: data.endTime,
    organizerName: data.businessName,
  });

  await resend.emails.send({
    from: `${data.businessName} <noreply@go4it.live>`,
    to: data.customerEmail,
    subject: `Booking Confirmed - ${data.serviceName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #7c3aed;">Booking Confirmed</h2>
        <p>Hi ${data.customerName},</p>
        <p>Your appointment has been confirmed:</p>
        <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Service:</strong> ${data.serviceName}</p>
          <p style="margin: 4px 0;"><strong>Provider:</strong> ${data.providerName}</p>
          <p style="margin: 4px 0;"><strong>Date:</strong> ${startFormatted}</p>
          <p style="margin: 4px 0;"><strong>Time:</strong> ${timeFormatted} - ${endTimeFormatted}</p>
          ${data.amountPaid ? `<p style="margin: 4px 0;"><strong>Paid:</strong> $${data.amountPaid.toFixed(2)}</p>` : ""}
        </div>
        <p>
          <a href="${manageUrl}" style="display: inline-block; background: #7c3aed; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none;">
            Manage Booking
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          Need to cancel or reschedule? Use the button above or visit:<br>
          <a href="${manageUrl}">${manageUrl}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
        <p style="color: #9ca3af; font-size: 12px;">
          ${data.businessName} — Powered by GO4IT
        </p>
      </div>
    `,
    attachments: [
      {
        filename: "appointment.ics",
        content: Buffer.from(icsContent).toString("base64"),
        contentType: "text/calendar",
      },
    ],
  });
}

export async function sendCancellationNotification(data: {
  providerEmail: string;
  providerName: string;
  customerName: string;
  serviceName: string;
  startTime: Date;
  businessName: string;
  timezone: string;
  reason?: string;
}) {
  if (!resend) {
    console.log("RESEND_API_KEY not set, skipping cancellation email");
    return;
  }

  const timeFormatted = formatDateTime(data.startTime, data.timezone);

  await resend.emails.send({
    from: `${data.businessName} <noreply@go4it.live>`,
    to: data.providerEmail,
    subject: `Appointment Cancelled - ${data.customerName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Appointment Cancelled</h2>
        <p>Hi ${data.providerName},</p>
        <p>The following appointment has been cancelled:</p>
        <div style="background: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Customer:</strong> ${data.customerName}</p>
          <p style="margin: 4px 0;"><strong>Service:</strong> ${data.serviceName}</p>
          <p style="margin: 4px 0;"><strong>Was scheduled:</strong> ${timeFormatted}</p>
          ${data.reason ? `<p style="margin: 4px 0;"><strong>Reason:</strong> ${data.reason}</p>` : ""}
        </div>
        <p style="color: #6b7280;">This time slot is now available for new bookings.</p>
      </div>
    `,
  });
}

export async function sendRescheduleNotification(data: {
  providerEmail: string;
  providerName: string;
  customerName: string;
  serviceName: string;
  oldStartTime: Date;
  newStartTime: Date;
  newEndTime: Date;
  businessName: string;
  timezone: string;
}) {
  if (!resend) {
    console.log("RESEND_API_KEY not set, skipping reschedule email");
    return;
  }

  const oldTimeFormatted = formatDateTime(data.oldStartTime, data.timezone);
  const newTimeFormatted = formatDateTime(data.newStartTime, data.timezone);

  await resend.emails.send({
    from: `${data.businessName} <noreply@go4it.live>`,
    to: data.providerEmail,
    subject: `Appointment Rescheduled - ${data.customerName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">Appointment Rescheduled</h2>
        <p>Hi ${data.providerName},</p>
        <p>${data.customerName} has rescheduled their appointment:</p>
        <div style="background: #fffbeb; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Service:</strong> ${data.serviceName}</p>
          <p style="margin: 4px 0; text-decoration: line-through; color: #9ca3af;"><strong>Was:</strong> ${oldTimeFormatted}</p>
          <p style="margin: 4px 0;"><strong>Now:</strong> ${newTimeFormatted}</p>
        </div>
      </div>
    `,
  });
}

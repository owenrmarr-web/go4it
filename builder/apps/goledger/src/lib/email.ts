import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface SendInvoiceEmailParams {
  to: string;
  businessName: string;
  invoiceNumber: string;
  total: number;
  dueDate: Date;
  paymentUrl: string;
  memo?: string | null;
}

export async function sendInvoiceEmail({
  to,
  businessName,
  invoiceNumber,
  total,
  dueDate,
  paymentUrl,
  memo,
}: SendInvoiceEmailParams) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping email");
    return null;
  }

  const dueDateStr = dueDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const { data, error } = await resend.emails.send({
    from: `${businessName} via GoLedger <noreply@go4it.live>`,
    to,
    subject: `Invoice ${invoiceNumber} from ${businessName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin: 0;">${businessName}</h1>
        </div>

        <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px;">Invoice</p>
          <p style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 24px;">${invoiceNumber}</p>

          <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
            <div>
              <p style="color: #6b7280; font-size: 13px; margin: 0;">Amount Due</p>
              <p style="font-size: 28px; font-weight: 700; color: #111827; margin: 4px 0 0;">$${total.toFixed(2)}</p>
            </div>
            <div style="text-align: right;">
              <p style="color: #6b7280; font-size: 13px; margin: 0;">Due Date</p>
              <p style="font-size: 16px; font-weight: 600; color: #111827; margin: 4px 0 0;">${dueDateStr}</p>
            </div>
          </div>

          ${memo ? `<p style="color: #6b7280; font-size: 14px; margin: 16px 0 0; padding-top: 16px; border-top: 1px solid #e5e7eb;">${memo}</p>` : ""}
        </div>

        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${paymentUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #ec4899, #8b5cf6); color: white; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 10px; text-decoration: none;">
            View & Pay Invoice
          </a>
        </div>

        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          Powered by <a href="https://go4it.live" style="color: #8b5cf6; text-decoration: none;">GoLedger</a>
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Failed to send invoice email:", error);
    throw new Error(`Email failed: ${error.message}`);
  }

  return data;
}

interface SendReminderEmailParams {
  to: string;
  businessName: string;
  invoiceNumber: string;
  balanceDue: number;
  dueDate: Date;
  daysOverdue: number;
  paymentUrl: string;
}

export async function sendPaymentReminderEmail({
  to,
  businessName,
  invoiceNumber,
  balanceDue,
  dueDate,
  daysOverdue,
  paymentUrl,
}: SendReminderEmailParams) {
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping reminder email");
    return null;
  }

  const dueDateStr = dueDate.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const urgency = daysOverdue > 60 ? "Final Notice" : daysOverdue > 30 ? "Second Reminder" : "Friendly Reminder";
  const urgencyColor = daysOverdue > 60 ? "#dc2626" : daysOverdue > 30 ? "#f59e0b" : "#6b7280";

  const { data, error } = await resend.emails.send({
    from: `${businessName} via GoLedger <noreply@go4it.live>`,
    to,
    subject: `${urgency}: Invoice ${invoiceNumber} is ${daysOverdue} days overdue`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 24px; font-weight: 700; color: #111827; margin: 0;">${businessName}</h1>
        </div>

        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center;">
          <p style="color: ${urgencyColor}; font-weight: 600; font-size: 14px; margin: 0;">
            ${urgency} — ${daysOverdue} days past due
          </p>
        </div>

        <div style="background: #f9fafb; border-radius: 12px; padding: 32px; margin-bottom: 24px;">
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px;">Invoice ${invoiceNumber}</p>

          <div style="display: flex; justify-content: space-between;">
            <div>
              <p style="color: #6b7280; font-size: 13px; margin: 0;">Balance Due</p>
              <p style="font-size: 28px; font-weight: 700; color: #dc2626; margin: 4px 0 0;">$${balanceDue.toFixed(2)}</p>
            </div>
            <div style="text-align: right;">
              <p style="color: #6b7280; font-size: 13px; margin: 0;">Due Date</p>
              <p style="font-size: 16px; font-weight: 600; color: #dc2626; margin: 4px 0 0;">${dueDateStr}</p>
            </div>
          </div>
        </div>

        <p style="color: #4b5563; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
          This is a reminder that payment for the above invoice is overdue. Please settle the outstanding balance at your earliest convenience.
        </p>

        <div style="text-align: center; margin-bottom: 32px;">
          <a href="${paymentUrl}" style="display: inline-block; background: linear-gradient(135deg, #f97316, #ec4899, #8b5cf6); color: white; font-weight: 600; font-size: 16px; padding: 14px 32px; border-radius: 10px; text-decoration: none;">
            Pay Now
          </a>
        </div>

        <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
          If you have already sent payment, please disregard this notice.<br/>
          Powered by <a href="https://go4it.live" style="color: #8b5cf6; text-decoration: none;">GoLedger</a>
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Failed to send reminder email:", error);
    throw new Error(`Reminder email failed: ${error.message}`);
  }

  return data;
}

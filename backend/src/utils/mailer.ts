import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.smtp.host || !env.smtp.user || !env.smtp.password) {
    return null;
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: env.smtp.secure,
      auth: { user: env.smtp.user, pass: env.smtp.password },
    });
  }
  return transporter;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Sends transactional email when SMTP is configured. When it is not
 * configured the application records the intent in the server log and keeps
 * working; the feature should not be described as "email enabled" until SMTP
 * credentials have been supplied and a message has been delivered.
 */
export async function sendMail(message: MailMessage): Promise<{ delivered: boolean; reason?: string }> {
  const client = getTransporter();
  if (!client) {
    console.error("[mailer] SMTP is not configured; email was not sent.");
    return { delivered: false, reason: "SMTP is not configured" };
  }
  try {
    await client.sendMail({
      from: env.smtp.from || env.smtp.user,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return { delivered: true };
  } catch (error) {
    console.error("[mailer] failed to send email:", error instanceof Error ? error.message : error);
    return { delivered: false, reason: "Email delivery failed" };
  }
}

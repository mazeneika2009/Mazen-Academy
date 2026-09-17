import nodemailer from 'nodemailer';
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } from '../config/index.js';

let transporter = null;

export async function sendOTPEmail(to, otp, subject, bodyText) {
  const host = SMTP_HOST;
  const port = SMTP_PORT;
  const user = SMTP_USER;
  const pass = SMTP_PASS;
  const from = SMTP_FROM;

  console.log(`[SMTP] Attempting to send OTP email to: ${to}`);

  if (!host || !user || !pass) {
    console.warn('[SMTP] Missing SMTP credentials in environment variables. Falling back to Mock Box.');
    return { success: false, reason: 'credentials_missing', message: 'SMTP environment variables (HOST, USER, PASS) are not defined in your .env file.' };
  }

  try {
    if (!transporter) {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
      });
    }

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: bodyText,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 20px; background-color: #0c101d; color: #f3f4f6; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          <div style="text-align: center; margin-bottom: 30px; border-bottom: 1px solid rgba(168, 85, 247, 0.15); padding-bottom: 20px;">
            <h1 style="color: #c084fc; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.025em;">Mazen Academy</h1>
            <p style="font-size: 11px; color: #a78bfa; text-transform: uppercase; letter-spacing: 0.15em; margin: 5px 0 0 0;">Secure Identity Systems & CDN Node</p>
          </div>
          <div style="padding: 10px 0;">
            <p style="font-size: 15px; line-height: 1.6; color: #e5e7eb;">Dear Student,</p>
            <p style="font-size: 14px; line-height: 1.6; color: #9ca3af;">A verification code has been requested for your account. Enter the code below to complete the verification:</p>
            <div style="text-align: center; margin: 35px 0;">
              <p style="font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.12em; color: #a78bfa; margin-bottom: 10px;">Verification Code (OTP)</p>
              <div style="display: inline-block; background-color: rgba(168, 85, 247, 0.1); border: 2px dashed #a855f7; padding: 15px 40px; font-size: 32px; font-weight: 900; letter-spacing: 0.25em; color: #e9d5ff; border-radius: 14px; font-family: 'Courier New', Courier, monospace; text-shadow: 0 0 10px rgba(168, 85, 247, 0.3);">
                ${otp}
              </div>
            </div>
            <p style="font-size: 13px; color: #9ca3af; line-height: 1.6; font-style: italic; background-color: rgba(255,255,255,0.02); padding: 15px; border-radius: 10px; border-left: 3px solid #a855f7;">
              ${bodyText.replace(/\n/g, '<br />')}
            </p>
          </div>
          <p style="font-size: 10px; text-align: center; color: #6b7280; margin-top: 35px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 15px;">
            This is an automated message from the Mazen Academy Platform. Please do not reply directly to this email.
          </p>
        </div>
      `,
    });

    console.log(`[SMTP] Email sent successfully: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[SMTP ERROR] Failed to send email via nodemailer:', error);
    return { success: false, reason: 'nodemailer_error', message: `SMTP Transport Error: ${error.message}` };
  }
}

export async function sendEmail(to, subject, textHtml, textPlain) {
  const host = SMTP_HOST;
  const port = SMTP_PORT;
  const user = SMTP_USER;
  const pass = SMTP_PASS;
  const from = SMTP_FROM;
  if (!host || !user || !pass) {
    console.warn('[SMTP] Missing credentials, skipping real email. Payment notification saved to mock inbox.');
    return { success: false, reason: 'credentials_missing' };
  }
  try {
    const t = nodemailer.createTransport({
      host, port, secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });
    const info = await t.sendMail({
      from, to, subject,
      text: textPlain || textHtml.replace(/<[^>]+>/g, ''),
      html: textHtml
    });
    console.log(`[SMTP] Payment email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[SMTP ERROR] Failed to send payment email via real SMTP:', error.message);
    console.log('[SMTP] Payment notification is still available in the mock inbox.');
    return { success: false, reason: 'nodemailer_error', message: error.message };
  }
}

import nodemailer from 'nodemailer';
import {
  getVerificationEmailContent,
  getPasswordResetEmailContent,
  getWelcomeEmailContent,
} from '../templates/emailTemplates.js';

// In-memory capture for test assertions
let testEmailInbox = [];

export const _getSentEmails = () => [...testEmailInbox];
export const _clearSentEmails = () => {
  testEmailInbox = [];
};

/**
 * Check if functional SMTP credentials are provided in the environment
 */
export const isSmtpConfigured = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) return false;
  if (user === 'your_email@gmail.com' || user === 'your-sender@gmail.com') return false;
  if (pass === 'your_email_app_password' || pass === 'your-gmail-app-password') return false;
  return true;
};

/**
 * Returns frontend base URL from environment
 */
export const getFrontendBaseUrl = () => {
  return process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:5173';
};

/**
 * Creates Nodemailer transporter
 */
const createTransporter = () => {
  const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const secure = process.env.EMAIL_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 10000, // 10s
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
};

/**
 * Core send routine with sanitized error handling & test capturing
 */
export const sendMail = async ({ to, subject, html, text }) => {
  if (!to || !subject) {
    throw new Error('Recipient address and subject are required for email dispatch.');
  }

  const isTest = process.env.NODE_ENV === 'test';
  const configured = isSmtpConfigured();

  // Test mode or unconfigured credentials: capture and simulate safely
  if (isTest || !configured) {
    testEmailInbox.push({
      to,
      subject,
      text,
      htmlSnippet: html ? html.substring(0, 200) : '',
      timestamp: new Date(),
    });

    if (!isTest) {
      console.log(`[EmailService:Simulated] Email to: ${to} | Subject: "${subject}" (SMTP credentials not configured)`);
    }

    return {
      success: true,
      simulated: true,
      messageId: `simulated-${Date.now()}`,
    };
  }

  // Live SMTP send
  try {
    const transporter = createTransporter();
    const fromAddress = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const fromName = process.env.EMAIL_FROM_NAME || 'MedScan-NCD Platform';

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to,
      subject,
      text,
      html,
    });

    console.log(`[EmailService] Dispatched email to ${to} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    // Sanitize log: log operational error reason without sensitive details
    console.error(`[EmailService] SMTP delivery failed to ${to}: ${error.code || error.message}`);
    return {
      success: false,
      error: 'Email delivery failed due to network or provider error.',
    };
  }
};

/**
 * Send email verification link
 */
export const sendVerificationEmail = async ({ to, name, token, expiryMinutes = 30 }) => {
  const baseUrl = getFrontendBaseUrl();
  const verificationUrl = `${baseUrl}/verify-email?token=${token}`;
  const { html, text } = getVerificationEmailContent({ name, verificationUrl, expiryMinutes });

  return await sendMail({
    to,
    subject: 'Verify your email address — MedScan-NCD',
    html,
    text,
  });
};

/**
 * Send password reset link
 */
export const sendPasswordResetEmail = async ({ to, name, token, expiryMinutes = 15 }) => {
  const baseUrl = getFrontendBaseUrl();
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  const { html, text } = getPasswordResetEmailContent({ name, resetUrl, expiryMinutes });

  return await sendMail({
    to,
    subject: 'Password reset request — MedScan-NCD',
    html,
    text,
  });
};

/**
 * Send welcome / email verified notification
 */
export const sendWelcomeEmail = async ({ to, name }) => {
  const baseUrl = getFrontendBaseUrl();
  const loginUrl = `${baseUrl}/login`;
  const { html, text } = getWelcomeEmailContent({ name, loginUrl });

  return await sendMail({
    to,
    subject: 'Welcome to MedScan-NCD — Your account is active',
    html,
    text,
  });
};

/**
 * Diagnostic method to verify SMTP connection
 */
export const verifySmtpConnection = async () => {
  if (!isSmtpConfigured()) {
    return { configured: false, status: 'SMTP credentials not configured (simulation mode active)' };
  }
  try {
    const transporter = createTransporter();
    await transporter.verify();
    return { configured: true, status: 'SMTP connection verified successfully' };
  } catch (error) {
    return { configured: true, status: `SMTP connection failed: ${error.message}` };
  }
};

/**
 * MedScan-NCD Responsive Email Templates
 * Accessible, medical-grade HTML email layouts with plain-text counterparts.
 */

const baseStyles = `
  body {
    margin: 0;
    padding: 0;
    background-color: #0b1329;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #e2e8f0;
  }
  .container {
    max-width: 580px;
    margin: 30px auto;
    background-color: #111c38;
    border: 1px solid #1e293b;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4);
  }
  .header {
    background: linear-gradient(135deg, #0e7490 0%, #4338ca 100%);
    padding: 28px 32px;
    text-align: left;
  }
  .logo {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.5px;
    color: #ffffff;
    text-transform: uppercase;
  }
  .logo span {
    color: #38bdf8;
  }
  .tagline {
    font-size: 11px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #cbd5e1;
    margin-top: 4px;
  }
  .content {
    padding: 32px;
    font-size: 14px;
    line-height: 1.6;
    color: #cbd5e1;
  }
  .greeting {
    font-size: 18px;
    font-weight: 700;
    color: #f8fafc;
    margin-bottom: 12px;
  }
  .btn-wrapper {
    margin: 28px 0;
    text-align: center;
  }
  .btn {
    display: inline-block;
    padding: 14px 32px;
    background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);
    color: #ffffff !important;
    text-decoration: none;
    font-weight: 700;
    font-size: 14px;
    border-radius: 10px;
    box-shadow: 0 4px 14px rgba(2, 132, 199, 0.35);
  }
  .note {
    background-color: #0b1329;
    border: 1px solid #1e293b;
    border-left: 4px solid #38bdf8;
    border-radius: 8px;
    padding: 14px 16px;
    font-size: 12px;
    color: #94a3b8;
    margin: 20px 0;
    line-height: 1.5;
  }
  .url-fallback {
    word-break: break-all;
    font-size: 11px;
    color: #64748b;
    margin-top: 20px;
  }
  .url-fallback a {
    color: #38bdf8;
    text-decoration: none;
  }
  .footer {
    border-top: 1px solid #1e293b;
    padding: 20px 32px;
    font-size: 11px;
    color: #64748b;
    text-align: center;
    background-color: #0b1329;
  }
`;

export const getVerificationEmailContent = ({ name, verificationUrl, expiryMinutes = 30 }) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify your MedScan-NCD account</title>
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">MedScan<span>-NCD</span></div>
          <div class="tagline">Clinical AI & Medical Intelligence Platform</div>
        </div>
        <div class="content">
          <div class="greeting">Hello ${name || 'Patient'},</div>
          <p>
            Thank you for registering with <strong>MedScan-NCD</strong>. To activate your account and start managing your health reports and non-communicable disease risk predictions securely, please verify your email address.
          </p>

          <div class="btn-wrapper">
            <a href="${verificationUrl}" class="btn" target="_blank" rel="noopener noreferrer">Verify Email Address</a>
          </div>

          <div class="note">
            <strong>Security Notice:</strong> This verification link is single-use and will expire in <strong>${expiryMinutes} minutes</strong>. If you did not create this account, you can safely disregard this email.
          </div>

          <div class="url-fallback">
            If the button above does not work, copy and paste this link into your browser:<br>
            <a href="${verificationUrl}">${verificationUrl}</a>
          </div>
        </div>
        <div class="footer">
          MedScan-NCD — Secure Non-Communicable Disease Surveillance & Risk Prediction<br>
          This is an automated operational transmission. Please do not reply directly to this email.
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Hello ${name || 'Patient'},

Thank you for registering with MedScan-NCD.
To activate your account and start managing your health reports, please verify your email address by visiting the following link:

${verificationUrl}

This verification link will expire in ${expiryMinutes} minutes and can only be used once.

If you did not register for MedScan-NCD, please ignore this email.

— MedScan-NCD Security Team
  `.trim();

  return { html, text };
};

export const getPasswordResetEmailContent = ({ name, resetUrl, expiryMinutes = 15 }) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset your MedScan-NCD password</title>
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">MedScan<span>-NCD</span></div>
          <div class="tagline">Clinical AI & Medical Intelligence Platform</div>
        </div>
        <div class="content">
          <div class="greeting">Hello ${name || 'User'},</div>
          <p>
            We received a request to reset the password associated with your MedScan-NCD account. Click the button below to choose a new password.
          </p>

          <div class="btn-wrapper">
            <a href="${resetUrl}" class="btn" target="_blank" rel="noopener noreferrer">Reset Password</a>
          </div>

          <div class="note">
            <strong>Urgent:</strong> This single-use link is valid for <strong>${expiryMinutes} minutes</strong> only. For your security, once this link is used or expires, a new request must be submitted.
          </div>

          <div class="url-fallback">
            If the button above does not work, copy and paste this link into your browser:<br>
            <a href="${resetUrl}">${resetUrl}</a>
          </div>
        </div>
        <div class="footer">
          MedScan-NCD — Secure Healthcare Platform<br>
          If you did not request a password reset, your account credentials may have been guessed; please contact support immediately.
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Hello ${name || 'User'},

We received a request to reset your MedScan-NCD password.

Please use the following single-use link to set a new password:
${resetUrl}

This link is valid for ${expiryMinutes} minutes only.

If you did not request this password reset, please ignore this email or review your account security.

— MedScan-NCD Security Team
  `.trim();

  return { html, text };
};

export const getWelcomeEmailContent = ({ name, loginUrl }) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to MedScan-NCD</title>
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">MedScan<span>-NCD</span></div>
          <div class="tagline">Clinical AI & Medical Intelligence Platform</div>
        </div>
        <div class="content">
          <div class="greeting">Welcome, ${name || 'Patient'}!</div>
          <p>
            Your email address has been verified successfully. Your account is now active and ready to access personalized health records, AI-assisted lab analysis, and disease risk evaluations.
          </p>

          <div class="btn-wrapper">
            <a href="${loginUrl}" class="btn" target="_blank" rel="noopener noreferrer">Sign In to Workspace</a>
          </div>
        </div>
        <div class="footer">
          MedScan-NCD Platform
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Welcome to MedScan-NCD, ${name || 'Patient'}!

Your email has been verified and your account is active.
You can sign in anytime at: ${loginUrl}

— MedScan-NCD Team
  `.trim();

  return { html, text };
};

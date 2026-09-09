import nodemailer from 'nodemailer';

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const hasValidSMTP =
      process.env.EMAIL_USER &&
      process.env.EMAIL_USER !== 'your_email@gmail.com' &&
      process.env.EMAIL_PASS &&
      process.env.EMAIL_PASS !== 'your_email_app_password';

    if (hasValidSMTP) {
      const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: `"${process.env.EMAIL_FROM_NAME || 'Smart Healthcare System'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to,
        subject,
        text,
        html,
      });

      console.log(`[Nodemailer] Email sent successfully to ${to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } else {
      // Demo / Test fallback logging
      console.log('\n=================== EMAIL SIMULATION ===================');
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`Body (Text): ${text}`);
      if (html) console.log(`Body (HTML snippet): ${html.substring(0, 150)}...`);
      console.log('========================================================\n');

      return { success: true, simulated: true };
    }
  } catch (error) {
    console.error(`[Nodemailer] Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
};

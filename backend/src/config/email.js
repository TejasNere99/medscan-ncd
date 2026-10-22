import { sendMail } from '../services/emailService.js';

export const sendEmail = async ({ to, subject, html, text }) => {
  return await sendMail({ to, subject, html, text });
};

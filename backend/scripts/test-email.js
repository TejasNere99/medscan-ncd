import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('.env') });

const apiKey = (process.env.BREVO_API_KEY || '').trim();
const recipient = process.argv[2] || process.env.EMAIL_USER || 'tejasnere94@gmail.com';
const senderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || 'tejasnere94@gmail.com').trim();

console.log('====================================================');
console.log('MedScan-NCD Email Dispatch Diagnostic Test');
console.log('====================================================');
console.log(`API Key present: ${apiKey ? `Yes (${apiKey.substring(0, 10)}...)` : 'NO (BREVO_API_KEY not found in .env)'}`);
console.log(`Sender Email:    ${senderEmail}`);
console.log(`Recipient:       ${recipient}`);
console.log('----------------------------------------------------');

if (!apiKey) {
  console.error('\n[Error] BREVO_API_KEY is not set in backend/.env.');
  console.log('Please add your Brevo API key to backend/.env:');
  console.log('  BREVO_API_KEY=xkeysib-your-key-here');
  process.exit(1);
}

async function testBrevo() {
  console.log('Attempting HTTPS dispatch to https://api.brevo.com/v3/smtp/email ...');

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'MedScan Test', email: senderEmail },
        to: [{ email: recipient }],
        subject: 'MedScan-NCD Email Test — Live Dispatch Verification',
        htmlContent: '<h3>MedScan Email Test Succeeded!</h3><p>Your cloud email delivery pipeline via Brevo HTTPS API is working properly.</p>',
        textContent: 'MedScan Email Test Succeeded! Your cloud email delivery pipeline via Brevo HTTPS API is working properly.',
      }),
    });

    const body = await res.json();
    console.log(`\nHTTP Response Status: ${res.status} ${res.statusText}`);
    console.log('Response Payload:', JSON.stringify(body, null, 2));

    if (res.ok) {
      console.log('\n====================================================');
      console.log('SUCCESS: Email dispatched successfully via Brevo HTTPS API!');
      console.log(`MessageId: ${body.messageId}`);
      console.log(`Check inbox for: ${recipient}`);
      console.log('====================================================');
    } else {
      console.error('\n====================================================');
      console.error('BREVO REJECTED THE REQUEST:');
      console.error(`Error Code:    ${body.code || 'N/A'}`);
      console.error(`Error Message: ${body.message || JSON.stringify(body)}`);
      console.error('====================================================');
      if (body.message?.includes('sender') || body.code?.includes('invalid_parameter')) {
        console.log('\n[Tip] In Brevo, the sender email must be verified.');
        console.log(`Make sure '${senderEmail}' is the exact email address you signed up with on Brevo.`);
      }
    }
  } catch (err) {
    console.error('\n[Network Error]', err.message);
  }
}

testBrevo();

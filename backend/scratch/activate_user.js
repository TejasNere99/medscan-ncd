import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';

dotenv.config({ path: path.resolve('.env') });


async function activateUser() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  
  const user = await User.findOne({ email: 'sambarerohit7@gmail.com' });
  if (!user) {
    console.log('User sambarerohit7@gmail.com not found in database.');
  } else {
    user.isEmailVerified = true;
    user.isVerified = true;
    user.emailVerificationToken = null;
    await user.save();
    console.log('SUCCESS: sambarerohit7@gmail.com is now fully EMAIL VERIFIED and ACTIVE!');
  }
  await mongoose.disconnect();
}

activateUser().catch(console.error);

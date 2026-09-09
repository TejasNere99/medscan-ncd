import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

const isCloudinaryConfigured = () => {
  return (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_CLOUD_NAME !== 'demo_cloud' &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_KEY !== '1234567890'
  );
};

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    if (isCloudinaryConfigured()) {
      const response = await cloudinary.uploader.upload(localFilePath, {
        resource_type: 'auto',
        folder: 'smart_healthcare_reports',
      });
      // Remove file from local uploads after Cloudinary sync
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
      return {
        url: response.secure_url,
        publicId: response.public_id,
      };
    } else {
      // Local storage fallback for development
      const fileName = path.basename(localFilePath);
      const publicUrl = `http://localhost:${process.env.PORT || 5000}/uploads/${fileName}`;
      return {
        url: publicUrl,
        publicId: fileName,
      };
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return null;
  }
};

export default cloudinary;

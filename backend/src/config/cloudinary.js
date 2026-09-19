import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';

export const isCloudinaryConfigured = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  return Boolean(
    cloudName &&
    cloudName !== 'demo_cloud' &&
    apiKey &&
    apiKey !== '1234567890' &&
    apiSecret &&
    apiSecret !== 'demo_secret'
  );
};

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Uploads a file to Cloudinary if configured;
 * falls back to local storage only if LOCAL_STORAGE_FALLBACK=true.
 * Never fabricates Cloudinary URLs or leaks API secrets.
 */
export const uploadOnCloudinary = async (localFilePath) => {
  if (!localFilePath) {
    throw new Error('Local file path is required for upload.');
  }

  const isConfigured = isCloudinaryConfigured();
  const allowLocalStorage = process.env.LOCAL_STORAGE_FALLBACK === 'true';

  if (isConfigured) {
    try {
      const response = await cloudinary.uploader.upload(localFilePath, {
        resource_type: 'auto',
        folder: 'medscan_reports',
      });

      // Remove local copy after successful Cloudinary upload
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }

      return {
        url: response.secure_url,
        publicId: response.public_id,
        storageProvider: 'cloudinary',
      };
    } catch (cloudErr) {
      console.warn(`[Cloudinary Warning] Cloudinary upload failed: ${cloudErr.message}`);

      if (allowLocalStorage) {
        console.info('[Storage Fallback] Utilizing local disk storage because LOCAL_STORAGE_FALLBACK=true');
        const fileName = path.basename(localFilePath);
        const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
        return {
          url: `${baseUrl}/uploads/${fileName}`,
          publicId: fileName,
          storageProvider: 'local',
        };
      } else {
        // Clean up temporary local file
        if (fs.existsSync(localFilePath)) {
          fs.unlinkSync(localFilePath);
        }
        throw new Error(`Cloudinary upload failed: ${cloudErr.message}. Ensure Cloudinary credentials are valid or enable LOCAL_STORAGE_FALLBACK=true.`);
      }
    }
  }

  // Not configured with valid Cloudinary credentials
  if (allowLocalStorage) {
    console.info('[Storage Fallback] Cloudinary is unconfigured or placeholder. Using local storage (LOCAL_STORAGE_FALLBACK=true)');
    const fileName = path.basename(localFilePath);
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
    return {
      url: `${baseUrl}/uploads/${fileName}`,
      publicId: fileName,
      storageProvider: 'local',
    };
  }

  // Unconfigured and local fallback not enabled
  if (fs.existsSync(localFilePath)) {
    fs.unlinkSync(localFilePath);
  }
  throw new Error(
    'Cloudinary configuration is missing or invalid. Set valid CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET, or set LOCAL_STORAGE_FALLBACK=true for local development.'
  );
};

export default cloudinary;

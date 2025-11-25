const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload file buffer to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {String} fileName - Original file name
 * @param {String} folder - Cloudinary folder name (e.g., 'task-attachments', 'task-submissions')
 * @returns {Promise<Object>} - Cloudinary upload result with secure_url
 */
async function uploadToCloudinary(fileBuffer, fileName, folder = 'autotask') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'auto', // Automatically detect file type
        public_id: `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`, // Sanitize filename
        use_filename: true,
        unique_filename: true
      },
      (error, result) => {
        if (error) {
          console.error('❌ Cloudinary upload error:', error);
          reject(error);
        } else {
          console.log(`✅ File uploaded to Cloudinary: ${result.secure_url}`);
          resolve(result);
        }
      }
    );

    // Pipe the buffer to upload stream
    uploadStream.end(fileBuffer);
  });
}

/**
 * Upload multiple files to Cloudinary
 * @param {Array} files - Array of file objects with buffer and originalname
 * @param {String} folder - Cloudinary folder
 * @returns {Promise<Array>} - Array of upload results
 */
async function uploadMultipleFiles(files, folder = 'autotask') {
  try {
    const uploadPromises = files.map(file => 
      uploadToCloudinary(file.buffer, file.originalname, folder)
    );
    
    const results = await Promise.all(uploadPromises);
    console.log(`✅ Successfully uploaded ${results.length} files to Cloudinary`);
    return results;
  } catch (error) {
    console.error('❌ Error uploading multiple files:', error);
    throw error;
  }
}

/**
 * Delete file from Cloudinary
 * @param {String} publicId - Cloudinary public ID of the file
 * @returns {Promise<Object>} - Delete result
 */
async function deleteFromCloudinary(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    console.log(`✅ File deleted from Cloudinary: ${publicId}`);
    return result;
  } catch (error) {
    console.error('❌ Cloudinary delete error:', error);
    throw error;
  }
}

/**
 * Extract public ID from Cloudinary URL
 * @param {String} url - Cloudinary secure URL
 * @returns {String} - Public ID
 */
function extractPublicId(url) {
  try {
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    const pathAfterUpload = parts.slice(uploadIndex + 2).join('/');
    const publicId = pathAfterUpload.split('.')[0];
    return publicId;
  } catch (error) {
    console.error('❌ Error extracting public ID:', error);
    return null;
  }
}

/**
 * Get file info from Cloudinary
 * @param {String} publicId - Cloudinary public ID
 * @returns {Promise<Object>} - File resource info
 */
async function getFileInfo(publicId) {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error) {
    console.error('❌ Error getting file info:', error);
    throw error;
  }
}

/**
 * Test Cloudinary connection
 * @returns {Promise<Object>} - Test result
 */
async function testCloudinaryConnection() {
  try {
    // Try to get account usage info as a test
    const result = await cloudinary.api.usage();
    console.log('✅ Cloudinary connection successful!');
    console.log('Account plan:', result.plan);
    console.log('Used credits:', result.credits.used, '/', result.credits.limit);
    return { success: true, usage: result };
  } catch (error) {
    console.error('❌ Cloudinary connection failed:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  uploadToCloudinary,
  uploadMultipleFiles,
  deleteFromCloudinary,
  extractPublicId,
  getFileInfo,
  testCloudinaryConnection
};

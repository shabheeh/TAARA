const cloudinary = require("../Configs/cloudinary");

async function uploadToCloudinary(file, folder) {
  try {
    const fileStr = file.buffer.toString("base64");
    const fileUri = `data:${file.mimetype};base64,${fileStr}`;

    const uploadResponse = await cloudinary.uploader.upload(fileUri, {
      folder,
      invalidate: true,
      use_filename: true,
      unique_filename: false,
    });

    return {
      url: uploadResponse.secure_url,
      publicId: uploadResponse.public_id,
    };
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw new Error("Failed to upload image");
  }
}

module.exports = uploadToCloudinary;

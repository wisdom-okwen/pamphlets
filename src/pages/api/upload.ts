import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import { IncomingForm, Fields, Files, File } from "formidable";
import { createAdminClient } from "@/utils/supabase/clients/api";

export const config = {
  api: {
    bodyParser: false,
  },
};

type ResponseData = {
  url?: string;
  error?: string;
};

const parseForm = (
  req: NextApiRequest
): Promise<{ fields: Fields; files: Files }> => {
  const form = new IncomingForm({
    maxFileSize: 5 * 1024 * 1024,
    keepExtensions: true,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { files } = await parseForm(req);
    
    const fileArray = files.file;
    if (!fileArray || fileArray.length === 0) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = fileArray[0] as File;
    
    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!file.mimetype || !allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({ error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." });
    }

    // Read file data
    const fileData = fs.readFileSync(file.filepath);
    
    // Generate unique filename
    const fileExt = file.originalFilename?.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `cover-images/${fileName}`;

    // Upload to Supabase Storage
    const supabase = createAdminClient();
    const { error: uploadError } = await supabase.storage
      .from('content_images')
      .upload(filePath, fileData, {
        contentType: file.mimetype || 'image/jpeg',
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return res.status(500).json({ error: `Upload failed: ${uploadError.message}` });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('content_images')
      .getPublicUrl(filePath);

    // Clean up temp file
    fs.unlinkSync(file.filepath);

    return res.status(200).json({ url: publicUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ error: "Failed to upload image" });
  }
}

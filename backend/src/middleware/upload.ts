import multer from 'multer'
import { Request } from 'express'

// Configure multer for memory storage (we'll upload to Cloudinary)
const storage = multer.memoryStorage()

// File filter function
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Check file type
  if (file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new Error('Only image files are allowed!'))
  }
}

// Configure multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
})

// Specific configurations for different upload types
export const uploadSingle = (fieldName: string) => upload.single(fieldName)
export const uploadMultiple = (fieldName: string, maxCount: number = 5) => 
  upload.array(fieldName, maxCount)

// Profile image upload (single file)
export const uploadProfileImage = uploadSingle('profileImage')

// Document upload (multiple files)
export const uploadDocuments = uploadMultiple('documents', 10)
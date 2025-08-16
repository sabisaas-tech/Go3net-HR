import { v2 as cloudinary } from 'cloudinary'
import { UploadApiResponse } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export interface ImageUploadResult {
  public_id: string
  secure_url: string
  width: number
  height: number
  format: string
  resource_type: string
  created_at: string
}

export class CloudinaryService {
  /**
   * Upload image to Cloudinary
   */
  static async uploadImage(
    file: Buffer | string,
    options: {
      folder?: string
      public_id?: string
      transformation?: any
      resource_type?: 'image' | 'video' | 'raw' | 'auto'
    } = {}
  ): Promise<ImageUploadResult> {
    try {
      const uploadOptions = {
        folder: options.folder || 'hr-system',
        resource_type: options.resource_type || 'image',
        public_id: options.public_id,
        transformation: options.transformation,
        quality: 'auto',
        fetch_format: 'auto',
      }

      // Convert Buffer to base64 string if needed
      let fileToUpload: string
      if (Buffer.isBuffer(file)) {
        fileToUpload = `data:image/jpeg;base64,${file.toString('base64')}`
      } else {
        fileToUpload = file
      }

      const result: UploadApiResponse = await cloudinary.uploader.upload(
        fileToUpload,
        uploadOptions
      )

      return {
        public_id: result.public_id,
        secure_url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        resource_type: result.resource_type,
        created_at: result.created_at,
      }
    } catch (error) {
      console.error('Cloudinary upload error:', error)
      throw new Error('Failed to upload image to Cloudinary')
    }
  }  /**
 
  * Upload profile image with specific transformations
   */
  static async uploadProfileImage(
    file: Buffer | string,
    userId: string
  ): Promise<ImageUploadResult> {
    return this.uploadImage(file, {
      folder: 'hr-system/profiles',
      public_id: `profile_${userId}`,
      transformation: [
        { width: 400, height: 400, crop: 'fill', gravity: 'face' },
        { quality: 'auto', fetch_format: 'auto' }
      ]
    })
  }

  /**
   * Upload employee document
   */
  static async uploadDocument(
    file: Buffer | string,
    employeeId: string,
    documentType: string
  ): Promise<ImageUploadResult> {
    return this.uploadImage(file, {
      folder: `hr-system/documents/${employeeId}`,
      public_id: `${documentType}_${Date.now()}`,
      resource_type: 'auto'
    })
  }

  /**
   * Delete image from Cloudinary
   */
  static async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId)
    } catch (error) {
      console.error('Cloudinary delete error:', error)
      throw new Error('Failed to delete image from Cloudinary')
    }
  }

  /**
   * Get optimized image URL with transformations
   */
  static getOptimizedUrl(
    publicId: string,
    transformations: any = {}
  ): string {
    return cloudinary.url(publicId, {
      quality: 'auto',
      fetch_format: 'auto',
      ...transformations
    })
  }
}

export default CloudinaryService
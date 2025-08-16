import nodemailer from 'nodemailer'

export interface EmailData {
  to: string
  subject: string
  html: string
}

export class EmailService {
  private transporter: nodemailer.Transporter

  private readonly brandColors = {
    primary: '#007bff',     
    green: '#28a745',        
    dark: '#212529',         
    lightGray: '#f8f9fa',    
    white: '#ffffff',
    textPrimary: '#212529',
    textSecondary: '#495057',
    textMuted: '#6c757d'
  }

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    })
  }

  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"Go3net HR System" <${process.env.EMAIL_USER}>`,
        to: emailData.to,
        subject: emailData.subject,
        html: emailData.html
      }

      await this.transporter.sendMail(mailOptions)
      return true
    } catch (error) {
      console.error('Email sending failed:', error)
      return false
    }
  }

  async sendPasswordResetEmail(email: string, fullName: string, resetToken: string): Promise<boolean> {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`

    const emailData: EmailData = {
      to: email,
      subject: 'Reset Your Password - Go3net HR Management System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Request</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <div style="background-color: #007bff; padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                Go<span style="color: #28a745;">3</span>net
              </h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">HR Management System</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px;">
              <h2 style="color: #212529; margin: 0 0 20px 0; font-size: 24px;">Password Reset Request</h2>
              
              <p style="color: #495057; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hello <strong>${fullName}</strong>,
              </p>
              
              <p style="color: #495057; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                You requested to reset your password for your Go3net HR Management System account. 
                Click the button below to create a new password:
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${resetLink}" 
                   style="background-color: #007bff; color: #ffffff; padding: 16px 32px; text-decoration: none; 
                          border-radius: 8px; display: inline-block; font-size: 16px; font-weight: bold;
                          box-shadow: 0 4px 6px rgba(0, 123, 255, 0.3);">
                  Reset Password
                </a>
              </div>
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 30px 0;">
                <p style="color: #495057; font-size: 14px; margin: 0; line-height: 1.5;">
                  <strong>Security Notice:</strong> This link will expire in 24 hours for your security. 
                  If you didn't request this password reset, please ignore this email.
                </p>
              </div>
              
              <p style="color: #6c757d; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${resetLink}" style="color: #007bff; word-break: break-all;">${resetLink}</a>
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #212529; padding: 30px 40px; text-align: center;">
              <p style="color: #ffffff; margin: 0; font-size: 14px;">
                © ${new Date().getFullYear()} Go3net Technologies Ltd. All rights reserved.
              </p>
              <p style="color: #6c757d; margin: 10px 0 0 0; font-size: 12px;">
                This is an automated message from Go3net HR Management System.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    }

    return this.sendEmail(emailData)
  }

  async sendEmailVerificationEmail(email: string, fullName: string, verificationToken: string): Promise<boolean> {
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`

    const emailData: EmailData = {
      to: email,
      subject: 'Verify Your Email - Go3net HR Management System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Email Verification</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <div style="background-color: #28a745; padding: 30px 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                Go<span style="color: #ffffff;">3</span>net
              </h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px;">HR Management System</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="background-color: #28a745; width: 80px; height: 80px; border-radius: 50%; 
                           margin: 0 auto 20px auto; display: flex; align-items: center; justify-content: center;">
                  <span style="color: #ffffff; font-size: 36px;">✓</span>
                </div>
              </div>
              
              <h2 style="color: #212529; margin: 0 0 20px 0; font-size: 24px; text-align: center;">
                Verify Your Email Address
              </h2>
              
              <p style="color: #495057; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hello <strong>${fullName}</strong>,
              </p>
              
              <p style="color: #495057; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Welcome to Go3net HR Management System! To complete your registration and secure your account, 
                please verify your email address by clicking the button below:
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${verificationLink}" 
                   style="background-color: #28a745; color: #ffffff; padding: 16px 32px; text-decoration: none; 
                          border-radius: 8px; display: inline-block; font-size: 16px; font-weight: bold;
                          box-shadow: 0 4px 6px rgba(40, 167, 69, 0.3);">
                  Verify Email Address
                </a>
              </div>
              
              <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; margin: 30px 0;">
                <p style="color: #495057; font-size: 14px; margin: 0; line-height: 1.5;">
                  <strong>Important:</strong> This verification link will expire in 24 hours. 
                  Once verified, you'll have full access to your HR dashboard and all system features.
                </p>
              </div>
              
              <p style="color: #6c757d; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${verificationLink}" style="color: #007bff; word-break: break-all;">${verificationLink}</a>
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #212529; padding: 30px 40px; text-align: center;">
              <p style="color: #ffffff; margin: 0; font-size: 14px;">
                © ${new Date().getFullYear()} Go3net Technologies Ltd. All rights reserved.
              </p>
              <p style="color: #6c757d; margin: 10px 0 0 0; font-size: 12px;">
                This is an automated message from Go3net HR Management System.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    }

    return this.sendEmail(emailData)
  }

  async sendEmployeeInvitationEmail(email: string, fullName: string, temporaryPassword: string): Promise<boolean> {
    const loginLink = `${process.env.FRONTEND_URL}/login`

    const emailData: EmailData = {
      to: email,
      subject: 'Welcome to Go3net HR Management System - Your Account is Ready!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Go3net HR</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Arial, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #007bff 0%, #28a745 100%); padding: 40px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: bold;">
                Go<span style="color: #ffffff;">3</span>net
              </h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 18px;">HR Management System</p>
              <div style="margin-top: 20px;">
                <span style="background-color: rgba(255,255,255,0.2); color: #ffffff; padding: 8px 16px; 
                           border-radius: 20px; font-size: 14px; font-weight: bold;">
                  🎉 Welcome to the Team!
                </span>
              </div>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px;">
              <h2 style="color: #212529; margin: 0 0 20px 0; font-size: 26px; text-align: center;">
                Your HR Account is Ready!
              </h2>
              
              <p style="color: #495057; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Hello <strong>${fullName}</strong>,
              </p>
              
              <p style="color: #495057; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                Welcome to Go3net Technologies! Your HR Management System account has been successfully created. 
                You now have access to our comprehensive HR platform where you can manage your profile, 
                track time, view schedules, and much more.
              </p>
              
              <!-- Login Credentials Box -->
              <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); 
                         padding: 30px; border-radius: 12px; border: 2px solid #007bff; margin: 30px 0;">
                <h3 style="color: #007bff; margin: 0 0 20px 0; font-size: 18px; text-align: center;">
                  🔐 Your Login Credentials
                </h3>
                <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <p style="color: #495057; margin: 0 0 15px 0; font-size: 16px;">
                    <strong style="color: #212529;">Email:</strong><br>
                    <span style="background-color: #e3f2fd; padding: 8px 12px; border-radius: 4px; 
                               font-family: monospace; font-size: 14px; display: inline-block; margin-top: 5px;">
                      ${email}
                    </span>
                  </p>
                  <p style="color: #495057; margin: 0; font-size: 16px;">
                    <strong style="color: #212529;">Temporary Password:</strong><br>
                    <span style="background-color: #fff3cd; padding: 8px 12px; border-radius: 4px; 
                               font-family: monospace; font-size: 14px; display: inline-block; margin-top: 5px;">
                      ${temporaryPassword}
                    </span>
                  </p>
                </div>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 40px 0;">
                <a href="${loginLink}" 
                   style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: #ffffff; 
                          padding: 18px 36px; text-decoration: none; border-radius: 8px; display: inline-block; 
                          font-size: 16px; font-weight: bold; box-shadow: 0 4px 12px rgba(0, 123, 255, 0.4);
                          transition: all 0.3s ease;">
                  🚀 Access Your Dashboard
                </a>
              </div>
              
              <!-- Security Notice -->
              <div style="background-color: #fff3cd; padding: 20px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 30px 0;">
                <p style="color: #856404; font-size: 14px; margin: 0; line-height: 1.5;">
                  <strong>🔒 Security Reminder:</strong> For your security, please change your temporary password 
                  immediately after your first login. You can do this from your profile settings.
                </p>
              </div>
              
              <!-- Features Preview -->
              <div style="margin: 40px 0;">
                <h3 style="color: #212529; margin: 0 0 20px 0; font-size: 18px; text-align: center;">
                  What you can do with your new account:
                </h3>
                <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                  <div style="flex: 1; min-width: 250px; background-color: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 3px solid #28a745;">
                    <p style="color: #495057; margin: 0; font-size: 14px;">
                      <strong style="color: #28a745;">✓ Profile Management</strong><br>
                      Update your personal information and preferences
                    </p>
                  </div>
                  <div style="flex: 1; min-width: 250px; background-color: #f8f9fa; padding: 15px; border-radius: 8px; border-left: 3px solid #007bff;">
                    <p style="color: #495057; margin: 0; font-size: 14px;">
                      <strong style="color: #007bff;">✓ Time Tracking</strong><br>
                      Log your work hours and track productivity
                    </p>
                  </div>
                </div>
              </div>
              
              <p style="color: #6c757d; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
                Need help getting started? Contact our HR team or visit our help center.
              </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #212529; padding: 30px 40px; text-align: center;">
              <p style="color: #ffffff; margin: 0; font-size: 14px;">
                © ${new Date().getFullYear()} Go3net Technologies Ltd. All rights reserved.
              </p>
              <p style="color: #6c757d; margin: 10px 0 0 0; font-size: 12px;">
                This is an automated message from Go3net HR Management System.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    }

    return this.sendEmail(emailData)
  }
}
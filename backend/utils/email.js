import nodemailer from "nodemailer";

let transporter = null;

function initEmail() {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;
  const smtpSecure = process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465";

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
    console.warn("[email] SMTP not configured. Email functionality will be disabled.");
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });
    console.log("[email] SMTP transporter initialized");
    return transporter;
  } catch (e) {
    console.error("[email] Failed to initialize transporter:", e);
    return null;
  }
}

export async function sendPasswordResetEmail(email, resetToken) {
  if (!transporter) {
    transporter = initEmail();
  }
  if (!transporter) {
    throw new Error("Email service not configured");
  }

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:8080";
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Password Reset Request - Saree Elegance",
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #8B1538; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .button { display: inline-block; padding: 12px 24px; background-color: #8B1538; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
            .footer { padding: 20px; text-align: center; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Saree Elegance</h1>
            </div>
            <div class="content">
              <h2>Password Reset Request</h2>
              <p>Hello,</p>
              <p>We received a request to reset your password for your Saree Elegance account.</p>
              <p>Click the button below to reset your password:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #8B1538;">${resetUrl}</p>
              <p>This link will expire in 1 hour.</p>
              <p>If you didn't request a password reset, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>© 2025 Saree Elegance. All rights reserved.</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
      Password Reset Request - Saree Elegance
      
      Hello,
      
      We received a request to reset your password for your Saree Elegance account.
      
      Click the link below to reset your password:
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you didn't request a password reset, please ignore this email.
      
      © 2025 Saree Elegance. All rights reserved.
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("[email] Password reset email sent:", info.messageId);
    return info;
  } catch (e) {
    console.error("[email] Failed to send password reset email:", e);
    throw e;
  }
}


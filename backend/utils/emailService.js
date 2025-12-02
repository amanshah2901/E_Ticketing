import nodemailer from 'nodemailer';

// Create transporter (using Gmail as example)
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

export const sendBookingConfirmationEmail = async (user, booking, qrCodeUrl) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: `Booking Confirmed - ${booking.booking_reference}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .footer { padding: 20px; text-align: center; color: #666; }
            .qr-code { text-align: center; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Booking Confirmed! 🎉</h1>
              <p>Reference: ${booking.booking_reference}</p>
            </div>
            <div class="content">
              <h2>${booking.item_title}</h2>
              <p><strong>Date:</strong> ${new Date(booking.event_date).toLocaleDateString()}</p>
              <p><strong>Time:</strong> ${booking.event_time}</p>
              <p><strong>Venue:</strong> ${booking.venue_details}</p>
              ${booking.seats && booking.seats.length > 0 ? `<p><strong>Seats:</strong> ${booking.seats.join(', ')}</p>` : ''}
              ${booking.quantity ? `<p><strong>Quantity:</strong> ${booking.quantity} tickets</p>` : ''}
              <p><strong>Total Amount:</strong> ₹${booking.total_amount}</p>
              
              <div class="qr-code">
                <img src="${qrCodeUrl}" alt="QR Code" style="max-width: 200px;" />
                <p>Show this QR code at the venue for entry</p>
              </div>
            </div>
            <div class="footer">
              <p>Thank you for booking with us!</p>
              <p>If you have any questions, contact our support team.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`Booking confirmation email sent to ${user.email}`);
  } catch (error) {
    console.error('Email sending error:', error);
    throw new Error('Failed to send confirmation email');
  }
};

export const sendPasswordResetEmail = async (user, resetToken) => {
  try {
    const transporter = createTransporter();
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>Hello ${user.full_name},</p>
          <p>You requested to reset your password. Click the link below to reset it:</p>
          <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Password reset email error:', error);
    throw new Error('Failed to send password reset email');
  }
};
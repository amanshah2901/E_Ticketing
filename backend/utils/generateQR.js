import QRCode from 'qrcode';

export const generateQRCode = async (data) => {
  try {
    const qrCodeData = JSON.stringify(data);
    const qrCodeUrl = await QRCode.toDataURL(qrCodeData);
    return qrCodeUrl;
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
};

export const generateQRCodeForBooking = async (booking) => {
  const qrData = {
    booking_id: booking._id,
    booking_reference: booking.booking_reference,
    item_title: booking.item_title,
    event_date: booking.event_date,
    event_time: booking.event_time,
    venue: booking.venue_details,
    seats: booking.seats,
    quantity: booking.quantity
  };

  return await generateQRCode(qrData);
};
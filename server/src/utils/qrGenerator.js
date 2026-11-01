const QRCode = require('qrcode');

/**
 * Generate a QR code base64 Data URL for an asset payload
 * @param {string} payload - Unique token or asset identity string
 * @returns {Promise<string>} Base64 image data URL
 */
async function generateQRCodeDataUrl(payload) {
  try {
    return await QRCode.toDataURL(payload, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      margin: 2,
      scale: 8,
      color: {
        dark: '#0f172a',  // Slate 900
        light: '#ffffff', // Clean white background
      },
    });
  } catch (err) {
    console.error('Error generating QR code:', err);
    throw err;
  }
}

module.exports = {
  generateQRCodeDataUrl,
};

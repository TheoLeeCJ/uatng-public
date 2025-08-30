const { spawn } = require('child_process');
const sharp = require('sharp');

function getAdbScreenshot(deviceId) {
  return new Promise((resolve, reject) => {
    const adb = spawn('adb', ['-s', deviceId, 'exec-out', 'screencap', '-p']);
    const imageChunks = [];
    let errorOutput = '';

    adb.stdout.on('data', (chunk) => {
      imageChunks.push(chunk);
    });

    adb.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    adb.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`ADB process exited with code ${code}: ${errorOutput}`));
      }
      const imageBuffer = Buffer.concat(imageChunks);
      resolve(imageBuffer);
    });

    adb.on('error', (err) => {
      reject(err);
    });
  });
}

async function captureAndProcessScreenshot(deviceId) {
  try {
    const pngBuffer = await getAdbScreenshot(deviceId);
    const image = sharp(pngBuffer);
    const metadata = await image.metadata();

    const resizedBuffer = await image
      .resize(Math.round(metadata.width * 0.5))
      .jpeg({ quality: 90 })
      .toBuffer();
    
    return resizedBuffer.toString('base64');
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

module.exports = {
  captureAndProcessScreenshot,
};

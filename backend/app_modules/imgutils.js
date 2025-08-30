const { spawn } = require('child_process');
const sharp = require('sharp');

async function getAdbScreenshot(deviceId) {
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

async function resizeAndConvertToJpeg(inputBuffer, scaleFactor = 0.5) {
  try {
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();

    const resizedBuffer = await image
      .resize(Math.round(metadata.width * scaleFactor))
      .jpeg({ quality: 90 })
      .toBuffer();

    return resizedBuffer;
  } catch (error) {
    throw new Error(`Error processing image: ${error.message}`);
  }
}

async function addCircleToImage(inputBuffer, percentX, percentY, radius = 20, color = 'hotpink', strokeWidth = 4) {
  try {
    const image = sharp(inputBuffer);
    const { width, height } = await image.metadata();

    const centerX = Math.round((percentX / 100) * width);
    const centerY = Math.round((percentY / 100) * height);

    // Create an SVG string for a circle with stroke only (no fill)
    const circleSvg = `
      <svg width="${width}" height="${height}">
        <circle cx="${centerX}" cy="${centerY}" r="${radius}" 
                fill="none" stroke="${color}" stroke-width="${strokeWidth}" />
      </svg>
    `;

    // Composite the SVG circle onto the image
    const result = await image
      .composite([{
        input: Buffer.from(circleSvg),
        top: 0,
        left: 0
      }])
      .jpeg({ quality: 90 })
      .toBuffer();

    return result;
  } catch (error) {
    throw new Error(`Error adding circle to image: ${error.message}`);
  }
}

async function getScreenSize(deviceId) {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    
    exec(`adb -s ${deviceId} shell wm size`, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`Failed to get screen size: ${error.message}`));
      }
      
      try {
        // Parse output like "Physical size: 1080x2400"
        const match = stdout.match(/Physical size: (\d+)x(\d+)/);
        if (!match) {
          return reject(new Error(`Could not parse screen size from: ${stdout}`));
        }
        
        const width = parseInt(match[1], 10);
        const height = parseInt(match[2], 10);
        
        resolve([width, height]);
      } catch (parseError) {
        reject(new Error(`Error parsing screen size: ${parseError.message}`));
      }
    });
  });
}

module.exports = {
  getAdbScreenshot,
  resizeAndConvertToJpeg,
  addCircleToImage,
  getScreenSize
};

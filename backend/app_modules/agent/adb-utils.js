const { spawn } = require('child_process');

function executeAdbCommand(deviceId, command) {
  return new Promise((resolve, reject) => {
    const fullCommand = ['-s', deviceId, ...command];
    console.log(`Executing: adb ${fullCommand.join(' ')}`);
    const adb = spawn('adb', fullCommand);

    let output = '';
    let errorOutput = '';

    adb.stdout.on('data', (data) => {
      output += data.toString();
    });

    adb.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    adb.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`ADB process exited with code ${code}: ${errorOutput}`));
      }
      resolve(output.trim());
    });

    adb.on('error', (err) => {
      reject(err);
    });
  });
}

async function getScreenSize(deviceId) {
    try {
        const output = await executeAdbCommand(deviceId, ['shell', 'wm', 'size']);
        const match = output.match(/Physical size: (\d+)x(\d+)/);
        if (match) {
            return { width: parseInt(match[1], 10), height: parseInt(match[2], 10) };
        }
        throw new Error('Could not determine screen size.');
    } catch (error) {
        console.error('Failed to get screen size:', error.message);
        return { width: 1080, height: 2400 };
    }
}

module.exports = {
  executeAdbCommand,
  getScreenSize,
};

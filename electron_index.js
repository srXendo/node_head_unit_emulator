const { spawn } = require('child_process');
const video = require('./video.js')
const video2 = require('./video2.js')
// Tu buffer global
const h264Buffer = Buffer.from(video, 'hex');
// Tus buffers globales
const buffer1 = Buffer.from(video, 'hex');
const buffer2 = Buffer.from(video, 'hex');

const ffplay = spawn('ffplay', [
  '-i', 'pipe:0',
  '-window_title', 'H.264 Player',
  '-x', '800',
  '-y', '600'
], {
  stdio: ['pipe', 'inherit', 'inherit']
});

// Enviar primer buffer
ffplay.stdin.write(buffer1);

// Inyectar segundo buffer después de un tiempo
setTimeout(() => {
  ffplay.stdin.write(buffer2);
  ffplay.stdin.end();
}, 4000);


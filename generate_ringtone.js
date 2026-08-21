const fs = require('fs');
const header = Buffer.alloc(44);
const sampleRate = 8000;
const duration = 2; // 2 seconds
const numSamples = sampleRate * duration;

header.write('RIFF', 0);
header.writeUInt32LE(36 + numSamples * 2, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20); // PCM
header.writeUInt16LE(1, 22); // Mono
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * 2, 28);
header.writeUInt16LE(2, 32); // Block align
header.writeUInt16LE(16, 34); // Bits per sample
header.write('data', 36);
header.writeUInt32LE(numSamples * 2, 40);

const data = Buffer.alloc(numSamples * 2);
for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  const tMod = t % 2.0;
  const isRinging = (tMod < 0.4) || (tMod >= 0.6 && tMod < 1.0);
  let sample = 0;
  if (isRinging) {
    sample = Math.sin(2 * Math.PI * 440 * t) * 10000 + Math.sin(2 * Math.PI * 480 * t) * 10000;
  }
  data.writeInt16LE(sample, i * 2);
}

const wavBuffer = Buffer.concat([header, data]);
const base64 = wavBuffer.toString('base64');
fs.writeFileSync('frontend/src/components/ringtoneBase64.js', 'export const ringtoneBase64 = "data:audio/wav;base64,' + base64 + '";\n');
console.log('done');

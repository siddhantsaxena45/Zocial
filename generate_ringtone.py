import wave, math, struct, base64

sample_rate = 8000
duration = 2.0
num_samples = int(duration * sample_rate)

with wave.open('ring.wav', 'w') as wav_file:
    wav_file.setnchannels(1)
    wav_file.setsampwidth(2)
    wav_file.setframerate(sample_rate)
    
    for i in range(num_samples):
        # Ringing pattern: 0.4s on, 0.2s off, 0.4s on, 1.0s off
        t = i / sample_rate
        t_mod = t % 2.0
        
        is_ringing = (t_mod < 0.4) or (0.6 <= t_mod < 1.0)
        
        if is_ringing:
            # Mix two frequencies (e.g. 440Hz and 480Hz)
            sample = 10000 * math.sin(2 * math.pi * 440 * t) + 10000 * math.sin(2 * math.pi * 480 * t)
        else:
            sample = 0
            
        wav_file.writeframes(struct.pack('h', int(sample)))

with open('ring.wav', 'rb') as f:
    b64 = base64.b64encode(f.read()).decode('utf-8')

with open(r'd:\zocial\frontend\src\components\ringtoneBase64.js', 'w') as f:
    f.write('export const ringtoneBase64 = "data:audio/wav;base64,' + b64 + '";\n')

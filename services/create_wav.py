import numpy as np
import wave
import struct


def generate_wav(
    filename,
    frequency=440,
    duration=2,
    sample_rate=44100,
    amplitude=16000,
    phase_shift=0,
):
    num_samples = duration * sample_rate
    time = np.linspace(0, duration, num_samples, endpoint=False)
    signal = amplitude * np.sin(2 * np.pi * frequency * time + phase_shift)

    with wave.open(filename, "w") as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit samples
        wav_file.setframerate(sample_rate)

        for s in signal:
            wav_file.writeframes(struct.pack("<h", int(s)))


# Generate two similar but slightly different wav files
generate_wav("sound1.wav", phase_shift=0)
generate_wav("sound2.wav", phase_shift=0.1)  # Slight phase shift

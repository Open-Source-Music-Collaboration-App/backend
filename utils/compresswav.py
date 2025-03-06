# run python3 compresswav.py <sys.argv[1]> <sys.argv[2]> to compress wav file and save it to a new file .flac
import sys
import os
import subprocess
import shutil
import tempfile
import wave
import struct

def compress_wav(input_file, output_file):
    # Check if input file exists
    if not os.path.exists(input_file):
        print(f"Input file {input_file} does not exist.")
        return

    # Check if input file is a WAV file
    if not input_file.lower().endswith('.wav'):
        print(f"Input file {input_file} is not a WAV file.")
        return

    # Create a temporary directory
    temp_dir = tempfile.mkdtemp()

    try:
        # Create a temporary WAV file
        temp_wav = os.path.join(temp_dir, 'temp.wav')
        shutil.copy(input_file, temp_wav)

        # Compress the WAV file using FLAC
        subprocess.run(['flac', temp_wav, '-o', output_file], check=True)

        print(f"Compressed WAV file saved to {output_file}")

    except subprocess.CalledProcessError as e:
        print(f"Error compressing WAV file: {e}")

    finally:
        # Clean up temporary directory
        shutil.rmtree(temp_dir)
if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python compresswav.py <input_file> <output_file>")
    else:
        input_file = sys.argv[1]
        output_file = sys.argv[2]
        compress_wav(input_file, output_file)
        
        
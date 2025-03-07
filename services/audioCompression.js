const fs = require("fs");
const WaveFile = require("wavefile").WaveFile;

class compareWavFiles {
  constructor(options = {}) {
    this.threshold = options.threshold || 0.001;
    this.minDifferenceLength = options.minDifferenceLength || 10;
  }

  /**
   * Load and parse a WAV file
   * @param {String} filePath - Path to WAV file
   * @returns {Object} - Audio data and metadata
   */
  loadWavFile(filePath) {
    const buffer = fs.readFileSync(filePath);
    const wav = new WaveFile(buffer);

    // Convert to 32-bit float for easier comparison
    wav.toBitDepth("32f");

    const sampleRate = wav.fmt.sampleRate;
    const numChannels = wav.fmt.numChannels;
    const samples = wav.getSamples(true); // true = get as Float32Arrays

    // For mono files, ensure samples is an array of arrays
    const channelData = Array.isArray(samples[0]) ? samples : [samples];

    return {
      channelData,
      sampleRate,
      numChannels,
      duration: channelData[0].length / sampleRate,
    };
  }

  /**
   * Compare two WAV files and find ranges where they differ
   * @param {String} file1Path - Path to first WAV file
   * @param {String} file2Path - Path to second WAV file
   * @returns {Array} - Array of difference ranges
   */
  findDifferences(file1Path, file2Path) {
    // Load WAV files
    const wav1 = this.loadWavFile(file1Path);
    const wav2 = this.loadWavFile(file2Path);

    // Basic validation
    if (wav1.sampleRate !== wav2.sampleRate) {
      throw new Error(
        `Sample rates don't match: ${wav1.sampleRate} vs ${wav2.sampleRate}`,
      );
    }

    const numChannels = Math.min(wav1.numChannels, wav2.numChannels);
    const differences = [];

    // Compare each channel
    for (let channel = 0; channel < numChannels; channel++) {
      const data1 = wav1.channelData[channel];
      const data2 = wav2.channelData[channel];
      const length = Math.min(data1.length, data2.length);

      let diffStart = null;

      // Simple sample-by-sample comparison
      for (let i = 0; i < length; i++) {
        const diff = Math.abs(data1[i] - data2[i]);

        if (diff > this.threshold) {
          // Found difference
          if (diffStart === null) {
            diffStart = i;
          }
        } else if (diffStart !== null) {
          // Difference ended
          const diffLength = i - diffStart;

          if (diffLength >= this.minDifferenceLength) {
            differences.push({
              channel,
              startSample: diffStart,
              endSample: i,
              startTime: diffStart / wav1.sampleRate,
              endTime: i / wav1.sampleRate,
              duration: (i - diffStart) / wav1.sampleRate,
            });
          }

          diffStart = null;
        }
      }

      // Check if difference continues to the end
      if (diffStart !== null) {
        const diffLength = length - diffStart;

        if (diffLength >= this.minDifferenceLength) {
          differences.push({
            channel,
            startSample: diffStart,
            endSample: length,
            startTime: diffStart / wav1.sampleRate,
            endTime: length / wav1.sampleRate,
            duration: (length - diffStart) / wav1.sampleRate,
          });
        }
      }
    }

    return {
      differences,
      metadata: {
        file1: {
          path: file1Path,
          sampleRate: wav1.sampleRate,
          duration: wav1.duration,
          channels: wav1.numChannels,
        },
        file2: {
          path: file2Path,
          sampleRate: wav2.sampleRate,
          duration: wav2.duration,
          channels: wav2.numChannels,
        },
      },
    };
  }

  /**
   * Generate a human-readable report of the differences
   * @param {Object} results - Results from findDifferences
   * @returns {String} - Formatted report
   */
  generateReport(results) {
    const { differences, metadata } = results;

    let report = "=== WAV File Comparison Report ===\n\n";

    // Add file info
    report += `File 1: ${metadata.file1.path}\n`;
    report += `  Duration: ${metadata.file1.duration.toFixed(2)}s, Channels: ${metadata.file1.channels}\n\n`;

    report += `File 2: ${metadata.file2.path}\n`;
    report += `  Duration: ${metadata.file2.duration.toFixed(2)}s, Channels: ${metadata.file2.channels}\n\n`;

    // Add differences
    if (differences.length === 0) {
      report += "No differences found between files.\n";
    } else {
      report += `Found ${differences.length} different regions:\n\n`;

      differences.forEach((diff, i) => {
        report += `Difference #${i + 1}:\n`;
        report += `  Channel: ${diff.channel}\n`;
        report += `  Time Range: ${diff.startTime.toFixed(3)}s - ${diff.endTime.toFixed(3)}s (${diff.duration.toFixed(3)}s)\n`;
        report += `  Sample Range: ${diff.startSample} - ${diff.endSample}\n\n`;
      });
    }

    return report;
  }
}

// Example usage
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log(
      "Usage: node wav-comparer.js file1.wav file2.wav [threshold] [minLength]",
    );
    process.exit(1);
  }

  const [file1, file2, threshold, minLength] = args;
  const comparer = new BasicWavComparer({
    threshold: threshold ? parseFloat(threshold) : 0.001,
    minDifferenceLength: minLength ? parseInt(minLength) : 10,
  });

  const results = comparer.findDifferences(file1, file2);
  console.log(comparer.generateReport(results));
}

module.exports = compareWavFiles;

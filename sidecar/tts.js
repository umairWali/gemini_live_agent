const fs = require('fs');
const { execSync } = require('child_process');
execSync('espeak -w test.wav "Hello, how are you doing today? I am fine."');
execSync('ffmpeg -i test.wav -acodec pcm_s16le -ar 24000 -ac 1 test.raw -y');

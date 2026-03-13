// Audio Processor Worklet — Streams raw PCM audio to main thread
// Turn-taking is handled entirely by Gemini's Server-Side VAD.
// This worklet ONLY captures and streams audio. No client-side VAD.

class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
    }

    process(inputs) {
        const input = inputs[0];
        if (input && input.length > 0) {
            const channelData = input[0];
            // Stream raw audio data to main thread for sending to Gemini
            this.port.postMessage({ 
                event: 'data', 
                buffer: new Float32Array(channelData) 
            });
        }
        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);

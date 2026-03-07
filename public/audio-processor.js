class AudioProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.lastSpeechTime = 0;
        this.isSpeaking = false;
        this.threshold = 0.02; // Standard voice sensitivity
        this.silenceDelay = 1.0;
    }

    process(inputs) {
        const input = inputs[0];
        if (input && input.length > 0) {
            const channelData = input[0];

            // RMS Calculation for VAD
            let sumSq = 0;
            for (let i = 0; i < channelData.length; i++) {
                sumSq += channelData[i] * channelData[i];
            }
            const rms = Math.sqrt(sumSq / channelData.length);

            if (rms > this.threshold) {
                this.lastSpeechTime = currentTime;
                if (!this.isSpeaking) {
                    this.isSpeaking = true;
                    this.port.postMessage({ event: 'speech_start' });
                }
            } else {
                if (this.isSpeaking && (currentTime - this.lastSpeechTime > this.silenceDelay)) {
                    this.isSpeaking = false;
                    this.port.postMessage({ event: 'speech_end' });
                }
            }

            // Continuous data stream
            this.port.postMessage({ event: 'data', buffer: new Float32Array(channelData) });
        }
        return true;
    }
}

registerProcessor('audio-processor', AudioProcessor);

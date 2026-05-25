/**
 * Quoridor Audio Synthesizer Engine
 * Uses browser Web Audio API to generate retro-modern synthesizer sound effects.
 * No external asset loading required, avoiding resource loading issues.
 */
class SoundSynth {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.volume = 0.3; // Default master volume (0.0 to 1.0)
    }

    /**
     * Initializes the AudioContext on first user interaction.
     * Browsers block autoplay audio until a user gesture.
     */
    init() {
        if (this.ctx) return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
        } catch (e) {
            console.warn("Web Audio API is not supported in this browser.", e);
        }
    }

    setMuted(muted) {
        this.muted = muted;
        if (!muted) {
            this.init();
        }
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.init();
    }

    createGainNode(duration) {
        if (!this.ctx) return null;
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        
        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        gainNode.connect(this.ctx.destination);
        return gainNode;
    }

    /**
     * Synthesizes a soft, clean organic pop sound for menu clicks.
     */
    playClick() {
        if (this.muted) return;
        this.init();
        const gainNode = this.createGainNode();
        if (!gainNode) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);
        
        gainNode.gain.setValueAtTime(this.volume * 0.5, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        
        osc.connect(gainNode);
        osc.start(now);
        osc.stop(now + 0.08);
    }

    /**
     * Synthesizes a bright, ascending dynamic chime for pawn movements.
     */
    playMove() {
        if (this.muted) return;
        this.init();
        const gainNode = this.createGainNode();
        if (!gainNode) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(261.63, now); // C4
        osc.frequency.exponentialRampToValueAtTime(523.25, now + 0.15); // C5
        
        gainNode.gain.setValueAtTime(this.volume * 0.8, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        
        osc.connect(gainNode);
        osc.start(now);
        osc.stop(now + 0.18);
    }

    /**
     * Synthesizes a solid, metallic wood-clack for wall placements.
     */
    playWall() {
        if (this.muted) return;
        this.init();
        const gainNode = this.createGainNode();
        if (!gainNode) return;

        const now = this.ctx.currentTime;
        
        // Dynamic wooden click: combine a low frequency sine burst and white noise filter
        const osc = this.ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);

        // Quick noise impact
        let bufferSize = this.ctx.sampleRate * 0.05; // 50ms of noise
        let buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        let data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(1000, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(200, now + 0.04);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(this.volume * 0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(gainNode);

        gainNode.gain.setValueAtTime(this.volume * 1.0, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);

        osc.connect(gainNode);
        
        osc.start(now);
        osc.stop(now + 0.15);
        
        noise.start(now);
        noise.stop(now + 0.05);
    }

    /**
     * Synthesizes a low-pitch warning buzz for illegal moves.
     */
    playInvalid() {
        if (this.muted) return;
        this.init();
        const gainNode = this.createGainNode();
        if (!gainNode) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.setValueAtTime(115, now + 0.08);
        
        gainNode.gain.setValueAtTime(this.volume * 0.9, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        
        osc.connect(gainNode);
        osc.start(now);
        osc.stop(now + 0.25);
    }

    /**
     * Synthesizes a beautiful ascending arpeggio fanfare for game victory.
     */
    playWin() {
        if (this.muted) return;
        this.init();
        
        const now = this.ctx.currentTime;
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // C Major arpeggio
        
        notes.forEach((freq, index) => {
            const time = now + index * 0.12;
            const gainNode = this.ctx.createGain();
            gainNode.gain.setValueAtTime(this.volume * 0.6, time);
            gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
            gainNode.connect(this.ctx.destination);

            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, time);
            
            // Add slight vibrato
            const vibrato = this.ctx.createOscillator();
            vibrato.frequency.value = 6;
            const vibratoGain = this.ctx.createGain();
            vibratoGain.gain.value = 5;
            
            vibrato.connect(vibratoGain);
            vibratoGain.connect(osc.frequency);
            
            osc.connect(gainNode);
            
            vibrato.start(time);
            osc.start(time);
            
            vibrato.stop(time + 0.4);
            osc.stop(time + 0.4);
        });
    }
}

// Export single instance for global UI usage
const soundSynth = new SoundSynth();

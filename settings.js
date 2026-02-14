// ==================== Settings Management ====================

class Settings {
    constructor() {
        this.difficulty = 'medium';
        this.soundEnabled = true;
        this.gridDisplay = true;
        this.customSeed = null;
        this.showControlsOnStart = true;
        this.mobStrength = 50; // 1..100
        this.peaceful = false;
        this.beamCooldownMs = 500;
        this.beamPenetration = false;
        this.hintPersistent = false;
        this.difficultyValue = 500; // 1..1000
        this.enemyAmount = 50; // 1..100
        this.enemySpeed = 50; // 1..100
        this.characterType = 0; // 0..9
        this.loadSettings();
    }

    loadSettings() {
        const saved = localStorage.getItem('mazeGameSettings');
        if (saved) {
            try {
                const settings = JSON.parse(saved);
                this.difficulty = settings.difficulty || 'medium';
                this.soundEnabled = settings.soundEnabled !== false;
                this.gridDisplay = settings.gridDisplay !== false;
                this.customSeed = settings.customSeed || null;
                this.showControlsOnStart = settings.hasOwnProperty('showControlsOnStart') ? !!settings.showControlsOnStart : true;
                this.mobStrength = typeof settings.mobStrength === 'number' ? settings.mobStrength : 50;
                this.peaceful = !!settings.peaceful;
                this.beamCooldownMs = typeof settings.beamCooldownMs === 'number' ? settings.beamCooldownMs : 500;
                this.beamPenetration = !!settings.beamPenetration;
                this.hintPersistent = !!settings.hintPersistent;
                this.difficultyValue = typeof settings.difficultyValue === 'number' ? settings.difficultyValue : 500;
                this.enemyAmount = typeof settings.enemyAmount === 'number' ? settings.enemyAmount : 50;
                this.enemySpeed = typeof settings.enemySpeed === 'number' ? settings.enemySpeed : 50;
                this.characterType = typeof settings.characterType === 'number' ? settings.characterType : 0;
            } catch (e) {
                console.error('Failed to load settings:', e);
            }
        }
    }

    saveSettings() {
        const settings = {
            difficulty: this.difficulty,
            soundEnabled: this.soundEnabled,
            gridDisplay: this.gridDisplay,
            customSeed: this.customSeed
        ,    difficultyValue: this.difficultyValue
        ,    showControlsOnStart: this.showControlsOnStart
        ,    mobStrength: this.mobStrength
        ,    peaceful: this.peaceful
        ,    beamCooldownMs: this.beamCooldownMs
        ,    beamPenetration: this.beamPenetration
        ,    hintPersistent: this.hintPersistent
        ,    enemyAmount: this.enemyAmount
        ,    enemySpeed: this.enemySpeed
        ,    characterType: this.characterType
        };
        localStorage.setItem('mazeGameSettings', JSON.stringify(settings));
    }

    setEnemyAmount(val) {
        const n = parseInt(val, 10);
        if (!isNaN(n) && n >= 1 && n <= 100) {
            this.enemyAmount = n;
            this.saveSettings();
        }
    }
    getEnemyAmount() {
        return this.enemyAmount || 50;
    }
    setEnemySpeed(val) {
        const n = parseInt(val, 10);
        if (!isNaN(n) && n >= 1 && n <= 100) {
            this.enemySpeed = n;
            this.saveSettings();
        }
    }
    getEnemySpeed() {
        return this.enemySpeed || 50;
    }
    setCharacterType(val) {
        const n = parseInt(val, 10);
        if (!isNaN(n) && n >= 0 && n <= 9) {
            this.characterType = n;
            this.saveSettings();
        }
    }
    getCharacterType() {
        return this.characterType || 0;
    }

    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        this.saveSettings();
    }

    getDifficulty() {
        return this.difficulty;
    }

    setSoundEnabled(enabled) {
        this.soundEnabled = enabled;
        this.saveSettings();
    }

    isSoundEnabled() {
        return this.soundEnabled;
    }

    setGridDisplay(display) {
        this.gridDisplay = display;
        this.saveSettings();
        if (renderer) {
            renderer.setShowGrid(display);
        }
    }

    isGridDisplay() {
        return this.gridDisplay;
    }

    setSeed(seed) {
        if (seed === null || seed === '') {
            this.customSeed = null;
        } else {
            const seedValue = parseInt(seed, 10);
            if (!isNaN(seedValue) && seedValue >= 0 && seedValue <= 999999) {
                this.customSeed = seedValue;
            }
        }
        this.saveSettings();
    }

    setDifficultyValue(val) {
        const n = parseInt(val, 10);
        if (!isNaN(n) && n >= 1 && n <= 1000) {
            this.difficultyValue = n;
            this.saveSettings();
        }
    }

    getDifficultyValue() {
        return this.difficultyValue || 500;
    }

    getSeed() {
        return this.customSeed;
    }

    isShowControlsOnStart() {
        return this.showControlsOnStart !== false;
    }

    setShowControlsOnStart(val) {
        this.showControlsOnStart = !!val;
        this.saveSettings();
    }

    getMobStrength() {
        return typeof this.mobStrength === 'number' ? this.mobStrength : 50;
    }

    setMobStrength(val) {
        const n = parseInt(val, 10);
        if (!isNaN(n) && n >= 1 && n <= 100) {
            this.mobStrength = n;
            this.saveSettings();
        }
    }

    isPeaceful() {
        return !!this.peaceful;
    }

    setPeaceful(val) {
        this.peaceful = !!val;
        this.saveSettings();
    }

    // Beam settings
    getBeamCooldownMs() {
        return typeof this.beamCooldownMs === 'number' ? this.beamCooldownMs : 500;
    }

    setBeamCooldownMs(ms) {
        const n = parseInt(ms, 10);
        if (!isNaN(n) && n >= 100 && n <= 5000) {
            this.beamCooldownMs = n;
            this.saveSettings();
        }
    }

    isBeamPenetration() {
        return !!this.beamPenetration;
    }

    setBeamPenetration(val) {
        this.beamPenetration = !!val;
        this.saveSettings();
    }

    isHintPersistent() {
        return !!this.hintPersistent;
    }

    setHintPersistent(val) {
        this.hintPersistent = !!val;
        this.saveSettings();
    }

    reset() {
        this.difficulty = 'medium';
        this.soundEnabled = true;
        this.gridDisplay = true;
        this.customSeed = null;
        this.saveSettings();
    }
}

// Audio Manager
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.isMuted = false;
        this.initAudioContext();
    }

    initAudioContext() {
        if (!this.audioContext) {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                this.audioContext = new AudioContext();
            } catch (e) {
                console.warn('Web Audio API not supported:', e);
            }
        }
    }

    playTone(frequency, duration) {
        if (!settings.isSoundEnabled() || !this.audioContext) return;

        try {
            const now = this.audioContext.currentTime;
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.connect(gain);
            gain.connect(this.audioContext.destination);

            osc.frequency.value = frequency;
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

            osc.start(now);
            osc.stop(now + duration);
        } catch (e) {
            console.error('Failed to play tone:', e);
        }
    }

    playMoveSound() {
        this.playTone(400, 0.1);
    }

    playGoalSound() {
        this.playTone(800, 0.2);
        setTimeout(() => this.playTone(1000, 0.2), 150);
    }
}

// Global instances
const settings = new Settings();
const audioManager = new AudioManager();

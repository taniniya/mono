// ==================== Input Handling ====================

class InputHandler {
    constructor() {
        this.keys = {};
        this.lastMoveDir = {dx: 1, dy: 0};
        this.lastShotTime = 0;
        this.setupEventListeners();
        this.setupTouchControls();
        this.isMobile = this.detectMobile();
    }

    detectMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
            || window.innerWidth <= 768;
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        window.addEventListener('resize', () => this.updateMobileDisplay());
    }

    setupTouchControls() {
        const touchControls = document.getElementById('touchControls');
        if (!touchControls) return;

        // Show/hide controls based on screen size
        this.updateMobileDisplay();

        // Touch button mappings (include attack)
        const buttonMappings = {
            'btnUp': 'arrowup',
            'btnDown': 'arrowdown',
            'btnLeft': 'arrowleft',
            'btnRight': 'arrowright',
            'btnAttack': 'space'
        };

        for (const [btnId, keyName] of Object.entries(buttonMappings)) {
            const btn = document.getElementById(btnId);
            if (!btn) continue;

            // Track touch state for this specific button
            let touchActive = false;

            btn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                touchActive = true;
                this.keys[keyName] = true;
            });

            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                touchActive = false;
                // Delay key release to ensure move is registered
                setTimeout(() => {
                    if (!touchActive) {
                        this.keys[keyName] = false;
                    }
                }, 80);
            });

            btn.addEventListener('touchcancel', (e) => {
                e.preventDefault();
                touchActive = false;
                this.keys[keyName] = false;
            });

            btn.addEventListener('mousedown', () => {
                touchActive = true;
                this.keys[keyName] = true;
            });

            btn.addEventListener('mouseup', () => {
                touchActive = false;
                setTimeout(() => {
                    if (!touchActive) {
                        this.keys[keyName] = false;
                    }
                }, 80);
            });

            btn.addEventListener('mouseleave', () => {
                touchActive = false;
                this.keys[keyName] = false;
            });
        }
    }

    updateMobileDisplay() {
        const touchControls = document.getElementById('touchControls');
        if (!touchControls) return;

        this.isMobile = this.detectMobile();
        if (this.isMobile) {
            touchControls.classList.add('visible');
        } else {
            touchControls.classList.remove('visible');
        }
    }

    onKeyDown(event) {
        const key = (event.key || '').toLowerCase();
        // Support Space via event.code
        if (event.code === 'Space') {
            this.keys['space'] = true;
            event.preventDefault();
            return;
        }
        this.keys[key] = true;

        // Prevent default for arrow keys and WASD
        if (
            ['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)
        ) {
            event.preventDefault();
        }
    }

    onKeyUp(event) {
        const key = (event.key || '').toLowerCase();
        if (event.code === 'Space') {
            this.keys['space'] = false;
            return;
        }
        this.keys[key] = false;
    }

    // Handle attack action (space or touch attack)
    handleAttack() {
        if (!gameState.maze || gameState.isPaused) return 0;
        if (this.isKeyPressed('space')) {
            const now = Date.now();
            const cooldown = settings.getBeamCooldownMs ? settings.getBeamCooldownMs() : 500;
            if (now - this.lastShotTime < cooldown) {
                // still cooling down
                return 0;
            }
            // determine shooting direction: prioritized by arrow/WASD keys, fall back to lastMoveDir
            let dx = 0, dy = 0;
            if (this.isKeyPressed('arrowup') || this.isKeyPressed('w')) { dx = 0; dy = -1; }
            else if (this.isKeyPressed('arrowdown') || this.isKeyPressed('s')) { dx = 0; dy = 1; }
            else if (this.isKeyPressed('arrowleft') || this.isKeyPressed('a')) { dx = -1; dy = 0; }
            else if (this.isKeyPressed('arrowright') || this.isKeyPressed('d')) { dx = 1; dy = 0; }
            else {
                // Prefer maze playerDir if available, otherwise fall back to lastMoveDir
                if (gameState && gameState.maze && gameState.maze.playerDir) {
                    dx = gameState.maze.playerDir.dx;
                    dy = gameState.maze.playerDir.dy;
                } else {
                    dx = this.lastMoveDir.dx; dy = this.lastMoveDir.dy;
                }
            }

            const killed = gameState.maze.playerShoot(dx, dy);
            this.lastShotTime = now;
            // consume the attack input so it's not repeated
            this.keys['space'] = false;
            if (killed > 0 && settings.isSoundEnabled && audioManager) {
                // settings.isSoundEnabled may be a function
                if (typeof settings.isSoundEnabled === 'function' ? settings.isSoundEnabled() : settings.isSoundEnabled) {
                    audioManager.playTone(700, 0.08);
                }
            }
            return killed;
        }
        return 0;
    }

    isKeyPressed(key) {
        return this.keys[key] || false;
    }

    handleMovement() {
        if (!gameState.maze || gameState.isPaused) return false;

        let moved = false;

        // Arrow keys
        if (this.isKeyPressed('arrowup') || this.isKeyPressed('w')) {
            if (gameState.maze.movePlayer(0, -1)) {
                this.lastMoveDir = {dx:0, dy:-1};
                moved = true;
            }
        }
        
        if (this.isKeyPressed('arrowdown') || this.isKeyPressed('s')) {
            if (gameState.maze.movePlayer(0, 1)) {
                this.lastMoveDir = {dx:0, dy:1};
                moved = true;
            }
        }

        if (this.isKeyPressed('arrowleft') || this.isKeyPressed('a')) {
            if (gameState.maze.movePlayer(-1, 0)) {
                this.lastMoveDir = {dx:-1, dy:0};
                moved = true;
            }
        } else if (this.isKeyPressed('arrowright') || this.isKeyPressed('d')) {
            if (gameState.maze.movePlayer(1, 0)) {
                this.lastMoveDir = {dx:1, dy:0};
                moved = true;
            }
        }

        return moved;
    }

    checkGoalReached() {
        if (gameState.maze && gameState.maze.isPlayerAtGoal()) {
            return true;
        }
        return false;
    }

    clear() {
        this.keys = {};
    }
}

// Initialize input handler
const inputHandler = new InputHandler();

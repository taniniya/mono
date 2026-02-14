// ==================== GUI Management ====================

class GUI {
    constructor() {
        this.currentScreen = 'titleScreen';
        this.setupScreenElements();
        this.setupEventListeners();
    }

    setupScreenElements() {
        this.screens = {
            titleScreen: document.getElementById('titleScreen'),
            preGameScreen: document.getElementById('preGameScreen'),
            gameScreen: document.getElementById('gameScreen'),
            settingsScreen: document.getElementById('settingsScreen'),
            aboutScreen: document.getElementById('aboutScreen'),
            completeScreen: document.getElementById('completeScreen')
        };

        this.pauseMenu = document.getElementById('pauseMenu');
        this.canvas = document.getElementById('mazeCanvas');
        this.controlsModal = document.getElementById('controlsModal');
    }

    setupEventListeners() {
        // Title Screen
        document.getElementById('startBtn').addEventListener('click', () => this.showPreGameScreen());
        document.getElementById('settingsBtn').addEventListener('click', () => this.showScreen('settingsScreen'));
        document.getElementById('aboutBtn').addEventListener('click', () => this.showScreen('aboutScreen'));

        // Pre-Game Setup Screen
        document.getElementById('preGameStartBtn').addEventListener('click', () => this.startGameFromPreGame());
        document.getElementById('preGameBackBtn').addEventListener('click', () => this.showScreen('titleScreen'));

        // Game Screen
        document.getElementById('pauseBtn').addEventListener('click', () => this.togglePause());

        // Settings Screen
        document.getElementById('settingsBackBtn').addEventListener('click', () => this.showScreen('titleScreen'));
        // Beam/hint settings UI
        const beamSlider = document.getElementById('beamCooldownSlider');
        const beamVal = document.getElementById('beamCooldownValue');
        if (beamSlider && beamVal) {
            beamSlider.oninput = () => { beamVal.textContent = beamSlider.value; };
            beamSlider.onchange = () => { settings.setBeamCooldownMs(beamSlider.value); };
        }
        const beamPenCb = document.getElementById('beamPenetrationCheckbox');
        if (beamPenCb) beamPenCb.addEventListener('change', (e) => settings.setBeamPenetration(e.target.checked));
        const hintPersistentCb = document.getElementById('hintPersistentCheckbox');
        if (hintPersistentCb) hintPersistentCb.addEventListener('change', (e) => {
            settings.setHintPersistent(e.target.checked);
            if (e.target.checked) {
                gameState.hintExpiry = Infinity;
            } else {
                gameState.hintExpiry = undefined;
            }
        });
        // Show controls from settings
        const showControlsBtn = document.getElementById('showControlsBtn');
        if (showControlsBtn) showControlsBtn.addEventListener('click', () => this.showControlsModal('settings'));
        document.getElementById('soundToggle').addEventListener('change', (e) => {
            settings.setSoundEnabled(e.target.checked);
        });
        document.getElementById('gridToggle').addEventListener('change', (e) => {
            settings.setGridDisplay(e.target.checked);
        });

        // About Screen
        document.getElementById('aboutBackBtn').addEventListener('click', () => this.showScreen('titleScreen'));

        // Pause Menu
        document.getElementById('resumeBtn').addEventListener('click', () => this.resumeGame());
        document.getElementById('pauseBackBtn').addEventListener('click', () => this.backToMenu());

        // Controls Modal
        const playBtn = document.getElementById('controlsPlayBtn');
        const backBtn = document.getElementById('controlsBackBtn');
        if (playBtn) playBtn.addEventListener('click', () => {
            const hideNext = document.getElementById('hideControlsCheckbox').checked;
            settings.setShowControlsOnStart(!hideNext);
            if (this.controlsModal) this.controlsModal.classList.remove('active');
            // proceed to start the game
            this.startGame();
        });
        if (backBtn) backBtn.addEventListener('click', () => {
            // close modal and return to origin (preGame or settings)
            if (this.controlsModal) this.controlsModal.classList.remove('active');
            if (this.controlsOrigin === 'settings') {
                this.showScreen('settingsScreen');
            } else {
                this.showPreGameScreen();
            }
        });
        // Hint button in game UI
        const hintBtn = document.getElementById('hintBtn');
        if (hintBtn) hintBtn.addEventListener('click', () => {
            // Show hint for 5 seconds (compass). If user enabled persistent hint in settings, it will always show.
            gameState.hintExpiry = Date.now() + 5000;
        });
        // Game Complete Screen
        document.getElementById('completeRestartBtn').addEventListener('click', () => this.showPreGameScreen());
        document.getElementById('completeMenuBtn').addEventListener('click', () => this.showScreen('titleScreen'));
    }

    showScreen(screenName) {
        if (!this.screens[screenName]) return;

        // Hide all screens
        Object.values(this.screens).forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        this.screens[screenName].classList.add('active');
        this.currentScreen = screenName;

        // Update UI if showing settings screen
        if (screenName === 'settingsScreen') {
            document.getElementById('soundToggle').checked = settings.isSoundEnabled();
            document.getElementById('gridToggle').checked = settings.isGridDisplay();
            // キャラクターセレクト・プレビューも同期
            const charSel = document.getElementById('settingsCharacterSelect');
            const charPreview = document.getElementById('settingsCharacterPreview');
            if (charSel && charPreview) {
                charSel.value = settings.getCharacterType();
                this.updateCharacterPreview(charSel.value, charPreview);
            } else if (charPreview) {
                charPreview.innerHTML = '&nbsp;';
                charPreview.style.background = '#222';
                charPreview.style.border = '2px solid #fff';
            }
        }
    }

    showPreGameScreen() {
        this.showScreen('preGameScreen');
        // Initialize pre-game screen with current values
        document.getElementById('preGameDifficultySelect').value = settings.getDifficulty();
        const seedValue = settings.getSeed();
        document.getElementById('preGameSeedInput').value = seedValue !== null ? seedValue : '';
        // Difficulty slider
        const diffSlider = document.getElementById('preGameDifficultySlider');
        const diffValue = document.getElementById('preGameDifficultyValue');
        if (diffSlider && diffValue) {
            const current = settings.getDifficultyValue();
            diffSlider.value = current;
            diffValue.textContent = String(current);
            diffSlider.oninput = () => { diffValue.textContent = diffSlider.value; };
        }
        // Mob strength slider
        const mobSlider = document.getElementById('preGameMobStrengthSlider');
        const mobValue = document.getElementById('preGameMobStrengthValue');
        if (mobSlider && mobValue) {
            const current = settings.getMobStrength();
            mobSlider.value = current;
            mobValue.textContent = String(current);
            mobSlider.oninput = () => { mobValue.textContent = mobSlider.value; };
        }

        // Enemy amount slider
        const enemyAmountSlider = document.getElementById('preGameEnemyAmountSlider');
        const enemyAmountValue = document.getElementById('preGameEnemyAmountValue');
        if (enemyAmountSlider && enemyAmountValue) {
            const current = settings.getEnemyAmount();
            enemyAmountSlider.value = current;
            enemyAmountValue.textContent = String(current);
            enemyAmountSlider.oninput = () => { enemyAmountValue.textContent = enemyAmountSlider.value; };
        }
        // Enemy speed slider
        const enemySpeedSlider = document.getElementById('preGameEnemySpeedSlider');
        const enemySpeedValue = document.getElementById('preGameEnemySpeedValue');
        if (enemySpeedSlider && enemySpeedValue) {
            const current = settings.getEnemySpeed();
            enemySpeedSlider.value = current;
            enemySpeedValue.textContent = String(current);
            enemySpeedSlider.oninput = () => { enemySpeedValue.textContent = enemySpeedSlider.value; };
        }
        // Character select（設定画面用）
        const charSel = document.getElementById('settingsCharacterSelect');
        const charPreview = document.getElementById('settingsCharacterPreview');
        if (charSel && charPreview) {
            charSel.value = settings.getCharacterType();
            this.updateCharacterPreview(charSel.value, charPreview);
            charSel.onchange = () => {
                this.updateCharacterPreview(charSel.value, charPreview);
                settings.setCharacterType(charSel.value);
            };
        } else if (charPreview) {
            charPreview.innerHTML = '&nbsp;';
            charPreview.style.background = '#222';
            charPreview.style.border = '2px solid #fff';
        }
        // ...existing code...
    }

    updateCharacterPreview(type) {
        // 10種の簡易キャラプレビュー（色や形を変える）
        // 任意のプレビュー要素を受け取れるように
        let el = arguments[1] || document.getElementById('settingsCharacterPreview');
        if (!el) return;
        el.innerHTML = '';
        const colors = [
            '#0099ff', '#ff9900', '#44cc44', '#cc44cc', '#ff4444',
            '#888888', '#ffee00', '#00cccc', '#ff66cc', '#222222'
        ];
        const faces = [
            '●', '▲', '■', '◆', '★', '◎', '☻', '♣', '♠', '☀'
        ];
        const idx = Math.max(0, Math.min(9, parseInt(type, 10) || 0));
        el.style.background = colors[idx];
        el.style.borderRadius = idx === 0 ? '40%' : '18%';
        el.style.display = 'flex';
        el.style.alignItems = 'center';
        el.style.justifyContent = 'center';
        el.style.fontSize = '48px';
        el.style.fontWeight = 'bold';
        el.style.color = '#fff';
        el.textContent = faces[idx];
    }

    startGameFromPreGame() {
        // Get difficulty from pre-game screen
        const difficulty = document.getElementById('preGameDifficultySelect').value;
        const seedInput = document.getElementById('preGameSeedInput').value;

        // Set the difficulty and seed
        settings.setDifficulty(difficulty);
        if (seedInput !== '') {
            settings.setSeed(seedInput);
        } else {
            settings.setSeed(null);
        }
        // read numeric difficulty slider (1-1000)
        const diffSlider = document.getElementById('preGameDifficultySlider');
        if (diffSlider) {
            settings.setDifficultyValue(diffSlider.value);
        }
        // read mob strength and peaceful
        const mobSlider = document.getElementById('preGameMobStrengthSlider');
        if (mobSlider) settings.setMobStrength(mobSlider.value);
        const peacefulCb = document.getElementById('preGamePeacefulCheckbox');
        if (peacefulCb) settings.setPeaceful(peacefulCb.checked);
        // Also ensure settings persisted for beam/hint if user adjusted in pregame settings screen (if present)
        const beamSlider = document.getElementById('beamCooldownSlider');
        if (beamSlider) settings.setBeamCooldownMs(beamSlider.value);
        const beamPenCb = document.getElementById('beamPenetrationCheckbox');
        if (beamPenCb) settings.setBeamPenetration(beamPenCb.checked);
        const hintPersistentCb = document.getElementById('hintPersistentCheckbox');
        if (hintPersistentCb) settings.setHintPersistent(hintPersistentCb.checked);

        // read enemy amount/speed and character type
        const enemyAmountSlider = document.getElementById('preGameEnemyAmountSlider');
        if (enemyAmountSlider) settings.setEnemyAmount(enemyAmountSlider.value);
        const enemySpeedSlider = document.getElementById('preGameEnemySpeedSlider');
        if (enemySpeedSlider) settings.setEnemySpeed(enemySpeedSlider.value);
        const charSel = document.getElementById('preGameCharacterSelect');
        if (charSel) settings.setCharacterType(charSel.value);

        // Now start the game
        // Show controls modal after settings if enabled, otherwise start immediately
        const shouldShow = settings.isShowControlsOnStart();
        if (shouldShow && this.controlsModal) {
            // initialize checkbox state: checked = hide next time
            const hideCb = document.getElementById('hideControlsCheckbox');
            if (hideCb) hideCb.checked = !settings.isShowControlsOnStart();
            this.controlsOrigin = 'preGame';
            this.controlsModal.classList.add('active');
        } else {
            this.startGame();
        }
        
        // After starting, clear the stored custom seed so next play is random
        // (this does not affect the current game's seed already used by gameState)
        settings.setSeed(null);
        const seedInputEl = document.getElementById('preGameSeedInput');
        if (seedInputEl) seedInputEl.value = '';
    }

    showControlsModal(origin) {
        this.controlsOrigin = origin || 'settings';
        const hideCb = document.getElementById('hideControlsCheckbox');
        if (hideCb) hideCb.checked = !settings.isShowControlsOnStart();
        if (this.controlsModal) this.controlsModal.classList.add('active');
    }

    startGame() {
        const difficulty = settings.getDifficulty();
        gameState.newGame(difficulty);
        
        // Initialize renderer (will handle canvas sizing)
        initRenderer();
        
        // Force canvas size calculation
        if (renderer) {
            renderer.forceResizeCanvas();
            renderer.updateCamera();
            
            // Render multiple times to ensure visibility
            renderer.render();
            renderer.render();
            renderer.render();
        }
        
        this.showScreen('gameScreen');
        this.updateGameUI();
    }

    togglePause() {
        if (!gameState.isPaused) {
            gameState.togglePause();
            this.pauseMenu.classList.add('active');
        }
    }

    resumeGame() {
        gameState.resume();
        this.pauseMenu.classList.remove('active');
    }

    backToMenu() {
        this.pauseMenu.classList.remove('active');
        inputHandler.clear();
        if (game) {
            game.reset();
        }
        this.showScreen('titleScreen');
    }

    updateGameUI() {
        // Update coin display
        const coinCount = gameState.maze.coinCollected;
        const totalCoins = gameState.maze.totalCoins;
        document.getElementById('coinDisplay').textContent = `${coinCount} / ${totalCoins}`;
        
        // Update time display
        gameState.updateTimer();
        document.getElementById('timeDisplay').textContent = gameState.getFormattedTime();
        
        // Update seed display
        const seedEl = document.getElementById('seedDisplay');
        if (seedEl && gameState && typeof gameState.seed !== 'undefined') {
            seedEl.textContent = String(gameState.seed);
        }
        // Update HP display
        const hpEl = document.getElementById('hpDisplay');
        if (hpEl && gameState && gameState.maze) {
            hpEl.textContent = String(gameState.maze.playerHP || 0);
        }
        // Update beam cooldown blocks UI
        const beamBlocksEl = document.getElementById('beamBlocks');
        if (beamBlocksEl && inputHandler) {
            const last = inputHandler.lastShotTime || 0;
            const cooldown = settings.getBeamCooldownMs ? settings.getBeamCooldownMs() : 500;
            const now = Date.now();
            const elapsed = Math.max(0, now - last);
            const frac = Math.min(1, elapsed / cooldown);
            // render 8 blocks, filled proportionally
            const total = 8;
            const filled = Math.round(frac * total);
            beamBlocksEl.innerHTML = '';
            for (let i = 0; i < total; i++) {
                const b = document.createElement('div');
                b.style.width = '10px';
                b.style.height = '12px';
                b.style.border = '1px solid #444';
                b.style.background = i < filled ? '#ffffff' : '#222';
                b.style.boxShadow = i < filled ? '0 0 6px rgba(255,255,255,0.8)' : 'none';
                beamBlocksEl.appendChild(b);
            }
            // numeric ms remaining (optional)
            const msRem = Math.max(0, cooldown - elapsed);
            beamBlocksEl.title = `${Math.ceil(msRem)} ms`; 
        }
    }

    updateTimeDisplay() {
        gameState.updateTimer();
        document.getElementById('timeDisplay').textContent = gameState.getFormattedTime();
        
        // Also update coin display
        const coinCount = gameState.maze.coinCollected;
        const totalCoins = gameState.maze.totalCoins;
        document.getElementById('coinDisplay').textContent = `${coinCount} / ${totalCoins}`;
        
        // Update seed display continuously
        const seedEl = document.getElementById('seedDisplay');
        if (seedEl && gameState && typeof gameState.seed !== 'undefined') {
            seedEl.textContent = String(gameState.seed);
        }
        // Update HP display
        const hpEl = document.getElementById('hpDisplay');
        if (hpEl && gameState && gameState.maze) {
            hpEl.textContent = String(gameState.maze.playerHP || 0);
        }
        // Also update beam blocks while time updates
        const beamBlocksEl = document.getElementById('beamBlocks');
        if (beamBlocksEl && inputHandler) {
            const last = inputHandler.lastShotTime || 0;
            const cooldown = settings.getBeamCooldownMs ? settings.getBeamCooldownMs() : 500;
            const now = Date.now();
            const elapsed = Math.max(0, now - last);
            const frac = Math.min(1, elapsed / cooldown);
            const total = 8;
            const filled = Math.round(frac * total);
            // update existing children
            const children = beamBlocksEl.children;
            for (let i = 0; i < total; i++) {
                if (children[i]) {
                    children[i].style.background = i < filled ? '#ffffff' : '#222';
                    children[i].style.boxShadow = i < filled ? '0 0 6px rgba(255,255,255,0.8)' : 'none';
                }
            }
            const msRem = Math.max(0, cooldown - elapsed);
            beamBlocksEl.title = `${Math.ceil(msRem)} ms`;
        }
    }

    showGameCompleteMessage() {
        const timeFormatted = gameState.getFormattedTime();
        const coinCount = gameState.maze.coinCollected;
        const totalCoins = gameState.maze.totalCoins;
        const score = gameState.maze.getScore();

        // Update complete screen UI
        document.getElementById('completeTime').textContent = timeFormatted;
        document.getElementById('completeCoinCount').textContent = `${coinCount} / ${totalCoins}`;
        document.getElementById('completeScore').textContent = score;

        // Show complete screen
        this.showScreen('completeScreen');
    }
}

// Initialize GUI
// （クラス外でインスタンス生成）
const gui = new GUI();

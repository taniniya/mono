// ==================== Main Game Loop ====================

class Game {
    constructor() {
        this.isRunning = false;
        this.isGameComplete = false;
        this.frameCount = 0;
        this.lastMoveTime = 0;
        this.moveDelay = 50; // milliseconds between moves
    }

    init() {
        this.isRunning = true;
        this.isGameComplete = false;
        this.gameLoop();
    }

    gameLoop() {
        this.frameCount++;

        // Handle input and movement
        if (gui.currentScreen === 'gameScreen' && !gameState.isPaused && !this.isGameComplete) {
            const currentTime = Date.now();
            if (currentTime - this.lastMoveTime > this.moveDelay) {
                const moved = inputHandler.handleMovement();
                if (moved) {
                    audioManager.playMoveSound();
                }
                // Always advance the movement tick time so enemies and other timed logic run at fixed rate
                this.lastMoveTime = currentTime;

                // Update enemy AI on each movement tick (slower, stable)
                if (gameState.maze) {
                    gameState.maze.updateEnemies();
                }
            }

            // Handle attack input
            inputHandler.handleAttack();

            // Check if player reached goal (every frame)
            if (inputHandler.checkGoalReached() && !this.isGameComplete) {
                this.isGameComplete = true;
                audioManager.playGoalSound();
                this.onGameComplete();
            }

            // Update timer
            gui.updateTimeDisplay();
        }

        // Render
        renderFrame();

        // Continue game loop
        requestAnimationFrame(() => this.gameLoop());
    }

    onGameComplete() {
        this.isRunning = false;
        gui.showGameCompleteMessage();
    }

    reset() {
        this.frameCount = 0;
        this.lastMoveTime = 0;
        this.isGameComplete = false;
    }
}

// ==================== Application Initialization ====================

let game = null;

function startup() {
    // Initialize renderer
    initRenderer();

    // Force canvas size
    if (renderer) {
        renderer.forceResizeCanvas();
    }
    
    // Create and start game
    game = new Game();
    game.init();

    // Ensure hint persistent setting is applied at start
    if (settings.isHintPersistent && settings.isHintPersistent()) {
        gameState.hintExpiry = Infinity;
    }

    // Log version info
    console.log('Maze Game v1.0.0 by TANISHI');
    console.log('Canvas initialized successfully');
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startup);
} else {
    startup();
}

// Handle window visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden && gui.currentScreen === 'gameScreen' && !gameState.isPaused) {
        gui.togglePause();
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    if (renderer) {
        renderer.resizeCanvas();
    }
});

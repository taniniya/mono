// ==================== Rendering ====================

class MazeRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.cellSize = 20;
        this.showGrid = true;
        this.cameraX = 0;
        this.cameraY = 0;
        this.viewportWidth = 15; // cells
        this.viewportHeight = 15; // cells
        
        // Set canvas to actual container size
        this.forceResizeCanvas();
        window.addEventListener('resize', () => this.forceResizeCanvas());
    }

    forceResizeCanvas() {
        const container = this.canvas.parentElement;
        if (container) {
            const rect = container.getBoundingClientRect();
            this.canvas.width = Math.max(rect.width, 400);
            this.canvas.height = Math.max(rect.height, 400);
            this.calculateCellSize();
        }
    }

    calculateCellSize() {
        this.cellSize = this.canvas.width / this.viewportWidth;
    }

    resizeCanvas() {
        // Recalculate cell size based on current canvas dimensions
        this.calculateCellSize();
    }

    updateCamera() {
        if (!gameState.maze) return;

        const { x, y } = gameState.maze.getPlayerPosition();
        const { width, height } = gameState.maze.getDimensions();

        // Center camera on player
        this.cameraX = Math.max(0, Math.min(x - Math.floor(this.viewportWidth / 2), width - this.viewportWidth));
        this.cameraY = Math.max(0, Math.min(y - Math.floor(this.viewportHeight / 2), height - this.viewportHeight));
    }

    render() {
        if (!gameState.maze) return;

        this.updateCamera();

        // Apply screen shake if active
        let shakeX = 0, shakeY = 0;
        if (gameState && typeof gameState.screenShake === 'number' && gameState.screenShake > 0) {
            const mag = gameState.screenShake;
            shakeX = (Math.random() * 2 - 1) * mag;
            shakeY = (Math.random() * 2 - 1) * mag;
            // decay
            gameState.screenShake = Math.max(0, gameState.screenShake - 1);
        }

        this.ctx.save();
        this.ctx.translate(shakeX, shakeY);

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.drawMaze();
        this.drawItems();
        this.drawEnemies();
        this.drawPlayer();
        this.drawGoal();
        this.drawBeam();
        this.drawHintArrow();
        // cooldown UI removed (using blocks under Coins)

        if (this.showGrid) {
            this.drawGrid();
        }

        this.ctx.restore();
    }

    drawBeam() {
        const mz = gameState.maze;
        if (!mz || !mz.beam || mz.beam.timer <= 0) return;
        const start = mz.beam.start;
        const end = mz.beam.end;
        // decrement timer
        mz.beam.timer -= 1;

        // Determine direction of beam (axial)
        const dx = Math.sign(end.x - start.x);
        const dy = Math.sign(end.y - start.y);

        // Start from adjacent cell and draw a series of sharp block squares
        let cx = start.x + dx;
        let cy = start.y + dy;
        while (true) {
            // stop if out of bounds
            if (cx < 0 || cx >= mz.width || cy < 0 || cy >= mz.height) break;

            // screen position for this cell
            const sp = this.worldToScreen(cx, cy);
            // blocky cell fill
            this.ctx.fillStyle = 'rgb(80,220,255)';
            this.ctx.fillRect(sp.x + 2, sp.y + 2, this.cellSize - 4, this.cellSize - 4);

            // darker border to emphasize block edges
            this.ctx.strokeStyle = 'rgb(30,140,160)';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(sp.x + 2, sp.y + 2, this.cellSize - 4, this.cellSize - 4);

            // small inner highlight for pixel look
            this.ctx.fillStyle = 'rgba(255,255,255,0.25)';
            this.ctx.fillRect(sp.x + this.cellSize * 0.25, sp.y + this.cellSize * 0.25, this.cellSize * 0.5, this.cellSize * 0.18);

            // impact indicator if this cell is in impacts
            if (mz.beam.impacts && mz.beam.impacts.some(p => p.x === cx && p.y === cy)) {
                this.ctx.fillStyle = 'rgba(255,140,60,0.95)';
                this.ctx.fillRect(sp.x + this.cellSize * 0.2, sp.y + this.cellSize * 0.2, this.cellSize * 0.6, this.cellSize * 0.6);
            }

            if (cx === end.x && cy === end.y) break;
            cx += dx; cy += dy;
        }
    }

    drawHintArrow() {
        const mz = gameState.maze;
        if (!mz) return;
        const persistent = settings.isHintPersistent ? settings.isHintPersistent() : false;
        if (!persistent && (!gameState.hintExpiry || Date.now() > gameState.hintExpiry)) return;

        const player = mz.getPlayerPosition();
        const goal = mz.getGoalPosition();
        const vx = goal.x - player.x;
        const vy = goal.y - player.y;
        const angle = Math.atan2(vy, vx);

        // Draw compass at bottom-center of canvas
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height - this.cellSize * 0.8;
        const radius = Math.min(this.cellSize * 1.4, 48);

        // Glow background to increase visibility
        const glowGrad = this.ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius + 12);
        glowGrad.addColorStop(0, 'rgba(0,220,255,0.16)');
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        this.ctx.fillStyle = glowGrad;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius + 18, 0, Math.PI * 2);
        this.ctx.fill();

        // Compass circle (solid center)
        this.ctx.fillStyle = 'rgba(10,10,10,0.85)';
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw ticks and cardinal N marker to look like a compass
        this.ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        this.ctx.lineWidth = 1;
        for (let t = 0; t < 8; t++) {
            const ta = (Math.PI * 2) * (t / 8);
            const x1 = cx + Math.cos(ta) * (radius - 4);
            const y1 = cy + Math.sin(ta) * (radius - 4);
            const x2 = cx + Math.cos(ta) * (radius);
            const y2 = cy + Math.sin(ta) * (radius);
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.stroke();
        }

        // Needle (brighter, pulsing)
        const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 200);
        this.ctx.strokeStyle = `rgba(0,240,255,${0.9 * pulse})`;
        this.ctx.fillStyle = `rgba(0,240,255,${0.95 * pulse})`;
        this.ctx.lineWidth = 3;

        const nx = cx + Math.cos(angle) * (radius - 10);
        const ny = cy + Math.sin(angle) * (radius - 10);
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy);
        this.ctx.lineTo(nx, ny);
        this.ctx.stroke();

        // Needle head (glowing)
        const headRad = Math.max(6, this.cellSize * 0.14);
        const headGrad = this.ctx.createRadialGradient(nx, ny, 0, nx, ny, headRad);
        headGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
        headGrad.addColorStop(0.3, 'rgba(0,200,255,0.95)');
        headGrad.addColorStop(1, 'rgba(0,200,255,0.2)');
        this.ctx.fillStyle = headGrad;
        this.ctx.beginPath();
        this.ctx.arc(nx, ny, headRad, 0, Math.PI * 2);
        this.ctx.fill();
    }

    worldToScreen(worldX, worldY) {
        return {
            x: (worldX - this.cameraX) * this.cellSize,
            y: (worldY - this.cameraY) * this.cellSize
        };
    }

    isInViewport(x, y) {
        return x >= this.cameraX && x < this.cameraX + this.viewportWidth &&
               y >= this.cameraY && y < this.cameraY + this.viewportHeight;
    }

    drawMaze() {
        const grid = gameState.maze.getGrid();
        const { width, height } = gameState.maze.getDimensions();

        this.ctx.fillStyle = '#000';

        for (let y = Math.floor(this.cameraY); y < Math.ceil(this.cameraY + this.viewportHeight) && y < height; y++) {
            for (let x = Math.floor(this.cameraX); x < Math.ceil(this.cameraX + this.viewportWidth) && x < width; x++) {
                if (grid[y][x] === TILE.WALL) {
                    const screenPos = this.worldToScreen(x, y);
                    this.ctx.fillRect(
                        screenPos.x,
                        screenPos.y,
                        this.cellSize,
                        this.cellSize
                    );
                }
            }
        }
    }

    drawItems() {
        const grid = gameState.maze.getGrid();
        const { width, height } = gameState.maze.getDimensions();

        for (let y = Math.floor(this.cameraY); y < Math.ceil(this.cameraY + this.viewportHeight) && y < height; y++) {
            for (let x = Math.floor(this.cameraX); x < Math.ceil(this.cameraX + this.viewportWidth) && x < width; x++) {
                const tile = grid[y][x];
                const screenPos = this.worldToScreen(x, y);

                if (tile === TILE.COIN) {
                    this.drawCoin(screenPos.x, screenPos.y);
                } else if (tile === TILE.GIANT_COIN) {
                    this.drawGiantCoin(screenPos.x, screenPos.y);
                } else if (tile === TILE.KEY) {
                    this.drawKey(screenPos.x, screenPos.y);
                } else if (tile === TILE.DOOR) {
                    this.drawHiddenDoor(screenPos.x, screenPos.y);
                } else if (tile === TILE.HIDDEN_ROOM && gameState.maze.hiddenRoomVisible) {
                    // Only draw if visible (player has key)
                    this.drawHiddenRoomFloor(screenPos.x, screenPos.y);
                }
            }
        }
    }

    drawCoin(px, py) {
        // Blocky, high-contrast coin for visibility
        const size = this.cellSize * 0.7;
        const x = px + (this.cellSize - size) / 2;
        const y = py + (this.cellSize - size) / 2;

        // Top face (main)
        this.ctx.fillStyle = '#ffcc1a';
        this.ctx.fillRect(x, y, size, size);

        // Left face
        this.ctx.fillStyle = '#e6b800';
        this.ctx.fillRect(x - size * 0.16, y + size * 0.16, size * 0.16, size * 0.68);

        // Right face
        this.ctx.fillStyle = '#cc9900';
        this.ctx.fillRect(x + size, y + size * 0.16, size * 0.16, size * 0.68);

        // Inner bevel (small highlight square)
        this.ctx.fillStyle = 'rgba(255,255,255,0.6)';
        this.ctx.fillRect(x + size * 0.18, y + size * 0.18, size * 0.28, size * 0.28);

        // Dark outline for contrast
        this.ctx.strokeStyle = '#775500';
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(x, y, size, size);
    }

    drawEnemies() {
        const enemies = gameState.maze.enemies || [];
        for (const e of enemies) {
            if (!e.alive) continue;
            if (!this.isInViewport(e.x, e.y)) continue;
            const screenPos = this.worldToScreen(e.x, e.y);
            this.drawEnemy(e, screenPos.x, screenPos.y);
        }
    }
    
    drawEnemy(enemy, px, py) {
        // Blocky hostile with facing-aware eyes
        const size = this.cellSize * 0.75;
        const x = px + (this.cellSize - size) / 2;
        const y = py + (this.cellSize - size) / 2;

        // Top face
        this.ctx.fillStyle = '#ff6666';
        this.ctx.fillRect(x, y, size, size);

        // Left face
        const offset = size * 0.16;
        this.ctx.fillStyle = '#cc4444';
        this.ctx.fillRect(x - offset, y + offset, offset, size * 0.68);

        // Right face
        this.ctx.fillStyle = '#aa3333';
        this.ctx.fillRect(x + size, y + offset, offset, size * 0.68);

        // Eyes shift based on facing (enemy.dir)
        const dir = enemy.dir || {dx:0, dy:0};
        let ex = 0, ey = 0;
        if (dir.dx === 1) ex = size * 0.06; else if (dir.dx === -1) ex = -size * 0.06;
        if (dir.dy === 1) ey = size * 0.05; else if (dir.dy === -1) ey = -size * 0.05;

        this.ctx.fillStyle = '#000';
        const eyeSize = Math.max(1, size * 0.12);
        this.ctx.fillRect(x + size * 0.24 + ex - eyeSize / 2, y + size * 0.32 + ey, eyeSize, eyeSize);
        this.ctx.fillRect(x + size * 0.74 + ex - eyeSize / 2, y + size * 0.32 + ey, eyeSize, eyeSize);

        // Border
        this.ctx.strokeStyle = '#660000';
        this.ctx.lineWidth = 1.2;
        this.ctx.strokeRect(x, y, size, size);
    }

    drawGiantCoin(px, py) {
        // Giant Minecraft-style gold block
        const size = this.cellSize * 0.9;
        const x = px + (this.cellSize - size) / 2;
        const y = py + (this.cellSize - size) / 2;
        const offset = size * 0.2;

        // Back depth effect
        this.ctx.fillStyle = '#997700';
        this.ctx.fillRect(x + 2, y + 2, offset, size * 0.6);
        this.ctx.fillRect(x + 2, y + 2, size * 0.6, offset);

        // Top face (brightest - gold)
        this.ctx.fillStyle = '#ffff00';
        this.ctx.fillRect(x, y, size, size);

        // Left face (darker gold)
        this.ctx.fillStyle = '#ffcc00';
        this.ctx.fillRect(x - offset, y + offset, offset, size * 0.7);

        // Right face (darker still)
        this.ctx.fillStyle = '#dd9900';
        this.ctx.fillRect(x + size, y + offset, offset, size * 0.7);

        // Texture details - grid pattern
        this.ctx.strokeStyle = '#cc8800';
        this.ctx.lineWidth = 1;
        const gridSize = size / 3;
        for (let i = 0; i <= 3; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x + i * gridSize, y);
            this.ctx.lineTo(x + i * gridSize, y + size);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(x, y + i * gridSize);
            this.ctx.lineTo(x + size, y + i * gridSize);
            this.ctx.stroke();
        }

        // Border
        this.ctx.strokeStyle = '#664400';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(x, y, size, size);
    }

    drawHiddenDoor(px, py) {
        // Minecraft-style wooden door block
        const size = this.cellSize * 0.8;
        const x = px + (this.cellSize - size) / 2;
        const y = py + (this.cellSize - size) / 2;
        const offset = size * 0.15;

        // Top face (wood)
        this.ctx.fillStyle = '#8b6f47';
        this.ctx.fillRect(x, y, size, size);

        // Left face (darker wood)
        this.ctx.fillStyle = '#6b5737';
        this.ctx.fillRect(x - offset, y + offset, offset, size * 0.7);

        // Right face (medium wood)
        this.ctx.fillStyle = '#7a6447';
        this.ctx.fillRect(x + size, y + offset, offset, size * 0.7);

        // Door panels - vertical lines
        this.ctx.strokeStyle = '#5a4a37';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(x + size / 2, y);
        this.ctx.lineTo(x + size / 2, y + size);
        this.ctx.stroke();

        // Door handle (gold knob)
        this.ctx.fillStyle = '#ffdd00';
        this.ctx.beginPath();
        this.ctx.arc(x + size * 0.75, y + size / 2, size * 0.08, 0, Math.PI * 2);
        this.ctx.fill();

        // Border
        this.ctx.strokeStyle = '#4a3a27';
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(x, y, size, size);
    }

    drawHiddenRoomFloor(px, py) {
        // Minecraft-style hidden room (purple/ender pearl theme)
        const size = this.cellSize;
        const offset = size * 0.15;

        // Top face (purple)
        this.ctx.fillStyle = '#9d4edd';
        this.ctx.fillRect(px, py, size, size);

        // Left face (darker purple)
        this.ctx.fillStyle = '#7b2cbf';
        this.ctx.fillRect(px - offset, py + offset, offset, size * 0.7);

        // Right face (darkest purple)
        this.ctx.fillStyle = '#5a189a';
        this.ctx.fillRect(px + size, py + offset, offset, size * 0.7);

        // Pattern - mystical texture grid
        this.ctx.strokeStyle = '#3c096c';
        this.ctx.lineWidth = 1;
        const gridSize = size / 2;
        for (let i = 0; i <= 2; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(px + i * gridSize, py);
            this.ctx.lineTo(px + i * gridSize, py + size);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(px, py + i * gridSize);
            this.ctx.lineTo(px + size, py + i * gridSize);
            this.ctx.stroke();
        }

        // Mystical glow spots
        this.ctx.fillStyle = 'rgba(200, 100, 255, 0.3)';
        this.ctx.beginPath();
        this.ctx.arc(px + size * 0.3, py + size * 0.3, size * 0.1, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.beginPath();
        this.ctx.arc(px + size * 0.7, py + size * 0.7, size * 0.1, 0, Math.PI * 2);
        this.ctx.fill();

        // Border
        this.ctx.strokeStyle = '#2d0a4e';
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(px, py, size, size);
    }

    drawKey(px, py) {
        // Minecraft-style emerald/lime key block
        const size = this.cellSize * 0.7;
        const x = px + (this.cellSize - size) / 2;
        const y = py + (this.cellSize - size) / 2;
        const offset = size * 0.15;

        // Top face (bright green/lime)
        this.ctx.fillStyle = '#00dd00';
        this.ctx.fillRect(x, y, size, size);

        // Left face (darker green)
        this.ctx.fillStyle = '#00aa00';
        this.ctx.fillRect(x - offset, y + offset, offset, size * 0.7);

        // Right face (darkest green)
        this.ctx.fillStyle = '#008800';
        this.ctx.fillRect(x + size, y + offset, offset, size * 0.7);

        // Texture pattern (grid)
        this.ctx.strokeStyle = '#006600';
        this.ctx.lineWidth = 1;
        const gridSize = size / 2;
        for (let i = 0; i <= 2; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x + i * gridSize, y);
            this.ctx.lineTo(x + i * gridSize, y + size);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(x, y + i * gridSize);
            this.ctx.lineTo(x + size, y + i * gridSize);
            this.ctx.stroke();
        }

        // Border
        this.ctx.strokeStyle = '#004400';
        this.ctx.lineWidth = 1.5;
        this.ctx.strokeRect(x, y, size, size);
    }

    drawPlayer() {
        const { x, y } = gameState.maze.getPlayerPosition();
        if (!this.isInViewport(x, y)) return;
        const screenPos = this.worldToScreen(x, y);
        const px = screenPos.x;
        const py = screenPos.y;
        const size = this.cellSize * 0.84;
        const offset = size * 0.14;
        // キャラタイプ取得
        const type = (settings.getCharacterType ? settings.getCharacterType() : 0) % 10;
        // 色・形・顔記号
        const colors = [
            '#0099ff', '#ff9900', '#44cc44', '#cc44cc', '#ff4444',
            '#888888', '#ffee00', '#00cccc', '#ff66cc', '#222222'
        ];
        const faces = [
            '●', '▲', '■', '◆', '★', '◎', '☻', '♣', '♠', '☀'
        ];
        // 背景ブロック
        this.ctx.fillStyle = colors[type];
        this.ctx.fillRect(px, py, size, size);
        // 顔記号
        this.ctx.font = `${Math.floor(size * 0.7)}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#fff';
        this.ctx.fillText(faces[type], px + size / 2, py + size / 2);
        // 向きで目の位置を少しずらす（type==0のみ）
        if (type === 0) {
            this.ctx.fillStyle = '#000';
            const dir = (gameState.maze.playerDir) ? gameState.maze.playerDir : { dx: 1, dy: 0 };
            let exOffset = 0; let eyOffset = 0;
            if (dir.dx === 1) exOffset = size * 0.06; else if (dir.dx === -1) exOffset = -size * 0.06;
            if (dir.dy === 1) eyOffset = size * 0.06; else if (dir.dy === -1) eyOffset = -size * 0.06;
            const eyeSize = Math.max(1, size * 0.12);
            this.ctx.fillRect(px + size * 0.28 + exOffset - eyeSize/2, py + size * 0.38 + eyOffset, eyeSize, eyeSize);
            this.ctx.fillRect(px + size * 0.72 + exOffset - eyeSize/2, py + size * 0.38 + eyOffset, eyeSize, eyeSize);
        }
        // 枠
        this.ctx.strokeStyle = '#003366';
        this.ctx.lineWidth = 1.6;
        this.ctx.strokeRect(px - offset, py - offset, size + offset * 2, size + offset * 2);
    }

    drawGoal() {
        const { x, y } = gameState.maze.getGoalPosition();
        
        if (!this.isInViewport(x, y)) return;

        const screenPos = this.worldToScreen(x, y);
        const gx = screenPos.x;
        const gy = screenPos.y;
        const size = this.cellSize * 0.9;
        const offset = size * 0.2;

        // Minecraft-style diamond block (cyan/blue)
        // Top face (bright cyan)
        this.ctx.fillStyle = '#00ffff';
        this.ctx.fillRect(gx, gy, size, size);

        // Left face (darker cyan)
        this.ctx.fillStyle = '#00dddd';
        this.ctx.fillRect(gx - offset, gy + offset, offset, size * 0.7);

        // Right face (darkest cyan)
        this.ctx.fillStyle = '#00aaaa';
        this.ctx.fillRect(gx + size, gy + offset, offset, size * 0.7);

        // Diamond texture - cross pattern
        this.ctx.strokeStyle = '#0088aa';
        this.ctx.lineWidth = 1.5;
        const center = gx + size / 2;
        const centerY = gy + size / 2;
        const diamondSize = size * 0.5;
        
        // Diamond shape outline
        this.ctx.beginPath();
        this.ctx.moveTo(center, centerY - diamondSize);
        this.ctx.lineTo(center + diamondSize, centerY);
        this.ctx.lineTo(center, centerY + diamondSize);
        this.ctx.lineTo(center - diamondSize, centerY);
        this.ctx.closePath();
        this.ctx.stroke();
        this.ctx.fillStyle = 'rgba(0, 255, 255, 0.2)';
        this.ctx.fill();

        // Border
        this.ctx.strokeStyle = '#0066cc';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(gx, gy, size, size);
    }

    drawGrid() {
        this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.lineWidth = 0.5;

        // Vertical lines
        for (let x = 0; x <= this.viewportWidth; x++) {
            const px = x * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(px, 0);
            this.ctx.lineTo(px, this.canvas.height);
            this.ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= this.viewportHeight; y++) {
            const py = y * this.cellSize;
            this.ctx.beginPath();
            this.ctx.moveTo(0, py);
            this.ctx.lineTo(this.canvas.width, py);
            this.ctx.stroke();
        }
    }

    setShowGrid(show) {
        this.showGrid = show;
    }
}

// Initialize renderer
let renderer = null;

function initCanvasSize() {
    const canvas = document.getElementById('mazeCanvas');
    const container = canvas.parentElement;
    
    // Set canvas to full container size
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

function initRenderer() {
    if (!renderer) {
        renderer = new MazeRenderer('mazeCanvas');
    }
}

function renderFrame() {
    if (renderer) {
        renderer.render();
    }
}

// ==================== Maze Generation ====================

// Mulberry32 - High-quality seeded RNG
class Mulberry32 {
    constructor(seed) {
        // Ensure seed is a 32-bit signed integer
        this.seed = Math.imul(seed >>> 0, 2654435761);
    }

    next() {
        let t = (this.seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    nextInt(max) {
        return Math.floor(this.next() * max);
    }
}

// Tile types
const TILE = {
    WALL: 1,
    PATH: 0,
    GOAL: 2,
    COIN: 3,
    DOOR: 4,
    GIANT_COIN: 5,
    HIDDEN_ROOM: 6,
    KEY: 7
};

class Maze {
    constructor(width, height, seed, difficultyValue) {
        this.width = width;
        this.height = height;
        this.seed = seed;
        this.difficultyValue = typeof difficultyValue === 'number' ? difficultyValue : 500;
        this.grid = [];
        this.playerX = 1;
        this.playerY = 1;
        this.playerDir = { dx: 1, dy: 0 };
        this.goalX = width - 2;
        this.goalY = height - 2;
        this.coinCollected = 0;
        this.totalCoins = 0;
        this.doorsUnlocked = new Set();
        this.hiddenRoomX = -1;
        this.hiddenRoomY = -1;
        this.hiddenRoomDoorX = -1;
        this.hiddenRoomDoorY = -1;
        this.hasKey = false;
        this.keyX = -1;
        this.keyY = -1;
        this.hiddenRoomVisible = false;
        this.enemies = []; // {x,y,alive}
        this.rng = new Mulberry32(this.seed);
        this.playerHP = 5;
        this.beam = null; // {start:{x,y}, end:{x,y}, timer:int}
        this.generate();
    }

    generate() {
        // Initialize grid with all walls
        this.grid = Array(this.height)
            .fill(null)
            .map(() => Array(this.width).fill(TILE.WALL));

        // Create passages using recursive backtracking with seeded random
        const rng = new Mulberry32(this.seed);
        this.carvePassages(1, 1, rng);

        // Set player start position
        this.grid[this.playerY][this.playerX] = TILE.PATH;

        // Set goal position BEFORE placing items
        this.grid[this.goalY][this.goalX] = TILE.GOAL;

        // Find all reachable cells from player start
        const reachableCells = this.findReachableCells();

        // Place items only in reachable cells
        this.placeItems(rng, reachableCells);
    }

    findReachableCells() {
        const visited = Array(this.height)
            .fill(null)
            .map(() => Array(this.width).fill(false));
        const reachable = [];
        const queue = [{ x: this.playerX, y: this.playerY }];
        visited[this.playerY][this.playerX] = true;

        while (queue.length > 0) {
            const { x, y } = queue.shift();
            reachable.push({ x, y });

            // Check all 4 directions
            const directions = [
                { dx: 0, dy: -1 }, // up
                { dx: 1, dy: 0 },  // right
                { dx: 0, dy: 1 },  // down
                { dx: -1, dy: 0 }  // left
            ];

            for (const { dx, dy } of directions) {
                const nx = x + dx;
                const ny = y + dy;

                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height &&
                    !visited[ny][nx] && this.grid[ny][nx] === TILE.PATH) {
                    visited[ny][nx] = true;
                    queue.push({ x: nx, y: ny });
                }
            }
        }

        return reachable;
    }

    carvePassages(x, y, rng) {
        this.grid[y][x] = TILE.PATH;

        // Directions: up, right, down, left
        const directions = [
            { dx: 0, dy: -2 },
            { dx: 2, dy: 0 },
            { dx: 0, dy: 2 },
            { dx: -2, dy: 0 }
        ];

        // Shuffle directions using seeded random
        for (let i = directions.length - 1; i > 0; i--) {
            const j = rng.nextInt(i + 1);
            [directions[i], directions[j]] = [directions[j], directions[i]];
        }

        // Carve passages
        for (const direction of directions) {
            const nx = x + direction.dx;
            const ny = y + direction.dy;

            if (
                nx > 0 &&
                nx < this.width - 1 &&
                ny > 0 &&
                ny < this.height - 1 &&
                this.grid[ny][nx] === TILE.WALL
            ) {
                // Carve wall between current and next
                const mx = x + direction.dx / 2;
                const my = y + direction.dy / 2;
                this.grid[my][mx] = TILE.PATH;
                this.carvePassages(nx, ny, rng);
            }
        }
    }

    placeItems(rng, reachableCells) {
        // Filter reachable cells that are not start or goal
        const validCells = reachableCells.filter(cell => 
            !(cell.x === 1 && cell.y === 1) && 
            !(cell.x === this.goalX && cell.y === this.goalY)
        );

        if (validCells.length < 20) return; // Need enough space

        // Shuffle cells
        for (let i = validCells.length - 1; i > 0; i--) {
            const j = rng.nextInt(i + 1);
            [validCells[i], validCells[j]] = [validCells[j], validCells[i]];
        }

        const usedCells = new Set();

        // === Create Hidden Room on map edge ===
        // Find a wall location at map edge to place hidden room
        const edgeCells = [];
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                // Check if near map edge and is a path
                if ((x <= 2 || x >= this.width - 3 || y <= 2 || y >= this.height - 3) && 
                    this.grid[y][x] === TILE.PATH &&
                    validCells.some(c => c.x === x && c.y === y)) {
                    edgeCells.push({ x, y });
                }
            }
        }

        if (edgeCells.length > 0) {
            const hiddenRoomCell = edgeCells[rng.nextInt(edgeCells.length)];
            this.hiddenRoomX = hiddenRoomCell.x;
            this.hiddenRoomY = hiddenRoomCell.y;
            this.grid[hiddenRoomCell.y][hiddenRoomCell.x] = TILE.HIDDEN_ROOM;
            usedCells.add(`${hiddenRoomCell.x},${hiddenRoomCell.y}`);
            
            // Place door next to hidden room (currently invisible)
            const directions = [
                { dx: 0, dy: -1 },
                { dx: 1, dy: 0 },
                { dx: 0, dy: 1 },
                { dx: -1, dy: 0 }
            ];

            for (const dir of directions) {
                const doorX = hiddenRoomCell.x + dir.dx;
                const doorY = hiddenRoomCell.y + dir.dy;
                const key = `${doorX},${doorY}`;

                if (!usedCells.has(key) && 
                    validCells.some(c => c.x === doorX && c.y === doorY)) {
                    this.grid[doorY][doorX] = TILE.DOOR;
                    this.hiddenRoomDoorX = doorX;
                    this.hiddenRoomDoorY = doorY;
                    usedCells.add(key);
                    break;
                }
            }

            // Place giant coin inside hidden room
            this.grid[this.hiddenRoomY][this.hiddenRoomX] = TILE.GIANT_COIN;
            this.totalCoins += 10;
        }

        // === Place key somewhere in the maze (not in hidden room) ===
        let keyPlaced = false;
        for (const cell of validCells) {
            const key = `${cell.x},${cell.y}`;
            if (!usedCells.has(key) && 
                !(cell.x === this.hiddenRoomX && cell.y === this.hiddenRoomY) &&
                rng.next() < 0.15) { // 15% chance for each valid cell
                this.grid[cell.y][cell.x] = TILE.KEY;
                this.keyX = cell.x;
                this.keyY = cell.y;
                usedCells.add(key);
                keyPlaced = true;
                break;
            }
        }

        // If key wasn't placed, force placement
        if (!keyPlaced) {
            for (const cell of validCells) {
                const key = `${cell.x},${cell.y}`;
                if (!usedCells.has(key) && 
                    !(cell.x === this.hiddenRoomX && cell.y === this.hiddenRoomY)) {
                    this.grid[cell.y][cell.x] = TILE.KEY;
                    this.keyX = cell.x;
                    this.keyY = cell.y;
                    usedCells.add(key);
                    break;
                }
            }
        }

        // === Place regular coins throughout maze ===
        const coinFrequency = Math.max(4, Math.floor(validCells.length / 40));
        let coinsPlaced = 0;

        for (const cell of validCells) {
            const key = `${cell.x},${cell.y}`;
            
            if (!usedCells.has(key) && coinsPlaced % coinFrequency === 0) {
                this.grid[cell.y][cell.x] = TILE.COIN;
                usedCells.add(key);
                this.totalCoins += 1;
            }
            coinsPlaced++;
        }

        // Ensure minimum coins
        if (this.totalCoins < 15) {
            for (const cell of validCells) {
                const key = `${cell.x},${cell.y}`;
                if (!usedCells.has(key) && this.totalCoins < 15) {
                    this.grid[cell.y][cell.x] = TILE.COIN;
                    usedCells.add(key);
                    this.totalCoins += 1;
                }
            }
        }

        // === Place enemies based on difficultyValue ===
        // Respect peaceful mode: do not spawn enemies if peaceful
        if (!settings.isPeaceful()) {
            // 新しい敵数・速さ設定を反映
            const amountSetting = settings.getEnemyAmount ? settings.getEnemyAmount() : 50; // 1..100
            const speedSetting = settings.getEnemySpeed ? settings.getEnemySpeed() : 50; // 1..100
            // 配置数: 1〜max(available, 1)で線形マッピング
            const maxCount = Math.max(1, Math.floor(validCells.length / 8));
            const minCount = 1;
            const enemyCount = Math.round(minCount + (maxCount - minCount) * (amountSetting / 100));
            let enemiesPlaced = 0;
            const mobStrength = settings.getMobStrength ? settings.getMobStrength() : 50;
            // 速さ: moveDelay=6(遅)〜1(速)を逆線形マッピング
            const moveDelay = Math.round(6 - 5 * (speedSetting / 100)); // 6..1
            const attackDelay = Math.max(1, Math.round(4 - (mobStrength / 50)));
            for (let i = 0; i < validCells.length && enemiesPlaced < enemyCount; i++) {
                const cell = validCells[i];
                const key = `${cell.x},${cell.y}`;
                if (!usedCells.has(key) && !(cell.x === this.hiddenRoomX && cell.y === this.hiddenRoomY)) {
                    // Derive enemy stats from mobStrength (1-100)
                    const hp = Math.max(1, Math.ceil(mobStrength / 20)); // 1..5
                    const damage = Math.max(1, Math.ceil(mobStrength / 40)); // 1..3
                    this.enemies.push({ x: cell.x, y: cell.y, alive: true, hp: hp, damage: damage, moveDelay: moveDelay, moveCounter: 0, attackDelay: attackDelay, attackCooldown: 0, lastX: -1, lastY: -1 });
                    usedCells.add(key);
                    enemiesPlaced++;
                }
            }
        }
    }

    isWall(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return true;
        }
        const tile = this.grid[y][x];
        // Only walls block movement (coins, doors, giant coins are passable)
        return tile === TILE.WALL;
    }

    canMoveTo(x, y) {
        return !this.isWall(x, y);
    }

    movePlayer(dx, dy) {
        const newX = this.playerX + dx;
        const newY = this.playerY + dy;

        if (this.canMoveTo(newX, newY)) {
            this.playerX = newX;
            this.playerY = newY;
            // update facing direction
            this.playerDir = { dx: dx, dy: dy };

            // Check for item pickup
            const tile = this.grid[newY][newX];
            if (tile === TILE.COIN) {
                this.coinCollected += 1;
                this.grid[newY][newX] = TILE.PATH;
            } else if (tile === TILE.GIANT_COIN) {
                this.coinCollected += 10;
                this.grid[newY][newX] = TILE.PATH;
            } else if (tile === TILE.KEY) {
                // Pickup key - hidden room becomes visible
                this.hasKey = true;
                this.hiddenRoomVisible = true;
                this.grid[newY][newX] = TILE.PATH;
            } else if (tile === TILE.DOOR) {
                // Door can always be passed
                this.grid[newY][newX] = TILE.PATH;
            }

            // Update hidden room visibility when near door
            const doorDist = Math.abs(this.playerX - this.hiddenRoomDoorX) + 
                             Math.abs(this.playerY - this.hiddenRoomDoorY);
            if (doorDist <= 2) {
                if (this.hasKey) {
                    this.hiddenRoomVisible = true;
                } else {
                    this.hiddenRoomVisible = false;
                }
            }

            return true;
        }
        return false;
    }

    isPlayerAtGoal() {
        return (
            this.playerX === this.goalX &&
            this.playerY === this.goalY
        );
    }

    // Attack: remove any adjacent enemy (Manhattan distance 1)
    playerAttack() {
        let killed = 0;
        for (const e of this.enemies) {
            if (!e.alive) continue;
            const dist = Math.abs(e.x - this.playerX) + Math.abs(e.y - this.playerY);
            if (dist === 1) {
                // Deal 1 damage to enemy
                e.hp = (typeof e.hp === 'number') ? e.hp - 1 : 0;
                if (e.hp <= 0) {
                    e.alive = false;
                    killed++;
                    this.coinCollected += 1;
                }
            }
        }
        return killed;
    }

    // Shoot a beam in direction (dx,dy). Beam travels until wall; kills first enemy hit instantly.
    playerShoot(dx, dy) {
        if (!dx && !dy) return 0;
        // If immediate adjacent tile is a wall, beam disappears immediately
        const adjX = this.playerX + dx;
        const adjY = this.playerY + dy;
        if (adjX < 0 || adjX >= this.width || adjY < 0 || adjY >= this.height) return 0;
        if (this.grid[adjY][adjX] === TILE.WALL) {
            // play a short thud sound
            if (audioManager && typeof audioManager.playTone === 'function' && settings.isSoundEnabled && (typeof settings.isSoundEnabled === 'function' ? settings.isSoundEnabled() : settings.isSoundEnabled)) {
                audioManager.playTone(200, 0.06);
            }
            this.beam = null;
            return 0;
        }
        const sx = this.playerX;
        const sy = this.playerY;
        let x = sx + dx;
        let y = sy + dy;
        let killed = 0;
        let hitPositions = [];
        const penetration = settings.isBeamPenetration ? settings.isBeamPenetration() : false;
        while (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            if (this.grid[y][x] === TILE.WALL) break;
            // check for enemy at (x,y)
            const enemy = this.enemies.find(en => en.alive && en.x === x && en.y === y);
            if (enemy) {
                enemy.alive = false;
                killed++;
                this.coinCollected += 1;
                hitPositions.push({ x, y });
                if (!penetration) break; // stop beam if not penetrating
            }
            x += dx; y += dy;
        }

        const endPos = hitPositions.length > 0 ? hitPositions[hitPositions.length - 1] : { x: x - dx, y: y - dy };
        // set beam visual path and impact points
        this.beam = { start: { x: sx, y: sy }, end: endPos, impacts: hitPositions, timer: 14 };
        // play beam sound
        if (audioManager && typeof audioManager.playTone === 'function' && settings.isSoundEnabled && (typeof settings.isSoundEnabled === 'function' ? settings.isSoundEnabled() : settings.isSoundEnabled)) {
            audioManager.playTone(1200, 0.06);
        }

        // screen shake feedback (short) when beam fired
        try {
            if (typeof gameState !== 'undefined') {
                gameState.screenShake = 8; // pixels magnitude
            }
        } catch (e) {}

        return killed;
    }

    // Update enemies: simple AI
    updateEnemies() {
        if (!this.enemies || this.enemies.length === 0) return;

        for (const e of this.enemies) {
            if (!e.alive) continue;

            // initialize timers if missing
            e.moveTimer = (typeof e.moveTimer === 'number') ? e.moveTimer : this.rng.nextInt(Math.max(1, e.moveDelay || 3));
            e.attackCooldown = (typeof e.attackCooldown === 'number') ? e.attackCooldown : 0;

            // decrement timers
            if (e.attackCooldown > 0) e.attackCooldown--;
            if (e.moveTimer > 0) { e.moveTimer--; continue; }

            // reset move timer with some jitter so enemies don't sync
            e.moveTimer = Math.max(1, e.moveDelay || 3) + this.rng.nextInt(2);

            const px = this.playerX;
            const py = this.playerY;
            const dist = Math.abs(e.x - px) + Math.abs(e.y - py);

            const possibleDirs = [ {dx:0,dy:-1},{dx:1,dy:0},{dx:0,dy:1},{dx:-1,dy:0} ];

            const tryMove = (nx, ny, dx, dy) => {
                if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) return false;
                if (this.grid[ny][nx] === TILE.WALL) return false;
                // avoid other enemies
                if (this.enemies.some(other => other !== e && other.alive && other.x === nx && other.y === ny)) return false;
                // don't move into player (attack instead)
                if (nx === px && ny === py) return false;
                // allow backtracking occasionally; prefer not to immediately reverse
                if (nx === e.lastX && ny === e.lastY && this.rng.next() < 0.7) return false;
                e.lastX = e.x; e.lastY = e.y; e.x = nx; e.y = ny; e.dir = {dx:dx, dy:dy}; return true;
            };

            // If adjacent to player, attempt attack instead of moving
            if (dist === 1) {
                if (e.attackCooldown <= 0) {
                    this.playerHP = (typeof this.playerHP === 'number') ? this.playerHP - (e.damage || 1) : 0;
                    e.attackCooldown = e.attackDelay || 2;
                    if (audioManager) audioManager.playTone(220, 0.12);
                    if (this.playerHP <= 0) {
                        setTimeout(() => {
                            alert('やられた！ゲームオーバー');
                            if (gui) gui.showScreen('titleScreen');
                        }, 50);
                    }
                }
                continue;
            }

            let moved = false;
            // Decide whether to act greedily toward player or wander
            const approachChance = Math.min(0.85, 0.2 + (dist <= 6 ? 0.6 : 0));
            if (this.rng.next() < approachChance && dist <= 10) {
                // prefer directions that reduce distance (shuffle to add randomness)
                const dirs = possibleDirs.slice();
                dirs.sort((a,b) => {
                    const da = Math.abs(e.x + a.dx - px) + Math.abs(e.y + a.dy - py);
                    const db = Math.abs(e.x + b.dx - px) + Math.abs(e.y + b.dy - py);
                    return da - db;
                });
                for (const d of dirs) {
                    if (tryMove(e.x + d.dx, e.y + d.dy, d.dx, d.dy)) { moved = true; break; }
                }
            }

            if (!moved) {
                // Random walk: try directions in random order
                const order = [];
                while (order.length < possibleDirs.length) {
                    const idx = this.rng.nextInt(possibleDirs.length);
                    if (!order.includes(idx)) order.push(idx);
                }
                for (const idx of order) {
                    const d = possibleDirs[idx];
                    if (tryMove(e.x + d.dx, e.y + d.dy, d.dx, d.dy)) { moved = true; break; }
                }
            }
        }
    }

    resetPlayer() {
        this.playerX = 1;
        this.playerY = 1;
    }

    getGrid() {
        return this.grid;
    }

    getPlayerPosition() {
        return { x: this.playerX, y: this.playerY };
    }

    getGoalPosition() {
        return { x: this.goalX, y: this.goalY };
    }

    getDimensions() {
        return { width: this.width, height: this.height };
    }

    getKeysCount() {
        return this.keys.size;
    }

    getDoorsOpenedCount() {
        return this.doorsOpened.size;
    }

    getScore() {
        // Calculate score based on coins collected (10 points per coin)
        return this.coinCollected * 10;
    }
}

// ==================== Game State ====================

class GameState {
    constructor() {
        this.maze = null;
        this.startTime = 0;
        this.elapsedTime = 0;
        this.isPaused = false;
        this.difficulty = 'medium';
        this.difficultyValue = 500;
        this.seed = Math.floor(Math.random() * 1000000);
    }

    initializeMaze(difficulty) {
        const sizes = {
            small: 21,
            medium: 25,
            large: 31
        };

        const size = sizes[difficulty] || sizes['medium'];
        // Scale size by difficultyValue to allow larger maps
        const extra = Math.floor(((this.difficultyValue || 500) - 1) / 999 * 80); // 0..80
        let scaled = size + extra;
        if (scaled % 2 === 0) scaled += 1; // ensure odd
        this.maze = new Maze(scaled, scaled, this.seed, this.difficultyValue);
        this.difficulty = difficulty;
    }

    startTimer() {
        this.startTime = Date.now() - this.elapsedTime * 1000;
    }

    updateTimer() {
        if (!this.isPaused) {
            this.elapsedTime = (Date.now() - this.startTime) / 1000;
        }
    }

    getFormattedTime() {
        const minutes = Math.floor(this.elapsedTime / 60);
        const seconds = Math.floor(this.elapsedTime % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    setSeed(seed) {
        this.seed = seed;
    }

    newGame(difficulty) {
        // Use custom seed if set, otherwise generate random
        const customSeed = settings.getSeed();
        if (customSeed !== null) {
            this.seed = customSeed;
        } else {
            this.seed = Math.floor(Math.random() * 1000000);
        }
        // Read numeric difficulty value (1-1000) from settings
        if (settings && typeof settings.getDifficultyValue === 'function') {
            this.difficultyValue = settings.getDifficultyValue();
        }
        
        this.initializeMaze(difficulty);
        this.startTimer();
        this.elapsedTime = 0;
        this.isPaused = false;
    }

    resetPlayer() {
        if (this.maze) {
            this.maze.resetPlayer();
        }
    }

    togglePause() {
        this.isPaused = !this.isPaused;
    }

    resume() {
        this.isPaused = false;
        this.startTime = Date.now() - this.elapsedTime * 1000;
    }
}

// Global game state
const gameState = new GameState();

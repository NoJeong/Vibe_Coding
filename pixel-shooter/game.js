const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const gameOverEl = document.getElementById('gameOver');
const finalScoreEl = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

const playerWidth = 30;
const playerHeight = 20;
let playerX = (canvas.width - playerWidth) / 2;
const playerY = canvas.height - 50;
const playerSpeed = 5;

let bullets = [];
const bulletWidth = 5;
const bulletHeight = 15;
const bulletSpeed = 7;

let enemies = [];
const enemyWidth = 30;
const enemyHeight = 20;
const enemySpeed = 2;
const enemySpawnRate = 1000; // in ms
let lastEnemySpawn = 0;

let score = 0;
let isGameOver = false;

let keys = {};

document.addEventListener('keydown', (e) => keys[e.code] = true);
document.addEventListener('keyup', (e) => keys[e.code] = false);

restartButton.addEventListener('click', () => {
    resetGame();
    gameLoop();
});

function drawPlayer() {
    ctx.fillStyle = 'lime';
    ctx.fillRect(playerX, playerY, playerWidth, playerHeight);
}

function drawBullets() {
    ctx.fillStyle = 'white';
    bullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    });
}

function drawEnemies() {
    ctx.fillStyle = 'red';
    enemies.forEach(enemy => {
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    });
}

function updatePlayer() {
    if (keys['ArrowLeft'] && playerX > 0) {
        playerX -= playerSpeed;
    }
    if (keys['ArrowRight'] && playerX < canvas.width - playerWidth) {
        playerX += playerSpeed;
    }
    if (keys['Space']) {
        shoot();
        keys['Space'] = false; // Prevent continuous shooting
    }
}

function shoot() {
    bullets.push({
        x: playerX + playerWidth / 2 - bulletWidth / 2,
        y: playerY,
        width: bulletWidth,
        height: bulletHeight
    });
}

function updateBullets() {
    bullets = bullets.filter(bullet => bullet.y > 0);
    bullets.forEach(bullet => bullet.y -= bulletSpeed);
}

function spawnEnemy() {
    const x = Math.random() * (canvas.width - enemyWidth);
    const y = 0;
    enemies.push({ x, y, width: enemyWidth, height: enemyHeight });
}

function updateEnemies() {
    enemies.forEach(enemy => enemy.y += enemySpeed);
    enemies = enemies.filter(enemy => enemy.y < canvas.height);
}

function checkCollisions() {
    // Player bullets vs Enemies
    bullets.forEach((bullet, bIndex) => {
        enemies.forEach((enemy, eIndex) => {
            if (bullet.x < enemy.x + enemy.width &&
                bullet.x + bullet.width > enemy.x &&
                bullet.y < enemy.y + enemy.height &&
                bullet.y + bullet.height > enemy.y) {
                
                enemies.splice(eIndex, 1);
                bullets.splice(bIndex, 1);
                score++;
                scoreEl.textContent = score;
            }
        });
    });

    // Enemies vs Player
    enemies.forEach(enemy => {
        if (playerX < enemy.x + enemy.width &&
            playerX + playerWidth > enemy.x &&
            playerY < enemy.y + enemy.height &&
            playerY + playerHeight > enemy.y) {
            
            endGame();
        }
    });
}

function endGame() {
    isGameOver = true;
    gameOverEl.style.display = 'block';
    finalScoreEl.textContent = score;
}

function resetGame() {
    playerX = (canvas.width - playerWidth) / 2;
    bullets = [];
    enemies = [];
    score = 0;
    isGameOver = false;
    lastEnemySpawn = 0;
    scoreEl.textContent = score;
    gameOverEl.style.display = 'none';
}

function gameLoop(timestamp) {
    if (isGameOver) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (timestamp - lastEnemySpawn > enemySpawnRate) {
        lastEnemySpawn = timestamp;
        spawnEnemy();
    }

    updatePlayer();
    updateBullets();
    updateEnemies();
    checkCollisions();

    drawPlayer();
    drawBullets();
    drawEnemies();

    requestAnimationFrame(gameLoop);
}

// Start the game
requestAnimationFrame(gameLoop);

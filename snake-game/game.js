// 1. Get DOM Elements
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const gameOverScreen = document.getElementById('gameOverScreen');
const restartButton = document.getElementById('restartButton');

// 2. Game Variables
const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake, score, highScore, dx, dy, isGameOver;

// --- High Score ---
function loadHighScore() {
    highScore = localStorage.getItem('snakeHighScore') || 0;
    highScoreEl.textContent = highScore;
}

function saveHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
}

// --- Food ---
let food = {x: 0, y: 0};

function createFood() {
    food.x = Math.floor(Math.random() * tileCount);
    food.y = Math.floor(Math.random() * tileCount);

    snake.forEach(part => {
        if (part.x === food.x && part.y === food.y) {
            createFood();
        }
    });
}

function drawFood() {
    ctx.fillStyle = 'red';
    ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);
}

// --- Snake & Movement ---
function drawSnake() {
    ctx.fillStyle = 'lime';
    snake.forEach(part => {
        ctx.fillRect(part.x * gridSize, part.y * gridSize, gridSize - 2, gridSize - 2);
    });
}

function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);

    const hasEatenFood = snake[0].x === food.x && snake[0].y === food.y;
    if (hasEatenFood) {
        score++;
        scoreEl.textContent = score;
        createFood();
    } else {
        snake.pop();
    }
}

// --- Game State & Loop ---
function checkGameOver() {
    const head = snake[0];
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        isGameOver = true;
    }
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) {
            isGameOver = true;
        }
    }
}

function displayGameOver() {
    saveHighScore();
    gameOverScreen.classList.remove('hidden');
}

function gameLoop() {
    if (isGameOver) {
        displayGameOver();
        return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    moveSnake();
    checkGameOver();
    drawSnake();
    drawFood();
    setTimeout(() => requestAnimationFrame(gameLoop), 100);
}

function resetGame() {
    snake = [ { x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 } ];
    score = 0;
    dx = 1;
    dy = 0;
    isGameOver = false;
    
    scoreEl.textContent = score;
    gameOverScreen.classList.add('hidden');
    
    createFood();
    requestAnimationFrame(gameLoop);
}

// --- Event Listeners & Initialization ---
function changeDirection(event) {
    const keyPressed = event.key;
    const goingUp = dy === -1, goingDown = dy === 1, goingRight = dx === 1, goingLeft = dx === -1;

    if (keyPressed === 'ArrowLeft' && !goingRight) { dx = -1; dy = 0; }
    if (keyPressed === 'ArrowUp' && !goingDown) { dx = 0; dy = -1; }
    if (keyPressed === 'ArrowRight' && !goingLeft) { dx = 1; dy = 0; }
    if (keyPressed === 'ArrowDown' && !goingUp) { dx = 0; dy = 1; }
}

document.addEventListener('keydown', changeDirection);
restartButton.addEventListener('click', resetGame);

// --- Start Game ---
loadHighScore();
resetGame();
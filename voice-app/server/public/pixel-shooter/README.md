# 픽셀 슈터 (Pixel Shooter)

HTML, CSS, 그리고 순수 JavaScript로 만든 간단한 2D 슈팅 게임입니다. 플레이어는 화면 하단의 함선을 조종하여 상단에서 생성되는 적들을 쏘아 맞춥니다.

## 코드 리뷰: 주요 기능

이 문서는 게임의 핵심 기능 구현에 대한 코드 리뷰를 제공합니다.

### 1. 핵심 게임 플레이 루프

게임의 애니메이션은 `requestAnimationFrame`을 통해 반복적으로 호출되는 `gameLoop` 함수에 의해 구동됩니다. 이는 브라우저에서 부드러운 애니메이션을 만드는 효율적인 방법입니다.

**`game.js`**
```javascript
function gameLoop(timestamp) {
    if (isGameOver) return;

    // 새 프레임을 위해 캔버스 지우기
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 주기적으로 새로운 적 생성
    if (timestamp - lastEnemySpawn > enemySpawnRate) {
        lastEnemySpawn = timestamp;
        spawnEnemy();
    }

    // 모든 게임 객체의 상태 업데이트
    updatePlayer();
    updateBullets();
    updateEnemies();

    // 충돌 확인
    checkCollisions();

    // 모든 게임 객체를 새 위치에 그리기
    drawPlayer();
    drawBullets();
    drawEnemies();

    // 다음 애니메이션 프레임 요청
    requestAnimationFrame(gameLoop);
}

// 게임 시작
requestAnimationFrame(gameLoop);
```
**리뷰:** 이 게임 루프는 게임에서 보편적으로 사용되는 **'지우기 -> 업데이트 -> 그리기'** 라는 클래식하고 효과적인 패턴을 따릅니다. 각 프레임의 게임 상태 업데이트와 렌더링을 효율적으로 관리합니다. 적 생성에 `timestamp`를 사용하는 것은 프레임 속도에 의존하는 로직보다 시간 기반 이벤트를 구현하는 좋은 방법입니다.

### 2. 플레이어 조작

플레이어 입력은 키보드 이벤트를 통해 처리됩니다. `keys` 객체는 화살표 키와 스페이스바의 상태를 추적합니다.

**`game.js`**
```javascript
let keys = {};
document.addEventListener('keydown', (e) => keys[e.code] = true);
document.addEventListener('keyup', (e) => keys[e.code] = false);

function updatePlayer() {
    if (keys['ArrowLeft'] && playerX > 0) {
        playerX -= playerSpeed;
    }
    if (keys['ArrowRight'] && playerX < canvas.width - playerWidth) {
        playerX += playerSpeed;
    }
    if (keys['Space']) {
        shoot();
        keys['Space'] = false; // 연속 발사 방지
    }
}
```
**리뷰:** 이벤트 처리가 간단명료합니다. `keys` 객체에 키 상태를 저장하는 것은 여러 키를 동시에 눌렀을 때를 처리하는 일반적인 패턴입니다. 발사 후 `keys['Space'] = false`로 설정하여 한 번 누를 때 한 발만 나가게 하는 것은 이 게임에 적합한 좋은 설계입니다.

### 3. 충돌 감지

충돌은 게임 객체(플레이어, 총알, 적)의 경계 상자(bounding box)를 비교하여 확인합니다.

**`game.js`**
```javascript
function checkCollisions() {
    // 플레이어 총알 vs 적
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

    // 적 vs 플레이어
    enemies.forEach(enemy => {
        if (playerX < enemy.x + enemy.width &&
            playerX + playerWidth > enemy.x &&
            playerY < enemy.y + enemy.height &&
            playerY + playerHeight > enemy.y) {
            
            endGame();
        }
    });
}
```
**리뷰:** 축 정렬 경계 상자(AABB) 충돌 감지 로직은 간단한 사각형 객체에 대해 정확하고 효과적입니다. 객체 수가 훨씬 많아진다면 쿼드트리(quadtree)와 같은 공간 분할 알고리즘을 사용하여 성능을 개선할 수 있겠지만, 이 게임의 규모에서는 중첩 반복문으로도 충분합니다. 충돌 시 `splice`를 사용하여 배열에서 객체를 제거하는 것은 객체 파괴를 처리하는 직관적인 방법입니다.

### 4. 게임 상태 관리

`isGameOver`라는 간단한 불리언(boolean) 플래그가 게임의 흐름을 제어합니다. 플레이어가 적에게 맞으면 게임이 종료되고 다시 시작 화면이 표시됩니다.

**`game.js`**
```javascript
function endGame() {
    isGameOver = true;
    gameOverEl.style.display = 'block';
    finalScoreEl.textContent = score;
}

function resetGame() {
    // ... 모든 게임 변수 재설정 ...
    isGameOver = false;
    gameOverEl.style.display = 'none';
}
```
**리뷰:** 상태 관리는 이 게임의 범위에 맞게 간단하면서도 효과적입니다. `isGameOver` 플래그는 `gameLoop`의 실행을 깔끔하게 중지시키고, `resetGame` 함수는 게임을 다시 시작하는 명확한 방법을 제공합니다. 게임 오버 및 재시작 로직을 별도의 함수로 분리한 것은 코드 구성을 좋게 만듭니다.
import pygame
import random
import sys

# 1. Pygame 초기화 및 설정
pygame.init()
screen_width = 800
screen_height = 600
screen = pygame.display.set_mode((screen_width, screen_height))
pygame.display.set_caption("Pygame Shooter")
clock = pygame.time.Clock()
font = pygame.font.Font(None, 74)
score_font = pygame.font.Font(None, 36)

# 2. 색상 정의
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
RED = (255, 0, 0)
BLUE = (0, 0, 255)
PASTEL_YELLOW = (253, 253, 150)

# 3. Enemy 클래스 정의
class Enemy:
    def __init__(self, x, y, hp, color, speed, points):
        self.rect = pygame.Rect(x, y, 40, 40) # 크기 재조정
        self.hp = hp
        self.color = color
        self.speed = speed
        self.points = points

# 4. 게임 상태 클래스 정의
class GameState:
    def __init__(self):
        self.player_rect = pygame.Rect((screen_width / 2) - 20, screen_height - 50, 40, 40)
        self.player_speed = 5
        self.bullets = []
        self.bullet_rect_size = (10, 10)
        self.bullet_speed = 5
        self.enemies = []
        self.enemy_spawn_rate = 60
        self.enemy_spawn_counter = 0
        self.tough_enemy_spawn_counter = 0
        self.score = 0

# "PLAYING" 상태 루프
def playing_loop(state):
    for event in pygame.event.get():
        if event.type == pygame.QUIT: return "quit"
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_SPACE:
                bullet_rect = pygame.Rect(state.player_rect.centerx - (state.bullet_rect_size[0] / 2),
                                        state.player_rect.top, 
                                        state.bullet_rect_size[0], 
                                        state.bullet_rect_size[1])
                state.bullets.append(bullet_rect)

    keys = pygame.key.get_pressed()
    if keys[pygame.K_LEFT] and state.player_rect.left > 0: state.player_rect.x -= state.player_speed
    if keys[pygame.K_RIGHT] and state.player_rect.right < screen_width: state.player_rect.x += state.player_speed
    if keys[pygame.K_UP] and state.player_rect.top > 0: state.player_rect.y -= state.player_speed
    if keys[pygame.K_DOWN] and state.player_rect.bottom < screen_height: state.player_rect.y += state.player_speed

    for bullet in state.bullets: bullet.y -= state.bullet_speed
    state.bullets = [b for b in state.bullets if b.bottom > 0]

    state.enemy_spawn_counter += 1
    if state.enemy_spawn_counter >= state.enemy_spawn_rate:
        state.enemy_spawn_counter = 0
        enemy_x = random.randint(0, screen_width - 40)
        new_enemy = Enemy(enemy_x, -40, 1, BLUE, 5, 1)
        state.enemies.append(new_enemy)
        state.tough_enemy_spawn_counter += 1

        if state.score >= 20 and state.tough_enemy_spawn_counter >= 10:
            state.tough_enemy_spawn_counter = 0
            tough_enemy_x = random.randint(0, screen_width - 40)
            tough_enemy = Enemy(tough_enemy_x, -40, 2, PASTEL_YELLOW, 5, 2)
            state.enemies.append(tough_enemy)

    for enemy in state.enemies: enemy.rect.y += enemy.speed
    state.enemies = [e for e in state.enemies if e.rect.top < screen_height]

    for bullet in state.bullets[:]:
        # 히트박스 조절
        hitbox = bullet.inflate(4, 4)
        for enemy in state.enemies[:]:
            if hitbox.colliderect(enemy.rect):
                state.bullets.remove(bullet)
                enemy.hp -= 1
                if enemy.hp <= 0:
                    state.enemies.remove(enemy)
                    state.score += enemy.points
                break

    for enemy in state.enemies:
        if state.player_rect.colliderect(enemy.rect):
            return "game_over"

    screen.fill(BLACK)
    pygame.draw.rect(screen, WHITE, state.player_rect)
    for bullet in state.bullets: pygame.draw.rect(screen, RED, bullet)
    for enemy in state.enemies: pygame.draw.rect(screen, enemy.color, enemy.rect)
    score_text = score_font.render(f"Score: {state.score}", True, WHITE)
    screen.blit(score_text, (10, 10))
    
    return "playing"

# "GAME_OVER" 상태 루프
def game_over_loop(final_score):
    game_over_text = font.render("GAME OVER", True, WHITE)
    score_text = score_font.render(f"Final Score: {final_score}", True, WHITE)
    restart_text = score_font.render("Press [R] to Restart or [Q] to Quit", True, WHITE)
    
    screen.blit(game_over_text, (screen_width/2 - game_over_text.get_width()/2, screen_height/2 - 100))
    screen.blit(score_text, (screen_width/2 - score_text.get_width()/2, screen_height/2 - 20))
    screen.blit(restart_text, (screen_width/2 - restart_text.get_width()/2, screen_height/2 + 50))
    
    for event in pygame.event.get():
        if event.type == pygame.QUIT: return "quit"
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_r: return "playing"
            if event.key == pygame.K_q: return "quit"
    
    return "game_over"

# --- 메인 애플리케이션 루프 ---
def main():
    game_state = "playing"
    global game_data
    game_data = GameState()

    while game_state != "quit":
        if game_state == "playing":
            game_state = playing_loop(game_data)
        elif game_state == "game_over":
            game_state = game_over_loop(game_data.score)
            if game_state == "playing":
                game_data = GameState()

        pygame.display.flip()
        clock.tick(60)

    pygame.quit()
    sys.exit()

if __name__ == '__main__':
    main()
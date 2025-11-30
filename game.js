// Game constants - designed for 60fps, scaled by delta time for consistency
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;  // 16.67ms per frame at 60fps
const GRAVITY = 0.55;                  // Balanced gravity
const FLAP_STRENGTH = -7.5;            // Good flap strength
const MAX_FALL_SPEED = 10;             // Reasonable fall speed
const PIPE_SPEED = 3.2;                // Slightly slower
const PIPE_GAP = 125;                  // Challenging but fair gap
const PIPE_WIDTH = 80;
const PIPE_SPACING = 200;              // Bit more breathing room
const BIRD_SIZE = 40;

// Game state
let canvas, ctx;
let bird;
let pipes = [];
let score = 0;
let highScore = localStorage.getItem('flappyHighScore') || 0;
let gameState = 'splash'; // 'splash', 'start', 'playing', 'gameover'
let splashStartTime = 0;
let groundY;
let isNewHighScore = false;
let celebrationParticles = [];

// Colors
const COLORS = {
    sky: '#70c5ce',
    ground: '#ded895',
    groundDark: '#c4a862',
    pipe: '#73bf2e',
    pipeDark: '#5a9c24',
    pipeHighlight: '#8fd14f',
    bird: '#f7dc6f',
    birdOrange: '#f39c12',
    birdDark: '#d68910',
    birdEye: '#fff',
    birdPupil: '#000',
    birdBeak: '#e74c3c',
    text: '#fff',
    textShadow: '#000'
};

// Initialize the game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Input handlers
    canvas.addEventListener('click', handleInput);
    canvas.addEventListener('touchstart', handleInput, { passive: false });
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            handleInput(e);
        }
    });
    
    resetGame();
    splashStartTime = Date.now();
    gameLoop();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    groundY = canvas.height - 80;
}

function resetGame() {
    bird = {
        x: canvas.width * 0.2,
        y: canvas.height / 2,
        velocity: 0,
        rotation: 0
    };
    pipes = [];
    score = 0;
    isNewHighScore = false;
    celebrationParticles = [];
}

function handleInput(e) {
    e.preventDefault();
    
    if (gameState === 'splash') {
        gameState = 'start';
    } else if (gameState === 'start') {
        gameState = 'playing';
        bird.velocity = FLAP_STRENGTH;
    } else if (gameState === 'playing') {
        bird.velocity = FLAP_STRENGTH;
    } else if (gameState === 'gameover') {
        resetGame();
        gameState = 'start';
    }
}

function spawnPipe() {
    const minHeight = 80;
    const maxHeight = groundY - PIPE_GAP - minHeight;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
    
    pipes.push({
        x: canvas.width,
        topHeight: topHeight,
        passed: false
    });
}

function spawnFirstPipe() {
    // Spawn first pipe closer to the bird for immediate action
    const minHeight = 80;
    const maxHeight = groundY - PIPE_GAP - minHeight;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
    
    pipes.push({
        x: canvas.width * 0.65, // More room to line up on mobile
        topHeight: topHeight,
        passed: false
    });
}

function update(deltaTime) {
    // Always update celebration particles
    updateCelebration();
    
    if (gameState !== 'playing') return;
    
    // Spawn first pipe immediately when game starts
    if (pipes.length === 0) {
        spawnFirstPipe();
    }
    
    // Calculate delta multiplier for consistent speed across refresh rates
    // Clamp to prevent huge jumps if tab was inactive
    const dt = Math.min(deltaTime, 100) / FRAME_TIME;
    
    // Update bird physics scaled by delta time
    bird.velocity += GRAVITY * dt;
    if (bird.velocity > MAX_FALL_SPEED) {
        bird.velocity = MAX_FALL_SPEED;
    }
    bird.y += bird.velocity * dt;
    
    // Bird rotation based on velocity
    bird.rotation = Math.min(Math.max(bird.velocity * 4, -25), 90);
    
    // Spawn new pipe when last pipe is far enough from right edge (distance-based like original)
    if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - PIPE_SPACING) {
        spawnPipe();
    }
    
    // Update pipes
    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= PIPE_SPEED * dt;
        
        // Score when passing pipe
        if (!pipes[i].passed && pipes[i].x + PIPE_WIDTH < bird.x) {
            pipes[i].passed = true;
            score++;
            
            // Check for new high score during gameplay
            if (score > highScore) {
                if (!isNewHighScore) {
                    isNewHighScore = true;
                    spawnCelebration();
                }
                highScore = score;
                localStorage.setItem('flappyHighScore', highScore);
            }
        }
        
        // Remove off-screen pipes
        if (pipes[i].x + PIPE_WIDTH < 0) {
            pipes.splice(i, 1);
        }
    }
    
    // Collision detection
    checkCollisions();
}

function checkCollisions() {
    // Ground and ceiling collision
    if (bird.y + BIRD_SIZE / 2 > groundY || bird.y - BIRD_SIZE / 2 < 0) {
        gameOver();
        return;
    }
    
    // Pipe collision
    const birdLeft = bird.x - BIRD_SIZE / 2 + 5;
    const birdRight = bird.x + BIRD_SIZE / 2 - 5;
    const birdTop = bird.y - BIRD_SIZE / 2 + 5;
    const birdBottom = bird.y + BIRD_SIZE / 2 - 5;
    
    for (const pipe of pipes) {
        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + PIPE_WIDTH;
        
        if (birdRight > pipeLeft && birdLeft < pipeRight) {
            // Check top pipe
            if (birdTop < pipe.topHeight) {
                gameOver();
                return;
            }
            // Check bottom pipe
            if (birdBottom > pipe.topHeight + PIPE_GAP) {
                gameOver();
                return;
            }
        }
    }
}

function gameOver() {
    gameState = 'gameover';
}

function spawnCelebration() {
    // Spawn confetti particles
    for (let i = 0; i < 50; i++) {
        celebrationParticles.push({
            x: canvas.width / 2 + (Math.random() - 0.5) * 200,
            y: canvas.height / 3,
            vx: (Math.random() - 0.5) * 10,
            vy: Math.random() * -8 - 2,
            color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'][Math.floor(Math.random() * 8)],
            size: Math.random() * 8 + 4,
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 15
        });
    }
}

function updateCelebration() {
    for (let i = celebrationParticles.length - 1; i >= 0; i--) {
        const p = celebrationParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3; // gravity on particles
        p.rotation += p.rotationSpeed;
        
        // Remove particles that are off screen
        if (p.y > canvas.height + 50) {
            celebrationParticles.splice(i, 1);
        }
    }
}

function drawCelebration() {
    for (const p of celebrationParticles) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation * Math.PI / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
    }
    
    // Draw "NEW HIGH SCORE!" text if celebrating
    if (isNewHighScore && gameState === 'playing') {
        ctx.save();
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        const celebrateSize = Math.min(28, canvas.width / 16);
        ctx.font = `bold ${celebrateSize}px Arial`;
        ctx.textAlign = 'center';
        
        // Pulsing effect
        const pulse = 1 + Math.sin(Date.now() / 100) * 0.1;
        ctx.translate(canvas.width / 2, 100);
        ctx.scale(pulse, pulse);
        
        ctx.strokeText('🎉 NEW HIGH SCORE! 🎉', 0, 0);
        ctx.fillText('🎉 NEW HIGH SCORE! 🎉', 0, 0);
        ctx.restore();
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = COLORS.sky;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw pipes
    for (const pipe of pipes) {
        drawPipe(pipe);
    }
    
    // Draw ground
    drawGround();
    
    // Draw bird
    drawBird();
    
    // Draw score
    drawScore();
    
    // Draw overlays
    if (gameState === 'splash') {
        drawSplashScreen();
    } else if (gameState === 'start') {
        drawStartScreen();
    } else if (gameState === 'gameover') {
        drawGameOver();
    }
    
    // Draw celebration particles on top
    drawCelebration();
}

function drawPipe(pipe) {
    const capHeight = 30;
    const capOverhang = 6;
    
    // Top pipe body
    ctx.fillStyle = COLORS.pipe;
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight - capHeight);
    
    // Top pipe highlight
    ctx.fillStyle = COLORS.pipeHighlight;
    ctx.fillRect(pipe.x + 6, 0, 10, pipe.topHeight - capHeight);
    
    // Top pipe shadow
    ctx.fillStyle = COLORS.pipeDark;
    ctx.fillRect(pipe.x + PIPE_WIDTH - 10, 0, 10, pipe.topHeight - capHeight);
    
    // Top pipe cap
    ctx.fillStyle = COLORS.pipe;
    ctx.fillRect(pipe.x - capOverhang, pipe.topHeight - capHeight, PIPE_WIDTH + capOverhang * 2, capHeight);
    
    // Top cap highlight
    ctx.fillStyle = COLORS.pipeHighlight;
    ctx.fillRect(pipe.x - capOverhang + 4, pipe.topHeight - capHeight, 10, capHeight);
    
    // Top cap shadow
    ctx.fillStyle = COLORS.pipeDark;
    ctx.fillRect(pipe.x + PIPE_WIDTH + capOverhang - 10, pipe.topHeight - capHeight, 10, capHeight);
    
    // Bottom pipe
    const bottomPipeY = pipe.topHeight + PIPE_GAP;
    const bottomPipeHeight = groundY - bottomPipeY;
    
    // Bottom pipe body
    ctx.fillStyle = COLORS.pipe;
    ctx.fillRect(pipe.x, bottomPipeY + capHeight, PIPE_WIDTH, bottomPipeHeight - capHeight);
    
    // Bottom pipe highlight
    ctx.fillStyle = COLORS.pipeHighlight;
    ctx.fillRect(pipe.x + 6, bottomPipeY + capHeight, 10, bottomPipeHeight - capHeight);
    
    // Bottom pipe shadow
    ctx.fillStyle = COLORS.pipeDark;
    ctx.fillRect(pipe.x + PIPE_WIDTH - 10, bottomPipeY + capHeight, 10, bottomPipeHeight - capHeight);
    
    // Bottom pipe cap
    ctx.fillStyle = COLORS.pipe;
    ctx.fillRect(pipe.x - capOverhang, bottomPipeY, PIPE_WIDTH + capOverhang * 2, capHeight);
    
    // Bottom cap highlight
    ctx.fillStyle = COLORS.pipeHighlight;
    ctx.fillRect(pipe.x - capOverhang + 4, bottomPipeY, 10, capHeight);
    
    // Bottom cap shadow
    ctx.fillStyle = COLORS.pipeDark;
    ctx.fillRect(pipe.x + PIPE_WIDTH + capOverhang - 10, bottomPipeY, 10, capHeight);
}

function drawGround() {
    // Ground
    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
    
    // Ground top line
    ctx.fillStyle = COLORS.groundDark;
    ctx.fillRect(0, groundY, canvas.width, 4);
    
    // Ground pattern
    ctx.fillStyle = COLORS.groundDark;
    for (let x = 0; x < canvas.width; x += 20) {
        ctx.fillRect(x, groundY + 20, 10, 5);
    }
}

function drawBird() {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation * Math.PI / 180);
    
    // Body
    ctx.fillStyle = COLORS.bird;
    ctx.beginPath();
    ctx.ellipse(0, 0, BIRD_SIZE / 2, BIRD_SIZE / 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Wing
    ctx.fillStyle = COLORS.birdOrange;
    ctx.beginPath();
    const wingY = Math.sin(Date.now() / 50) * 3;
    ctx.ellipse(-5, wingY, 12, 8, -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye white
    ctx.fillStyle = COLORS.birdEye;
    ctx.beginPath();
    ctx.arc(10, -5, 8, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye pupil
    ctx.fillStyle = COLORS.birdPupil;
    ctx.beginPath();
    ctx.arc(12, -5, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Beak
    ctx.fillStyle = COLORS.birdBeak;
    ctx.beginPath();
    ctx.moveTo(15, 0);
    ctx.lineTo(28, 3);
    ctx.lineTo(15, 8);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
}

function drawScore() {
    ctx.fillStyle = COLORS.text;
    ctx.strokeStyle = COLORS.textShadow;
    ctx.lineWidth = 4;
    const inGameScoreSize = Math.min(48, canvas.width / 10);
    ctx.font = `bold ${inGameScoreSize}px Arial`;
    ctx.textAlign = 'center';
    
    ctx.strokeText(score, canvas.width / 2, 60);
    ctx.fillText(score, canvas.width / 2, 60);
}

function drawStartScreen() {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Title
    ctx.fillStyle = COLORS.text;
    ctx.strokeStyle = COLORS.textShadow;
    ctx.lineWidth = 4;
    const startTitleSize = Math.min(64, canvas.width / 7);
    ctx.font = `bold ${startTitleSize}px Arial`;
    ctx.textAlign = 'center';
    
    ctx.strokeText('Ashlee Bird', canvas.width / 2, canvas.height / 3);
    ctx.fillText('Ashlee Bird', canvas.width / 2, canvas.height / 3);
    
    // Instructions
    const instructionSize = Math.min(28, canvas.width / 16);
    ctx.font = `bold ${instructionSize}px Arial`;
    ctx.strokeText('Tap or Press Space to Start', canvas.width / 2, canvas.height / 2);
    ctx.fillText('Tap or Press Space to Start', canvas.width / 2, canvas.height / 2);
    
    // High score
    const highScoreSize = Math.min(24, canvas.width / 18);
    ctx.font = `bold ${highScoreSize}px Arial`;
    ctx.strokeText(`High Score: ${highScore}`, canvas.width / 2, canvas.height / 2 + 50);
    ctx.fillText(`High Score: ${highScore}`, canvas.width / 2, canvas.height / 2 + 50);
}

function drawGameOver() {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Game Over text
    ctx.fillStyle = COLORS.text;
    ctx.strokeStyle = COLORS.textShadow;
    ctx.lineWidth = 4;
    const gameOverTitleSize = Math.min(64, canvas.width / 7);
    ctx.font = `bold ${gameOverTitleSize}px Arial`;
    ctx.textAlign = 'center';
    
    ctx.strokeText('Game Over', canvas.width / 2, canvas.height / 3);
    ctx.fillText('Game Over', canvas.width / 2, canvas.height / 3);
    
    // Score
    const scoreSize = Math.min(36, canvas.width / 12);
    ctx.font = `bold ${scoreSize}px Arial`;
    ctx.strokeText(`Score: ${score}`, canvas.width / 2, canvas.height / 2);
    ctx.fillText(`Score: ${score}`, canvas.width / 2, canvas.height / 2);
    
    // High score
    const gameOverHighScoreSize = Math.min(28, canvas.width / 16);
    ctx.font = `bold ${gameOverHighScoreSize}px Arial`;
    if (isNewHighScore) {
        ctx.fillStyle = '#FFD700';
        ctx.strokeText(`🎉 New High Score: ${highScore} 🎉`, canvas.width / 2, canvas.height / 2 + 50);
        ctx.fillText(`🎉 New High Score: ${highScore} 🎉`, canvas.width / 2, canvas.height / 2 + 50);
        ctx.fillStyle = COLORS.text;
    } else {
        ctx.strokeText(`High Score: ${highScore}`, canvas.width / 2, canvas.height / 2 + 50);
        ctx.fillText(`High Score: ${highScore}`, canvas.width / 2, canvas.height / 2 + 50);
    }
    
    // Restart instruction
    const restartSize = Math.min(24, canvas.width / 18);
    ctx.font = `bold ${restartSize}px Arial`;
    ctx.strokeText('Tap to Restart', canvas.width / 2, canvas.height / 2 + 110);
    ctx.fillText('Tap to Restart', canvas.width / 2, canvas.height / 2 + 110);
}

function drawSplashScreen() {
    // Beautiful gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#ff9a9e');
    gradient.addColorStop(0.5, '#fecfef');
    gradient.addColorStop(1, '#fecfef');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Floating hearts animation
    const time = Date.now() / 1000;
    ctx.font = '40px Arial';
    for (let i = 0; i < 8; i++) {
        const x = (canvas.width / 8) * i + 50;
        const y = canvas.height / 2 + Math.sin(time * 2 + i) * 30;
        ctx.fillText('💕', x, y);
    }
    
    // Main title with love theme
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#e84393';
    ctx.lineWidth = 6;
    const titleFontSize = Math.min(72, canvas.width / 8);
    ctx.font = `bold ${titleFontSize}px Arial`;
    ctx.textAlign = 'center';
    
    // Gentle floating animation for title
    const titleY = canvas.height / 3 + Math.sin(time * 1.5) * 10;
    
    ctx.strokeText('Ashlee Bird', canvas.width / 2, titleY);
    ctx.fillText('Ashlee Bird', canvas.width / 2, titleY);
    
    // Subtitle with heart
    const subtitleFontSize = Math.min(28, canvas.width / 16);
    ctx.font = `bold ${subtitleFontSize}px Arial`;
    ctx.fillStyle = '#e84393';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    
    ctx.strokeText('💖 Made with love for Ashlee 💖', canvas.width / 2, titleY + 60);
    ctx.fillText('💖 Made with love for Ashlee 💖', canvas.width / 2, titleY + 60);
    
    // Tap to continue
    const tapFontSize = Math.min(24, canvas.width / 18);
    ctx.font = `${tapFontSize}px Arial`;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#e84393';
    ctx.lineWidth = 2;
    
    // Pulsing effect
    const alpha = 0.5 + Math.sin(time * 3) * 0.5;
    ctx.globalAlpha = alpha;
    ctx.strokeText('Tap anywhere to continue', canvas.width / 2, canvas.height * 0.7);
    ctx.fillText('Tap anywhere to continue', canvas.width / 2, canvas.height * 0.7);
    ctx.globalAlpha = 1;
    
    // Draw a cute bird
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2 + 50);
    const birdBob = Math.sin(time * 3) * 10;
    ctx.translate(0, birdBob);
    
    // Body
    ctx.fillStyle = COLORS.bird;
    ctx.beginPath();
    ctx.ellipse(0, 0, 50, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Wing
    ctx.fillStyle = COLORS.birdOrange;
    ctx.beginPath();
    const wingY = Math.sin(time * 8) * 5;
    ctx.ellipse(-8, wingY, 18, 12, -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(15, -8, 12, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(18, -8, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Cute blush
    ctx.fillStyle = 'rgba(255, 150, 150, 0.6)';
    ctx.beginPath();
    ctx.ellipse(-5, 8, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Beak
    ctx.fillStyle = COLORS.birdBeak;
    ctx.beginPath();
    ctx.moveTo(22, 0);
    ctx.lineTo(40, 5);
    ctx.lineTo(22, 12);
    ctx.closePath();
    ctx.fill();
    
    ctx.restore();
}

let lastTime = 0;
function gameLoop(timestamp) {
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    
    update(deltaTime);
    draw();
    
    requestAnimationFrame(gameLoop);
}

// Start the game when the page loads
window.addEventListener('load', init);

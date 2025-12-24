// Assets (SVGs)
const ASSETS = {
    // Atletico Mineiro Keeper (Striped Shirt)
    keeper: `
    <svg viewBox="0 0 100 150" overflow="visible">
        <g id="keeper-body">
            <!-- Legs -->
            <path d="M35 110 L35 150" stroke="#fff" stroke-width="12" stroke-linecap="round"/>
            <path d="M65 110 L65 150" stroke="#fff" stroke-width="12" stroke-linecap="round"/>
            <!-- Shorts -->
            <rect x="25" y="90" width="50" height="25" fill="#000" rx="5"/>
            <!-- Torso (Stripes) -->
            <rect x="25" y="40" width="50" height="55" fill="#fff" rx="5"/>
            <path d="M35 40 L35 95" stroke="#000" stroke-width="6"/>
            <path d="M50 40 L50 95" stroke="#000" stroke-width="6"/>
            <path d="M65 40 L65 95" stroke="#000" stroke-width="6"/>
            <!-- Arms -->
            <path d="M25 50 L5 80" stroke="#fff" stroke-width="10" stroke-linecap="round" class="arm-left"/>
            <path d="M75 50 L95 80" stroke="#fff" stroke-width="10" stroke-linecap="round" class="arm-right"/>
            <!-- Gloves -->
            <circle cx="5" cy="80" r="8" fill="#ff5722" class="glove-left"/>
            <circle cx="95" cy="80" r="8" fill="#ff5722" class="glove-right"/>
            <!-- Head -->
            <circle cx="50" cy="25" r="18" fill="#ffdbac"/>
            <!-- Santa Hat -->
            <path d="M30 15 L50 -15 L70 15 Z" fill="#d42426"/>
            <circle cx="50" cy="-15" r="5" fill="#fff"/>
            <rect x="30" y="12" width="40" height="8" fill="#fff" rx="2"/>
        </g>
    </svg>`,

    // Cruzeiro Player (Blue Shirt)
    player: `
    <svg viewBox="0 0 100 150" overflow="visible">
        <g id="player-body">
             <!-- Legs -->
            <path d="M35 110 L35 150" stroke="#fff" stroke-width="14" stroke-linecap="round"/>
            <path d="M65 110 L65 150" stroke="#fff" stroke-width="14" stroke-linecap="round"/>
             <!-- Shorts -->
            <rect x="25" y="90" width="50" height="25" fill="#fff" rx="5"/>
            <!-- Torso -->
            <rect x="20" y="40" width="60" height="55" fill="#0054a6" rx="8"/>
            <text x="50" y="80" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold" font-size="24">10</text>
            <!-- Arms -->
            <path d="M20 50 L10 90" stroke="#0054a6" stroke-width="12" stroke-linecap="round"/>
            <path d="M80 50 L90 90" stroke="#0054a6" stroke-width="12" stroke-linecap="round"/>
            <!-- Head -->
            <circle cx="50" cy="25" r="20" fill="#8d5524"/>
            <!-- Santa Hat -->
            <path d="M25 12 L50 -20 L75 12 Z" fill="#d42426"/>
            <circle cx="50" cy="-20" r="6" fill="#fff"/>
            <rect x="25" y="10" width="50" height="10" fill="#fff" rx="2"/>
        </g>
    </svg>`
};

// Physics Constants
const GRAVITY = 0.6;
const FRICTION = 0.98;
const GOAL_Z = 600;
// Visual goal is 280px wide. At Z=600 (scale 0.5), it covers 560 units in physics space?
// No, screen = world * scale.
// If visual width is 280, and scale is 0.5, then world width is 280 / 0.5 = 560.
// So bounds are -280 to +280?
// Actually simpler: Let's define Goal in world units, then scale it visually.
// If CSS width is 280px, that's fixed on screen (relative to container).
// At Z=600, scale is 0.5.
// So for the ball (scale 0.5) to look like it's inside a 280px wide goal,
// its screen X must be within -140 and 140.
// screenX = worldX * 0.5 => worldX must be within -280 and 280.
const GOAL_WORLD_WIDTH_HALF = 280;
const GOAL_WORLD_HEIGHT = 160;

// Game State
const STATE = {
    password: "familia",
    targetWord: "NANDINHO",
    revealed: Array(8).fill(false),
    ball: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, active: false },
    keeper: { x: 0, targetX: 0 },
    isPlaying: false,
    isResetting: false
};

const JOKES = [
    "GOL! Nota de Repúdio emitida!",
    "GOL! 6 a 1 é eterno!",
    "GOL! Salão de festas do Cruzeiro!",
    "GOL! O Galo não tem bi!",
    "GOL! Freguês bom paga à vista!"
];

// Elements
const dom = {
    ball: document.getElementById('ball'),
    ballContainer: document.getElementById('ball-container'),
    ballShadow: document.getElementById('ball-shadow'),
    keeper: document.getElementById('keeper-container'),
    player: document.getElementById('player-container'),
    touchZone: document.getElementById('touch-zone'),
    wordDisplay: document.getElementById('word-display'),
    screens: {
        login: document.getElementById('login-screen'),
        victory: document.getElementById('victory-screen')
    },
    toastContainer: document.getElementById('toast-container')
};

// Init
function init() {
    dom.keeper.innerHTML = ASSETS.keeper;
    dom.player.innerHTML = ASSETS.player;
    renderWord();

    // Listeners
    document.getElementById('start-btn').addEventListener('click', attemptLogin);
    document.getElementById('password-input').addEventListener('keyup', e => { if(e.key==='Enter') attemptLogin() });
    document.getElementById('restart-btn').addEventListener('click', () => location.reload());
    dom.touchZone.addEventListener('click', handleInput);

    // Loop
    requestAnimationFrame(gameLoop);
}

function attemptLogin() {
    const input = document.getElementById('password-input').value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (input === STATE.password) {
        dom.screens.login.classList.remove('active');
        STATE.isPlaying = true;
    } else {
        const err = document.getElementById('login-error');
        err.classList.remove('hidden');
        setTimeout(() => err.classList.add('hidden'), 2000);
    }
}

function renderWord() {
    dom.wordDisplay.innerHTML = '';
    STATE.targetWord.split('').forEach((char, i) => {
        const slot = document.createElement('div');
        slot.className = `letter-slot ${STATE.revealed[i] ? 'revealed' : ''}`;
        slot.innerText = STATE.revealed[i] ? char : '';
        dom.wordDisplay.appendChild(slot);
    });
}

function handleInput(e) {
    if (!STATE.isPlaying || STATE.ball.active || STATE.isResetting) return;

    // Calculate shot direction based on click
    const rect = dom.touchZone.getBoundingClientRect();
    const clickX = e.clientX - rect.left;

    // Center of screen
    const centerX = rect.width / 2;
    const screenHeight = rect.height;

    // Ball origin (approx 80% of screen height from top based on CSS bottom:18%)
    const ballOriginY = screenHeight * 0.80;

    // Input Delta
    // X: Normalize to width (-1 to 1)
    const relativeX = (clickX - centerX) / (rect.width / 2);

    // Y: Distance from ball origin (negative is up)
    const clickY = e.clientY - rect.top;
    const deltaY = clickY - ballOriginY;

    // Calibration
    // X Sensitivity:
    // Edge of screen (relativeX = 1) -> World X = ~360 (Miss). Goal is 280.
    // This allows shooting wide.
    STATE.ball.vx = relativeX * 25;

    // Y Sensitivity:
    // Target World Y = DeltaY * 2.0 (Exact visual match since Scale=0.5 at Goal)
    const targetWorldY = deltaY * 2.0;

    // Calculate required Vy
    const VZ = 30;
    const T = GOAL_Z / VZ;

    STATE.ball.vy = (targetWorldY - 120) / T;
    STATE.ball.vz = VZ;

    STATE.ball.active = true;
    STATE.ball.x = 0;
    STATE.ball.y = 0;
    STATE.ball.z = 0;

    // Keeper AI Decision
    const keeperWillSave = Math.random() < 0.50; // 50% chance (increased difficulty)
    // Predict ball X at goal Z
    const timeToGoal = GOAL_Z / STATE.ball.vz;
    const predictedX = STATE.ball.vx * timeToGoal;

    STATE.keeper.targetX = keeperWillSave ? predictedX : (Math.random() - 0.5) * 250;

    // Hide Player (he kicked it)
    // dom.player.style.opacity = '0';
}

function gameLoop() {
    if (STATE.ball.active) {
        // Physics
        STATE.ball.x += STATE.ball.vx;
        STATE.ball.y += STATE.ball.vy;
        STATE.ball.z += STATE.ball.vz;
        STATE.ball.vy += GRAVITY;

        // Visual Update
        // Project 3D to 2D
        // Focal Length approx 600
        const scale = 600 / (600 + STATE.ball.z);
        const screenX = STATE.ball.x * scale;
        const screenY = STATE.ball.y * scale;

        // Move Ball DOM
        // Initial offset (center bottom) is handled by container position
        // We move RELATIVE to container
        // Y needs to be inverted for CSS (Up is negative in physics, negative in CSS translate too)

        // Ball grows smaller with distance (scale)
        dom.ball.style.transform = `translate(${screenX}px, ${screenY}px) scale(${scale})`;

        // Shadow: Sticks to ground (y=0 in physics world, but we need screenY for ground)
        // Ground Y in 3D is 0 (relative to ball start).
        // Ball Y is negative (up).
        // Shadow stays at Y=0.
        const shadowScale = scale * Math.max(0, 1 + (STATE.ball.y / 200)); // Smaller when ball high
        const shadowY = 0; // Ground level
        dom.ballShadow.style.transform = `translate(${screenX}px, ${shadowY}px) scale(${shadowScale})`;
        dom.ballShadow.style.opacity = Math.max(0, 1 + (STATE.ball.y / 100));

        // Keeper Movement (Lerp)
        const keeperScale = 600 / (600 + GOAL_Z); // Goal distance
        // Lerp keeper x
        const kX = parseFloat(dom.keeper.getAttribute('data-x') || 0);
        const newKX = kX + (STATE.keeper.targetX - kX) * 0.30; // Very Fast dive (Buffed)
        dom.keeper.setAttribute('data-x', newKX);
        // Animate dive lean
        const lean = (newKX - kX) * 1.5; // Tilt based on velocity
        dom.keeper.style.transform = `translateX(calc(-50% + ${newKX}px)) rotate(${lean}deg)`;

        // Collision Check
        if (STATE.ball.z >= GOAL_Z) {
            checkResult(STATE.ball.x, STATE.ball.y);
            STATE.ball.active = false;
        }
    }
    requestAnimationFrame(gameLoop);
}

function checkResult(x, y) {
    // Goal Dimensions (approx in physics units at goal Z)
    // Goal width 280. Center 0. Range -140 to 140.
    // Goal height 100. Base 0. Range -100 to 0 (y is up/negative).

    // Keeper Collision (Simplified box with Jumping Reach)
    const keeperX = parseFloat(dom.keeper.getAttribute('data-x') || 0);
    // Keeper width +/- 90 (Wider reach), Height -550 (Can jump to top corner)
    const caught = (x > keeperX - 90 && x < keeperX + 90) && (y > -550 && y < 0);

    // Goal world bounds: +/- 250 X (Hit post if 260+), -650 Y (Hit bar if 660+)
    const inGoal = (x > -250 && x < 250) && (y > -650 && y < 0);

    if (caught) {
        showToast("DEFESAÇA! O Galo pegou!", 'miss');
        resetBall();
    } else if (inGoal) {
        // Goal!
        const joke = JOKES[Math.floor(Math.random() * JOKES.length)];
        // Reveal letter
        const idx = STATE.revealed.findIndex(x => !x);

        // Ordinals
        const ordinals = ["Primeira", "Segunda", "Terceira", "Quarta", "Quinta", "Sexta", "Sétima", "Oitava"];

        if (idx !== -1) {
            STATE.revealed[idx] = true;
            const letter = STATE.targetWord[idx];
            const ord = ordinals[idx] || (idx+1)+"ª";

            showToast(`GOLAÇO! ${ord} letra: '${letter}'!\n${joke}`, 'goal');
            renderWord();
            if (STATE.revealed.every(x => x)) {
                setTimeout(() => dom.screens.victory.classList.add('active'), 1000);
            }
        } else {
            showToast(`GOL! ${joke}`, 'goal');
        }
        resetBall();
    } else {
        // Miss
        showToast("PRA FORA! Mirou na Lagoa!", 'miss');
        resetBall();
    }
}

function showToast(msg, type) {
    const el = document.createElement('div');
    el.className = `toast-msg ${type}`;
    el.innerText = msg;
    dom.toastContainer.appendChild(el);
    setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => el.remove(), 500);
    }, 2500);
}

function resetBall() {
    STATE.isResetting = true;
    setTimeout(() => {
        STATE.ball.x = 0;
        STATE.ball.y = 0;
        STATE.ball.z = 0;
        STATE.ball.vx = 0;
        STATE.ball.vy = 0;
        STATE.ball.vz = 0;
        dom.ball.style.transform = `translate(-50%, -50%) scale(1)`;
        dom.ballShadow.style.transform = `translate(-50%, 0)`;
        dom.ballShadow.style.opacity = '1';

        // Reset keeper
        STATE.keeper.targetX = 0;
        dom.keeper.setAttribute('data-x', 0);
        dom.keeper.style.transform = `translateX(-50%)`;

        STATE.isResetting = false;
    }, 1500);
}

init();
// Version: Final Release (Title Fix)

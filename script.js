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
const FRICTION = 0.99;
const GOAL_Z = 600;

// Game State
const STATE = {
    password: "familia",
    targetWord: "NANDINHO",
    revealed: Array(8).fill(false),
    ball: { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, active: false },
    keeper: { x: 0, y: 0, targetX: 0, targetY: 0, speed: 0.1 },
    input: { isDragging: false, startX: 0, startY: 0, currentX: 0, currentY: 0 },
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
    aimLine: document.getElementById('aim-line'),
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

    // Drag Listeners (Touch & Mouse)
    const zone = dom.touchZone;

    zone.addEventListener('mousedown', startDrag);
    zone.addEventListener('touchstart', startDrag, {passive: false});

    window.addEventListener('mousemove', updateDrag);
    window.addEventListener('touchmove', updateDrag, {passive: false});

    window.addEventListener('mouseup', endDrag);
    window.addEventListener('touchend', endDrag);

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

// --- Input Handling (Slingshot) ---

function getCoord(e) {
    if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
}

function startDrag(e) {
    if (!STATE.isPlaying || STATE.ball.active || STATE.isResetting) return;
    e.preventDefault();
    const pos = getCoord(e);
    STATE.input.isDragging = true;
    STATE.input.startX = pos.x;
    STATE.input.startY = pos.y;
    STATE.input.currentX = pos.x;
    STATE.input.currentY = pos.y;
    dom.aimLine.style.display = 'block';
}

function updateDrag(e) {
    if (!STATE.input.isDragging) return;
    const pos = getCoord(e);
    STATE.input.currentX = pos.x;
    STATE.input.currentY = pos.y;

    // Calculate Drag Vector
    // Dragging DOWN/BACK (Positive Y diff) -> Shoot UP
    // Dragging LEFT (Negative X diff) -> Shoot RIGHT (Usually inverse, but Slingshot logic: pull back)
    // Actually, usually you drag "back" to shoot "forward".
    // Screen coords: Top (0) to Bottom (High).
    // Ball is at bottom. Dragging DOWN (higher Y) is "pulling back".

    const dx = STATE.input.currentX - STATE.input.startX;
    const dy = STATE.input.currentY - STATE.input.startY;

    // Visual update of Aim Line
    // Line originates from ball center.
    // Length depends on drag distance.
    // Rotation depends on angle.

    const dist = Math.sqrt(dx*dx + dy*dy);
    const maxDist = 200; // Cap visual length
    const visualLen = Math.min(dist, maxDist);
    const angle = Math.atan2(dy, dx);

    // If I drag DOWN (positive dy), angle is ~90deg. Line points down.
    // I want to see where I'm shooting (UP).
    // So the aiming line should point opposite to drag.

    dom.aimLine.style.height = `${visualLen}px`;
    dom.aimLine.style.transform = `rotate(${angle + Math.PI/2 + Math.PI}rad)`; // Point opposite
    // Opacity based on power
    dom.aimLine.style.opacity = Math.min(1, dist / 100);
}

function endDrag(e) {
    if (!STATE.input.isDragging) return;
    STATE.input.isDragging = false;
    dom.aimLine.style.display = 'none';

    const dx = STATE.input.currentX - STATE.input.startX;
    const dy = STATE.input.currentY - STATE.input.startY;

    // Logic: Dragging DOWN (Positive dy) creates Forward Velocity (Positive Z) and Upward Velocity (Negative Y).
    // Dragging RIGHT (Positive dx) creates Left Velocity (Negative X) -> Opposites.

    // Threshold to shoot (avoid accidental clicks)
    if (Math.sqrt(dx*dx + dy*dy) < 30) return;

    // Calibration
    const power = Math.min(Math.sqrt(dx*dx + dy*dy), 300) / 10; // 0 to 30

    // X: Drag Right -> Shoot Left
    // Factor: 1.5
    STATE.ball.vx = -dx * 0.15;

    // Y: Drag Down -> Shoot Up
    // We need negative Vy.
    // Factor: 2.0
    STATE.ball.vy = -dy * 0.35;

    // Z: Forward Power.
    // Mostly based on drag distance (dy mainly, but magnitude).
    // Minimum speed 15, Max 45.
    STATE.ball.vz = Math.max(15, power * 1.5);

    STATE.ball.active = true;

    // Predict Shot for Keeper
    predictShot();
}

function predictShot() {
    // Simulate physics to find X, Y at Goal Z
    let tX = 0, tY = 0, tZ = 0;
    let tVx = STATE.ball.vx;
    let tVy = STATE.ball.vy;
    let tVz = STATE.ball.vz;

    // Simulation loop
    while (tZ < GOAL_Z) {
        tX += tVx;
        tY += tVy;
        tZ += tVz;
        tVy += GRAVITY;
        tVz *= FRICTION; // Air resistance logic if any
    }

    // tX and tY are the predicted intercept coordinates
    STATE.keeper.targetX = tX;
    STATE.keeper.targetY = tY;

    // Introduce Keeper Logic / Difficulty
    // Reaction Delay
    setTimeout(() => {
        // Difficulty Check:
        // If shot is very far in corner, keeper might not reach.
        // Keeper speed limited.

        // Random mistake factor (20% chance to misread X)
        if (Math.random() < 0.2) {
             STATE.keeper.targetX += (Math.random() - 0.5) * 200;
        }
    }, 200); // 200ms reaction delay
}

function gameLoop() {
    if (STATE.ball.active) {
        // Physics
        STATE.ball.x += STATE.ball.vx;
        STATE.ball.y += STATE.ball.vy;
        STATE.ball.z += STATE.ball.vz;
        STATE.ball.vy += GRAVITY;
        // STATE.ball.vx *= FRICTION; // Optional drag

        // Visual Update (3D Projection)
        const scale = 600 / (600 + STATE.ball.z);
        const screenX = STATE.ball.x * scale;
        const screenY = STATE.ball.y * scale;

        dom.ball.style.transform = `translate(${screenX}px, ${screenY}px) scale(${scale})`;

        const shadowScale = scale * Math.max(0, 1 + (STATE.ball.y / 200));
        const shadowY = 0;
        dom.ballShadow.style.transform = `translate(${screenX}px, ${shadowY}px) scale(${shadowScale})`;
        dom.ballShadow.style.opacity = Math.max(0, 1 + (STATE.ball.y / 100));

        // Keeper Animation
        updateKeeper();

        // Collision Check
        if (STATE.ball.z >= GOAL_Z) {
            checkResult(STATE.ball.x, STATE.ball.y);
            STATE.ball.active = false;
        }

        // Floor collision (Bounce?) - For now just stop if too low before goal
        if (STATE.ball.y > 0 && STATE.ball.z < GOAL_Z - 50) {
             STATE.ball.y = 0;
             STATE.ball.vy = -STATE.ball.vy * 0.6; // Bounce
        }
    }
    requestAnimationFrame(gameLoop);
}

function updateKeeper() {
    const kX = parseFloat(dom.keeper.getAttribute('data-x') || 0);
    const kY = parseFloat(dom.keeper.getAttribute('data-y') || 0);

    // Move towards target
    // Speed factor
    const speed = 0.15; // Smooth lerp

    // Clamp Target X to Goal width (keeper stays in goal)
    const clampedTargetX = Math.max(-250, Math.min(250, STATE.keeper.targetX));
    const clampedTargetY = Math.min(0, Math.max(-300, STATE.keeper.targetY)); // Jump/Crouch limits

    const newKX = kX + (clampedTargetX - kX) * speed;
    const newKY = kY + (clampedTargetY - kY) * speed;

    dom.keeper.setAttribute('data-x', newKX);
    dom.keeper.setAttribute('data-y', newKY);

    // Visual Transform
    // Rotate based on X movement
    const lean = (newKX - kX) * 2;
    // Translate Y for jumping
    // Visual Y for keeper is usually bottom-aligned.
    // If newKY is negative (up), we translate Y.
    dom.keeper.style.transform = `translate(calc(-50% + ${newKX}px), ${newKY}px) rotate(${lean}deg)`;
}

function checkResult(x, y) {
    // Goal Dimensions
    // Width +/- 260. Height -680 (Top bar)

    // Keeper Collision (Dynamic Box based on position)
    const kX = parseFloat(dom.keeper.getAttribute('data-x') || 0);
    const kY = parseFloat(dom.keeper.getAttribute('data-y') || 0);

    // Keeper Body Box
    // Width +/- 60, Height 150 (from kY)
    // Ball relative to keeper center

    // Visual Keeper is 100px wide?
    // Hitbox: X range [kX - 80, kX + 80]
    // Hitbox: Y range [kY - 180, kY] (Height of keeper + jump)

    const hitKeeper = (x > kX - 80 && x < kX + 80) && (y > kY - 200 && y < kY + 50);

    const inGoal = (x > -260 && x < 260) && (y > -680 && y < 0);

    if (hitKeeper) {
        showToast("DEFESAÇA! O Galo pegou!", 'miss');
        resetBall();
    } else if (inGoal) {
        // Goal
        const joke = JOKES[Math.floor(Math.random() * JOKES.length)];
        const idx = STATE.revealed.findIndex(x => !x);
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
        showToast("PRA FORA! Isolou!", 'miss');
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

        // Reset Keeper
        STATE.keeper.targetX = 0;
        STATE.keeper.targetY = 0;

        dom.ball.style.transform = `translate(-50%, -50%) scale(1)`;
        dom.ballShadow.style.transform = `translate(-50%, 0)`;
        dom.ballShadow.style.opacity = '1';

        STATE.isResetting = false;
    }, 1500);
}

init();
// Version: Slingshot Mechanics v1

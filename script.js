// Game Configuration
const TARGET_WORD = "NANDINHO";
const PASSWORD = "familia";
const JOKES_ON_GOAL = [
    "GOL! Já prepararam a Nota de Repúdio?",
    "GOL! Arena MRV ou Salão de Festas do Cruzeiro?",
    "GOL! Tremeu na frente do Maior de Minas!",
    "GOL! 9x2 é eterno!",
    "GOL! O Galo ciscou e não achou nada!",
    "GOL! Freguesia do Galo continua em dia!",
    "GOL! Esse goleiro tá caçando milho!",
    "GOL! A taça do gelo derreteu!"
];
const TAUNTS_ON_MISS = [
    "DEFENDEU! Milagre do Santo!",
    "TRAVE! Galo Doido fechou o gol!",
    "PRA FORA! Mirou no Mineirão e acertou na Lagoa!",
    "UAI SÔ! Chuta direito, Zeiro!",
    "DEFENDEU! Essa nem o Fábio pegava (mas o Galo pegou)!"
];

// State
let revealedMask = Array(TARGET_WORD.length).fill(false);
let isGameActive = false;
let isShooting = false;

// Elements
const loginOverlay = document.getElementById('login-overlay');
const gameContainer = document.getElementById('game-container');
const passwordInput = document.getElementById('password-input');
const loginBtn = document.getElementById('login-btn');
const errorMsg = document.getElementById('error-msg');
const wordSlots = document.getElementById('word-slots');
const toastArea = document.getElementById('toast-area');
const ball = document.getElementById('ball');
const ballShadow = document.getElementById('ball-shadow');
const goalkeeper = document.getElementById('goalkeeper');
const victoryModal = document.getElementById('victory-modal');
const shootZone = document.getElementById('shoot-zone');
const fieldStage = document.querySelector('.field-stage');
const netMesh = document.querySelector('.net-mesh');

// Initialization
function init() {
    loginBtn.addEventListener('click', checkPassword);
    shootZone.addEventListener('click', handleShoot);

    passwordInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') checkPassword();
    });

    renderWord();
    startSnow();

    // Idle animation for Keeper
    setInterval(() => {
        if(isGameActive && !isShooting) {
            goalkeeper.style.transform = `translateX(-50%) translateY(${Math.random() * 5}px)`;
        }
    }, 1000);
}

// Password Logic
function checkPassword() {
    const input = passwordInput.value.trim().toLowerCase();
    const cleanInput = input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (cleanInput === PASSWORD) {
        loginOverlay.style.opacity = '0';
        setTimeout(() => {
            loginOverlay.classList.add('hidden');
            gameContainer.classList.remove('hidden');
            isGameActive = true;
        }, 500);
    } else {
        errorMsg.classList.remove('hidden');
        passwordInput.classList.add('shake');
        setTimeout(() => passwordInput.classList.remove('shake'), 500);
        passwordInput.value = '';
    }
}

// Render the Word Slots
function renderWord() {
    wordSlots.innerHTML = '';
    for (let i = 0; i < TARGET_WORD.length; i++) {
        const slot = document.createElement('div');
        slot.className = 'slot';
        if (revealedMask[i]) {
            slot.innerText = TARGET_WORD[i];
            slot.classList.add('revealed');
        } else {
            slot.innerText = '';
        }
        wordSlots.appendChild(slot);
    }
}

// Show Toast Message
function showToast(msg, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = msg;

    // Remove old toasts
    toastArea.innerHTML = '';
    toastArea.appendChild(toast);

    // Sound effect simulation (Vibration)
    if (navigator.vibrate) navigator.vibrate(type === 'goal' ? 200 : 50);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Utility for ordinals
function getOrdinal(n) {
    const ordinals = ["primeira", "segunda", "terceira", "quarta", "quinta", "sexta", "sétima", "oitava"];
    return ordinals[n] || (n + 1) + "ª";
}

// Shooting Logic
function handleShoot(e) {
    if (!isGameActive || isShooting) return;

    isShooting = true;

    // Dimensions
    const goalWrapper = document.querySelector('.goal-wrapper');
    const goalRect = goalWrapper.getBoundingClientRect();
    const ballRect = ball.getBoundingClientRect();

    // Calculate destination relative to Ball's start position
    // We want to map the click to the goal plane.

    // Visual Destination
    const deltaX = e.clientX - (ballRect.left + ballRect.width/2);
    // Move up (negative Y). Fixed distance visually to goal line
    const deltaY = -150; // Approximating depth

    // Let's rely on the click Y too, but clamp it?
    // Actually, just using click Y for visual height is better.
    const visualDeltaY = e.clientY - (ballRect.top + ballRect.height/2);

    // Apply Animation
    ball.style.transform = `translate(${deltaX}px, ${visualDeltaY}px) scale(0.4)`;
    ball.classList.add('shot');

    // Shadow Logic
    ballShadow.style.transform = `translate(${deltaX}px, ${visualDeltaY + 80}px) scale(0.2)`;
    ballShadow.style.opacity = '0';

    // Logic: Hit or Miss?
    const isOnTarget = (
        e.clientX >= goalRect.left &&
        e.clientX <= goalRect.right &&
        e.clientY >= goalRect.top &&
        e.clientY <= goalRect.bottom
    );

    // Keeper AI
    const goalWidth = goalRect.width;
    let keeperMoveX = 0;

    const saveChance = 0.35;
    const willSave = Math.random() < saveChance;

    if (willSave && isOnTarget) {
        // Intercept
        const goalCenter = goalRect.left + goalWidth / 2;
        keeperMoveX = e.clientX - goalCenter;
    } else {
        // Wrong way / Random
        const randomDir = Math.random() > 0.5 ? 1 : -1;
        keeperMoveX = randomDir * (Math.random() * goalWidth * 0.45);
    }

    // Keeper Animation (Dive/Stretch)
    const rotate = keeperMoveX > 0 ? 45 : -45;
    // translateY to simulate jump
    goalkeeper.style.transform = `translateX(calc(-50% + ${keeperMoveX}px)) translateY(-20px) rotate(${rotate}deg)`;

    // Result Delay
    setTimeout(() => {
        if (isOnTarget && !willSave) {
            handleGoal();
        } else if (isOnTarget && willSave) {
            handleMiss(true); // Save
        } else {
            handleMiss(false); // Wide
        }

        setTimeout(resetRound, 2500);
    }, 600);
}

function handleGoal() {
    // Net Physics
    netMesh.classList.add('net-bulge');
    setTimeout(() => netMesh.classList.remove('net-bulge'), 300);

    // Find next unrevealed letter
    let foundIndex = -1;
    for (let i = 0; i < TARGET_WORD.length; i++) {
        if (!revealedMask[i]) {
            revealedMask[i] = true;
            foundIndex = i;
            break;
        }
    }

    renderWord();

    // Confetti
    startConfetti();

    if (revealedMask.every(b => b)) {
        setTimeout(showVictory, 1000);
    } else {
        const letter = TARGET_WORD[foundIndex];
        const ord = getOrdinal(foundIndex);
        const joke = JOKES_ON_GOAL[Math.floor(Math.random() * JOKES_ON_GOAL.length)];
        showToast(`GOLAÇO! ${ord} letra: '${letter}'! ${joke}`, 'goal');
    }
}

function handleMiss(saved) {
    const taunt = TAUNTS_ON_MISS[Math.floor(Math.random() * TAUNTS_ON_MISS.length)];
    showToast(saved ? taunt : "PRA FORA! Tenta de novo!", 'miss');

    // Screen Shake if hit post (approximated by 'saved' or near miss)
    if (!saved) {
        fieldStage.classList.add('shake');
        setTimeout(() => fieldStage.classList.remove('shake'), 500);
    }
}

function resetRound() {
    isShooting = false;
    ball.style.transform = 'translateX(-50%)';
    ball.classList.remove('shot');

    ballShadow.style.transform = 'translateX(-50%)';
    ballShadow.style.opacity = '1';

    goalkeeper.style.transform = 'translateX(-50%)';
}

function showVictory() {
    isGameActive = false;
    victoryModal.classList.remove('hidden');
    startConfetti(200);
}

// Effects
function startSnow() {
    const snowContainer = document.getElementById('snow-container');
    const particleCount = 40;

    for (let i = 0; i < particleCount; i++) {
        const flake = document.createElement('div');
        flake.className = 'snowflake';
        flake.style.left = Math.random() * 100 + '%';
        flake.style.animationDuration = (Math.random() * 3 + 2) + 's';
        flake.style.opacity = Math.random();
        snowContainer.appendChild(flake);
    }
}

function startConfetti(amount = 50) {
    const colors = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f', '#fff'];
    const container = document.getElementById('snow-container');

    for (let i = 0; i < amount; i++) {
        const conf = document.createElement('div');
        conf.className = 'snowflake';
        conf.style.background = colors[Math.floor(Math.random() * colors.length)];
        conf.style.left = Math.random() * 100 + '%';
        conf.style.width = '8px';
        conf.style.height = '8px';
        conf.style.borderRadius = '0';
        conf.style.animation = `fall ${Math.random() * 1 + 1}s linear`;

        // Remove after animation
        container.appendChild(conf);
        setTimeout(() => conf.remove(), 2000);
    }
}

init();

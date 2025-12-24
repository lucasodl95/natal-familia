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
const messageBox = document.getElementById('message-box');
const ball = document.getElementById('ball');
const goalkeeper = document.getElementById('goalkeeper');
const victoryModal = document.getElementById('victory-modal');
const shootZone = document.getElementById('shoot-zone');

// Initialization
function init() {
    loginBtn.addEventListener('click', checkPassword);
    shootZone.addEventListener('click', handleShoot);

    // Add enter key support for password
    passwordInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') checkPassword();
    });

    renderWord();
    startSnow();
}

// Password Logic
function checkPassword() {
    const input = passwordInput.value.trim().toLowerCase();
    const cleanInput = input.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (cleanInput === PASSWORD) {
        loginOverlay.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        isGameActive = true;
    } else {
        errorMsg.classList.remove('hidden');
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
            slot.style.background = '#87CEEB';
        } else {
            slot.innerText = '_';
        }
        wordSlots.appendChild(slot);
    }
}

// Show Message
function showMessage(msg, type = 'neutral') {
    messageBox.innerText = msg;
    messageBox.classList.remove('hidden');
    messageBox.style.color = type === 'good' ? '#006400' : (type === 'bad' ? '#d42426' : '#333');

    // Hide after 3 seconds
    setTimeout(() => {
        messageBox.classList.add('hidden');
    }, 4000);
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

    // Ball Animation Calculation
    const goalContainer = document.querySelector('.goal-container');
    const goalRect = goalContainer.getBoundingClientRect();
    const ballStartRect = ball.getBoundingClientRect();

    // Visual Destination
    const deltaX = e.clientX - (ballStartRect.left + ballStartRect.width/2);
    const deltaY = e.clientY - (ballStartRect.top + ballStartRect.height/2);

    ball.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    ball.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.5)`;
    ball.classList.add('shot');

    // Logic: Hit or Miss?
    // Check if click is inside goal rect
    const isOnTarget = (
        e.clientX >= goalRect.left &&
        e.clientX <= goalRect.right &&
        e.clientY >= goalRect.top &&
        e.clientY <= goalRect.bottom
    );

    // AI Logic
    const goalWidth = goalRect.width;
    let targetXPercent = (e.clientX - goalRect.left) / goalWidth; // 0 to 1 relative to goal left
    let keeperMoveX = 0; // px relative to center

    const saveChance = 0.35; // 35% chance to save if on target
    const willSave = Math.random() < saveChance;

    if (willSave && isOnTarget) {
        // Move to intercept (relative to center of goal)
        // Goal center is at goalRect.left + width/2
        const goalCenter = goalRect.left + goalWidth / 2;
        const clickOffset = e.clientX - goalCenter;
        keeperMoveX = clickOffset;
    } else {
        // Dive random
        const randomDir = Math.random() > 0.5 ? 1 : -1;
        keeperMoveX = randomDir * (Math.random() * goalWidth * 0.4);
    }

    goalkeeper.style.transform = `translateX(calc(-50% + ${keeperMoveX}px)) rotate(${keeperMoveX > 0 ? 15 : -15}deg)`;

    // Result Delay
    setTimeout(() => {
        if (isOnTarget && !willSave) {
            handleGoal();
        } else if (isOnTarget && willSave) {
            handleMiss(true);
        } else {
            handleMiss(false);
        }

        setTimeout(resetRound, 2000);
    }, 600);
}

function handleGoal() {
    let foundIndex = -1;
    for (let i = 0; i < TARGET_WORD.length; i++) {
        if (!revealedMask[i]) {
            revealedMask[i] = true;
            foundIndex = i;
            break;
        }
    }

    renderWord();

    if (revealedMask.every(b => b)) {
        setTimeout(showVictory, 500);
    } else {
        const letter = TARGET_WORD[foundIndex];
        const ord = getOrdinal(foundIndex);
        const joke = JOKES_ON_GOAL[Math.floor(Math.random() * JOKES_ON_GOAL.length)];
        showMessage(`GOLAÇO! Você descobriu a ${ord} letra: '${letter}'!\n${joke}`, 'good');
    }
}

function handleMiss(saved) {
    const taunt = TAUNTS_ON_MISS[Math.floor(Math.random() * TAUNTS_ON_MISS.length)];
    showMessage(saved ? taunt : "PRA FORA! Tenta de novo!", 'bad');
}

function resetRound() {
    isShooting = false;

    // Reset Ball without animation
    ball.style.transition = 'none';
    ball.style.transform = ''; // Reverts to CSS default (centered)
    ball.classList.remove('shot');

    // Force reflow
    void ball.offsetWidth;

    // Reset Keeper
    goalkeeper.style.transform = 'translateX(-50%)';
}

function showVictory() {
    isGameActive = false;
    victoryModal.classList.remove('hidden');
    startConfetti();
}

// Snow Effect
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

function startConfetti() {
    const colors = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f', '#fff'];
    const snowContainer = document.getElementById('snow-container');

    for (let i = 0; i < 80; i++) {
        const conf = document.createElement('div');
        conf.className = 'snowflake';
        conf.style.background = colors[Math.floor(Math.random() * colors.length)];
        conf.style.left = Math.random() * 100 + '%';
        conf.style.width = '8px';
        conf.style.height = '8px';
        conf.style.borderRadius = '0'; // Square confetti
        conf.style.animationDuration = (Math.random() * 2 + 1) + 's';
        snowContainer.appendChild(conf);
    }
}

// Start
init();

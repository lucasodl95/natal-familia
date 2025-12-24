/* ============================================
   NATAL EM FAMÍLIA - Pênaltis
   JavaScript Renovado
   ============================================ */

// Configuração do Jogo
const CONFIG = {
    password: "familia",
    targetWord: "NANDINHO",
    difficultyPercent: 40, // % de chance do goleiro defender
    animationDuration: 600, // ms
    resetDelay: 2000 // ms
};

// Piadas para cada situação
const PIADAS = {
    gol: [
        "GOL! Isso aí é de comer rezando! 🍽️",
        "GOL! Nota de repúdio vem aí! 📝",
        "GOL! 6 a 1 é o placar do amor! 💙",
        "GOL! Salão de festas do Cruzeiro ABERTO! 🎉",
        "GOL! O Galo perdeu até o cacarejo! 🐔💀",
        "GOL! Torcedor do Galo já tá chorando! 😭",
        "GOL! Cruzeiro é GIGANTE demais! 💪",
        "GOL! Bola na rede, freguês na mesa! 🍴",
        "GOL! Isso é Cruzeiro, porra! 🦊",
        "GOL! Belo Horizonte é AZUL! 💙"
    ],
    defesa: [
        "DEFENDEU! Mas foi só sorte do Galo! 🍀",
        "PEGOU! Milagre de Natal pro galinho! 🎄",
        "DEFESA! Até goleiro ruim acerta uma! 😅",
        "SALVOU! O Galo gastou toda sorte do ano! 🎰",
        "DEFENDEU! Mas calma, tem mais cobranças! ⚽",
        "PEGOU! Papai Noel ajudou o galinho! 🎅"
    ],
    fora: [
        "PRA FORA! Mirou na Lagoa da Pampulha! 🌊",
        "ERROU! Bola foi visitar o Mineirão! 🏟️",
        "PRA FORA! Chutou no estacionamento! 🚗",
        "PASSOU LONGE! Quase acertou um pombo! 🐦",
        "ERROU! A bola tá em Contagem agora! 📍",
        "PRA FORA! Mandou a bola pro aeroporto! ✈️"
    ]
};

// Ordinals para as letras
const ORDINAIS = ["Primeira", "Segunda", "Terceira", "Quarta", "Quinta", "Sexta", "Sétima", "Oitava"];

// Estado do Jogo
const state = {
    revealed: Array(CONFIG.targetWord.length).fill(false),
    score: { cruzeiro: 0, galo: 0 },
    isPlaying: false,
    isShooting: false,
    canShoot: true
};

// Elementos DOM
const $ = (id) => document.getElementById(id);
const dom = {
    app: $('app'),
    screens: {
        login: $('login-screen'),
        game: $('game-screen'),
        victory: $('victory-screen')
    },
    passwordInput: $('password-input'),
    startBtn: $('start-btn'),
    errorMsg: $('error-msg'),
    targetZones: $('target-zones'),
    zones: document.querySelectorAll('.zone'),
    goalkeeper: $('goalkeeper'),
    ballWrapper: $('ball-wrapper'),
    ball: $('ball'),
    player: $('player'),
    wordDisplay: $('word-display'),
    scoreCruzeiro: $('score-cruzeiro'),
    scoreGalo: $('score-galo'),
    instruction: $('instruction'),
    resultMessage: $('result-message'),
    confettiContainer: $('confetti-container'),
    snowContainer: $('snow-container'),
    finalName: $('final-name'),
    playAgainBtn: $('play-again-btn')
};

// ============================================
// INICIALIZAÇÃO
// ============================================

function init() {
    renderWord();
    createSnowflakes();
    setupEventListeners();
}

function setupEventListeners() {
    // Login
    dom.startBtn.addEventListener('click', attemptLogin);
    dom.passwordInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') attemptLogin();
    });

    // Zonas de chute
    dom.zones.forEach(zone => {
        zone.addEventListener('click', () => handleShot(zone));
    });

    // Jogar novamente
    dom.playAgainBtn.addEventListener('click', () => location.reload());

    // Mostrar zonas quando o jogo começar
    dom.targetZones.addEventListener('mouseenter', () => {
        if (state.canShoot) dom.targetZones.classList.add('visible');
    });

    // Touch support - mostrar zonas
    document.addEventListener('touchstart', (e) => {
        if (state.isPlaying && state.canShoot) {
            dom.targetZones.classList.add('visible');
        }
    });
}

// ============================================
// SISTEMA DE LOGIN
// ============================================

function attemptLogin() {
    const input = dom.passwordInput.value
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    if (input === CONFIG.password) {
        startGame();
    } else {
        showError();
    }
}

function showError() {
    dom.errorMsg.classList.remove('hidden');
    dom.passwordInput.classList.add('shake');
    
    setTimeout(() => {
        dom.errorMsg.classList.add('hidden');
        dom.passwordInput.classList.remove('shake');
    }, 2000);
}

function startGame() {
    dom.screens.login.classList.remove('active');
    dom.screens.game.classList.add('active');
    state.isPlaying = true;
    
    // Mostrar instrução inicial
    setTimeout(() => {
        dom.instruction.classList.remove('hidden');
        dom.targetZones.classList.add('visible');
    }, 500);
}

// ============================================
// RENDERIZAÇÃO DA PALAVRA
// ============================================

function renderWord() {
    dom.wordDisplay.innerHTML = '';
    
    CONFIG.targetWord.split('').forEach((char, i) => {
        const slot = document.createElement('div');
        slot.className = `letter-slot ${state.revealed[i] ? 'revealed' : ''}`;
        slot.textContent = state.revealed[i] ? char : '?';
        dom.wordDisplay.appendChild(slot);
    });
}

// ============================================
// MECÂNICA DE CHUTE
// ============================================

function handleShot(zone) {
    if (!state.isPlaying || state.isShooting || !state.canShoot) return;

    state.isShooting = true;
    state.canShoot = false;
    
    // Esconder instrução
    dom.instruction.classList.add('hidden');
    dom.targetZones.classList.remove('visible');

    // Marcar zona selecionada
    zone.classList.add('selected');

    // Pegar posição do chute (0-8, grid 3x3)
    const zoneIndex = parseInt(zone.dataset.zone);
    
    // Animação do jogador chutando
    dom.player.classList.add('kicking');

    // Animação da bola
    setTimeout(() => {
        animateBall(zoneIndex);
    }, 200);

    // Decisão do goleiro
    const keeperSaves = Math.random() * 100 < CONFIG.difficultyPercent;
    
    // Determinar direção do goleiro
    let keeperDirection = 'center';
    if (keeperSaves) {
        // Goleiro pula na direção certa
        if (zoneIndex % 3 === 0) keeperDirection = 'left';
        else if (zoneIndex % 3 === 2) keeperDirection = 'right';
        else keeperDirection = 'center';
    } else {
        // Goleiro pula para direção errada
        const wrongDirections = ['left', 'right', 'center'];
        const correctDir = zoneIndex % 3 === 0 ? 'left' : (zoneIndex % 3 === 2 ? 'right' : 'center');
        const wrongOptions = wrongDirections.filter(d => d !== correctDir);
        keeperDirection = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
    }

    // Animar goleiro
    setTimeout(() => {
        dom.goalkeeper.classList.add(`dive-${keeperDirection}`);
    }, 150);

    // Verificar resultado
    setTimeout(() => {
        checkResult(zoneIndex, keeperSaves);
    }, CONFIG.animationDuration);
}

function animateBall(zoneIndex) {
    // Calcular posição final baseada na zona
    const col = zoneIndex % 3; // 0 = esquerda, 1 = centro, 2 = direita
    const row = Math.floor(zoneIndex / 3); // 0 = cima, 1 = meio, 2 = baixo

    // Determinar se é gol ou fora (zonas 0, 2, 6, 8 têm chance de errar)
    const isCorner = [0, 2, 6, 8].includes(zoneIndex);
    const missChance = isCorner ? 0.15 : 0.05; // 15% de chance de errar nos cantos
    
    if (Math.random() < missChance) {
        // Bola vai pra fora
        dom.ballWrapper.dataset.result = 'miss';
        dom.ballWrapper.classList.add('shooting');
    } else {
        // Bola vai pro gol
        dom.ballWrapper.classList.add('goal');
    }
}

function checkResult(zoneIndex, keeperSaves) {
    // Verificar se foi pra fora
    const isCorner = [0, 2, 6, 8].includes(zoneIndex);
    const didMiss = Math.random() < (isCorner ? 0.1 : 0.03);

    if (didMiss) {
        // Errou o gol
        showResult('miss', getRandomJoke('fora'));
    } else if (keeperSaves) {
        // Goleiro defendeu
        state.score.galo++;
        updateScore();
        showResult('saved', getRandomJoke('defesa'));
    } else {
        // GOOOOL!
        state.score.cruzeiro++;
        updateScore();
        
        // Revelar letra
        const idx = state.revealed.findIndex(x => !x);
        if (idx !== -1) {
            state.revealed[idx] = true;
            const letter = CONFIG.targetWord[idx];
            const ordinal = ORDINAIS[idx];
            
            const joke = getRandomJoke('gol');
            showResult('goal', `${ordinal} letra: "${letter}"!\n${joke}`);
            
            renderWord();
            createConfetti();
            shakeScreen();

            // Verificar vitória
            if (state.revealed.every(x => x)) {
                setTimeout(showVictory, 2000);
            }
        } else {
            showResult('goal', getRandomJoke('gol'));
            createConfetti();
            shakeScreen();
        }
    }

    // Reset após delay
    setTimeout(resetShot, CONFIG.resetDelay);
}

function getRandomJoke(type) {
    const jokes = PIADAS[type];
    return jokes[Math.floor(Math.random() * jokes.length)];
}

function showResult(type, message) {
    dom.resultMessage.className = `show ${type}`;
    
    let emoji = '⚽';
    let title = '';
    
    switch(type) {
        case 'goal':
            emoji = '🎉';
            title = 'GOOOL!';
            break;
        case 'saved':
            emoji = '🧤';
            title = 'DEFENDEU!';
            break;
        case 'miss':
            emoji = '😅';
            title = 'PRA FORA!';
            break;
    }

    dom.resultMessage.innerHTML = `
        <div class="content">
            <div class="emoji">${emoji}</div>
            <div class="title">${title}</div>
            <div class="joke">${message}</div>
        </div>
    `;
}

function hideResult() {
    dom.resultMessage.classList.remove('show', 'goal', 'saved', 'miss');
}

function updateScore() {
    dom.scoreCruzeiro.textContent = state.score.cruzeiro;
    dom.scoreGalo.textContent = state.score.galo;
}

function resetShot() {
    // Limpar classes de animação
    dom.player.classList.remove('kicking');
    dom.ballWrapper.classList.remove('shooting', 'goal');
    dom.ballWrapper.removeAttribute('data-result');
    dom.goalkeeper.classList.remove('dive-left', 'dive-right', 'dive-center');
    
    // Limpar zona selecionada
    dom.zones.forEach(z => z.classList.remove('selected'));

    // Esconder mensagem de resultado
    hideResult();

    // Permitir novo chute
    state.isShooting = false;
    state.canShoot = true;

    // Mostrar zonas novamente
    dom.targetZones.classList.add('visible');
}

// ============================================
// EFEITOS VISUAIS
// ============================================

function createSnowflakes() {
    const snowflakes = ['❄', '❅', '❆', '•'];
    
    for (let i = 0; i < 30; i++) {
        const snowflake = document.createElement('div');
        snowflake.className = 'snowflake';
        snowflake.textContent = snowflakes[Math.floor(Math.random() * snowflakes.length)];
        snowflake.style.left = Math.random() * 100 + '%';
        snowflake.style.animationDuration = (Math.random() * 5 + 5) + 's';
        snowflake.style.animationDelay = (Math.random() * 5) + 's';
        snowflake.style.fontSize = (Math.random() * 0.8 + 0.5) + 'rem';
        dom.snowContainer.appendChild(snowflake);
    }
}

function createConfetti() {
    const colors = ['#ffd700', '#0054a6', '#4da6ff', '#fff', '#c41e3a', '#228b22'];
    const shapes = ['■', '●', '▲', '★'];
    
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.textContent = shapes[Math.floor(Math.random() * shapes.length)];
        confetti.style.left = Math.random() * 100 + '%';
        confetti.style.color = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
        confetti.style.animationDelay = (Math.random() * 0.5) + 's';
        confetti.style.fontSize = (Math.random() * 15 + 8) + 'px';
        dom.confettiContainer.appendChild(confetti);
        
        // Remover após animação
        setTimeout(() => confetti.remove(), 4000);
    }
}

function shakeScreen() {
    dom.app.classList.add('shake');
    setTimeout(() => dom.app.classList.remove('shake'), 400);
}

// ============================================
// VITÓRIA
// ============================================

function showVictory() {
    dom.finalName.textContent = CONFIG.targetWord;
    dom.screens.victory.classList.add('active');
    
    // Mega confetti!
    for (let i = 0; i < 3; i++) {
        setTimeout(createConfetti, i * 500);
    }
}

// ============================================
// INICIAR JOGO
// ============================================

document.addEventListener('DOMContentLoaded', init);

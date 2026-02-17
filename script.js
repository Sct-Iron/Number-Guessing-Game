  // --- Game Startup Sequence ---
    const startBtn = document.getElementById('startBtn');
    const startScreen = document.getElementById('startScreen');
    const loading = document.getElementById('loadingScreen');
    const game = document.querySelector('.game-container');
    const bgMusic = document.getElementById('bgMusic');
    const wrongAttempt = document.getElementById('wrong');
    const loseSound = document.getElementById('lose');
    const winSound = document.getElementById('win');

    // --- Statistics (persisted) ---
 const STATS_KEY = 'numguess_stats';
    let stats = { wins: 0, losses: 0, winLose: 0 };

    function loadStats() {
      try {
        const raw = localStorage.getItem(STATS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed.wins === 'number' && typeof parsed.losses === 'number') stats = parsed;
        }
      } catch (e) {}
    }

    function saveStats() {
      updateWinLoseRatio();
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    }

    function openStats() {
      document.getElementById('statWins').textContent = stats.wins;
      document.getElementById('statLosses').textContent = stats.losses;
      document.getElementById('statsWinLose').textContent = stats.winLose;
      const modal = document.getElementById('statsModal');
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
    }

    function closeStats() {
      const modal = document.getElementById('statsModal');
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
    }

    function updateWinLoseRatio() {
      if (stats.losses === 0 && stats.wins > 0) {
        stats.winLose = "🔥 Perfect Record";
      } else if (stats.losses > 0) {
        stats.winLose = (stats.wins / stats.losses).toFixed(2);
      } else {
        stats.winLose = 0.00;
      }
    }

    loadStats();
    updateWinLoseRatio();

    const statsBtn = document.getElementById('statsBtn');
    if (statsBtn) statsBtn.addEventListener('click', openStats);

    const closeStatsBtn = document.getElementById('closeStats');
    if (closeStatsBtn) closeStatsBtn.addEventListener('click', closeStats);
    const clearStatsBtn = document.getElementById('clearStats');
    if (clearStatsBtn) clearStatsBtn.addEventListener('click', () => {
      stats = { wins: 0, losses: 0, winLose: `${0.00}` };
      saveStats();
      openStats();
    });

// ==========================
// 🧭 Help Modal
// ==========================
function openHelp() {
    const modal = document.getElementById('helpModal');
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
}

function closeHelp() {
    const modal = document.getElementById('helpModal');
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
}

const helpBtn = document.getElementById('helpBtn');
if (helpBtn) helpBtn.addEventListener('click', openHelp);

const closeHelpBtn = document.getElementById('closeHelp');
if (closeHelpBtn) closeHelpBtn.addEventListener('click', closeHelp);

// ==========================
// 🚀 Start Game Button
// ==========================
startBtn.addEventListener('click', () => {
    startScreen.style.display = 'none';
    loading.style.display = 'flex';
    bgMusic.volume = 0.2;
    bgMusic.loop = true;

    bgMusic.play().catch(err =>
        console.log('Autoplay blocked until interaction:', err)
    );

    setTimeout(() => {
        loading.style.opacity = '0';
        loading.style.visibility = 'hidden';
        game.style.display = 'block';
        document.getElementById('guessInput').focus();
    }, 1500);
});

// ==========================
// 🎯 Main Game Logic
// ==========================
(function() {
    const max = 100, min = 1;
    let secret = rand(min, max);
    let attempts = 0;
    let previousGuesses = [];

    const input = document.getElementById('guessInput');
    const guessBtn = document.getElementById('guessBtn');
    const resetBtn = document.getElementById('resetBtn');
    const feedback = document.getElementById('hint');
    const guesses = document.getElementById('guess-list');

    // --------------------------
    // Utility Functions
    // --------------------------
    function rand(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function sanitizeVal(v) {
        if (!v) return NaN;
        v = v.trim();
        if (!/^\d+$/.test(v)) return NaN;
        return Number(v);
    }

    function setFeedback(msg, type) {
        feedback.textContent = msg;
        feedback.className = 'feedback' + (type ? ' ' + type : '');
    }

    // --------------------------
    // Update Previous Guesses (with fade-in animation)
    // --------------------------
    function updatePreviousGuesses() {
        guesses.innerHTML = previousGuesses.map(g => {
            if (g === secret) {
                return `<span class="guess-list">${g}</span>`;
            } else {
                return `<span class="wrongGuess-list">${g}</span>`;
            }
        }).join('  ');
    }

    // --------------------------
    // Handle Guess Logic
    // --------------------------
    function handleGuess() {
        const raw = input.value;
        const val = sanitizeVal(raw);

        if (isNaN(val)) {
            setFeedback(`Please enter a whole number between ${min} and ${max}.`, 'warn');
            return;
        }

        if (val < min || val > max) {
            setFeedback(`Number must be between ${min} and ${max}.`, 'warn');
            return;
        }

        previousGuesses.push(val);
        attempts++;
        updatePreviousGuesses();

        // ❌ Game Over
        if (attempts === 4 && val !== secret) {
            input.disabled = true;
            guessBtn.disabled = true;
            setFeedback(`😥 Game Over, You Lose. Correct number was ${secret}.`, 'bad');
            document.querySelector('.game-container').classList.add('lose');

            feedback.animate(
                [{ transform:'translateX(-6px)' }, { transform:'translateX(6px)' }, { transform:'translateX(0)' }],
                { duration: 200, easing: 'ease-out' }
            );

            loseSound.currentTime = 0;
            loseSound.play();
            bgMusic.pause();

            try { stats.losses = (stats.losses || 0) + 1; saveStats(); } catch(e) {}
            return;
        }

        // 🎉 Correct Guess
        if (val === secret) {
            setFeedback(`🎉 Correct! The number was ${secret}.`, 'good');
            document.querySelector('.game-container').classList.add('win');

            winSound.currentTime = 0;
            winSound.play();
            winSound.volume = 0.3;
            bgMusic.pause();

            try { stats.wins = (stats.wins || 0) + 1; saveStats(); } catch(e) {}

            input.disabled = true;
            guessBtn.disabled = true;
            return;
        }

        // 🧊 Incorrect Guess — Give Hint
        const diff = Math.abs(val - secret);
        let hint = (val < secret) ? 'Try higher ⬆️' : 'Try lower ⬇️';

        if (diff <= 5) hint = '🔥 Very close! ' + hint;
        else if (diff <= 10) hint = '♨️ Warm. ' + hint;
        else if (diff <= 20) hint = '❄️ Cold. ' + hint;
        else hint = '🌌 Far. ' + hint;

        setFeedback(hint, 'bad');

        feedback.animate(
            [{ transform:'translateX(-6px)' }, { transform:'translateX(6px)' }, { transform:'translateX(0)' }],
            { duration: 200, easing: 'ease-out' }
        );

        wrongAttempt.currentTime = 0;
        wrongAttempt.play();

        input.value = '';
        input.focus();
    }

    // --------------------------
    // Event Listeners
    // --------------------------
    guessBtn.addEventListener('click', handleGuess);

    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleGuess();
        }

        // Prevent non-digit keys
        if (e.key.length === 1 && !/[\d]/.test(e.key)) {
            e.preventDefault();
        }
    });

    resetBtn.addEventListener('click', () => {
        secret = rand(min, max);
        attempts = 0;
        previousGuesses.length = 0;

        setFeedback('Game reset. Good luck!', '');
        updatePreviousGuesses();

        input.disabled = false;
        guessBtn.disabled = false;
        input.value = '';
        input.focus();

        document.querySelector('.game-container').classList.remove('win', 'lose');

        bgMusic.play().catch(err =>
            console.log('Autoplay blocked until interaction:', err)
        );
    });

})();



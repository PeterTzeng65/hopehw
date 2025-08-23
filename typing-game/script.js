class TypingGame {
    constructor() {
        this.currentMode = null;
        this.gameData = {
            correctCount: 0,
            incorrectCount: 0,
            startTime: null,
            isActive: false,
            currentTarget: null,
            sequentialIndex: 0,
            includeNumbers: false,
            letterStartTime: null,
            reactionTimes: [],
            timeLimit: 120000 // 2 minutes in milliseconds
        };
        
        this.articles = [
            "The quick brown fox jumps over the lazy dog. This pangram contains every letter of the English alphabet at least once, making it perfect for typing practice. Many typists use this sentence to test their skills and improve their speed. The sentence has been used for decades in typing classes and remains one of the most popular practice texts. As you type this text, focus on accuracy first, then gradually increase your speed. Remember that consistent practice is the key to becoming a proficient typist.",
            
            "In the digital age, typing skills have become essential for almost every profession. Whether you are writing emails, creating documents, or coding software, the ability to type quickly and accurately can significantly improve your productivity. Touch typing, the method of typing without looking at the keyboard, is considered the most efficient way to type. It involves using all ten fingers and memorizing the position of each key. With regular practice, most people can achieve typing speeds of 40 to 60 words per minute, while professional typists can exceed 80 words per minute.",
            
            "Technology continues to evolve at an unprecedented pace, transforming the way we live, work, and communicate. From artificial intelligence and machine learning to virtual reality and blockchain, these innovations are reshaping entire industries. The internet of things connects everyday objects to the web, creating smart homes and cities. Cloud computing allows us to access our data from anywhere in the world. As we move forward, it is crucial to stay updated with these technological advances and understand their implications for our future.",
            
            "Education is the foundation of personal and societal growth. It empowers individuals to think critically, solve problems, and contribute meaningfully to their communities. Traditional classroom learning is being supplemented by online courses, interactive simulations, and virtual reality experiences. The COVID-19 pandemic accelerated the adoption of remote learning technologies, proving that education can happen anywhere. Students now have access to courses from top universities around the world, breaking down geographical barriers to quality education.",
            
            "Environmental conservation is one of the most pressing issues of our time. Climate change, deforestation, pollution, and loss of biodiversity threaten the delicate balance of our ecosystem. Sustainable practices such as renewable energy, recycling, and conservation efforts are crucial for protecting our planet for future generations. Individual actions like reducing energy consumption, using public transportation, and supporting eco-friendly products can make a significant difference. Governments, businesses, and individuals must work together to address these environmental challenges."
        ];
        
        this.keyboardLayout = [
            ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
            ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
            ['z', 'x', 'c', 'v', 'b', 'n', 'm']
        ];
        
        this.sequentialKeys = 'abcdefghijklmnopqrstuvwxyz';
        this.numbers = '1234567890';
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.showMenu();
    }
    
    setupEventListeners() {
        document.getElementById('positionMode').addEventListener('click', () => this.startMode('position'));
        document.getElementById('articleMode').addEventListener('click', () => this.startMode('article'));
        document.getElementById('sequentialMode').addEventListener('click', () => this.showSequentialOptions());
        document.getElementById('startSequential').addEventListener('click', () => this.startSequentialMode());
        document.getElementById('backToMenu').addEventListener('click', () => this.showMenu());
        document.getElementById('restartPractice').addEventListener('click', () => this.restartCurrentMode());
        
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        document.getElementById('typingInput').addEventListener('input', (e) => this.handleArticleTyping(e));
    }
    
    showMenu() {
        document.getElementById('menu').classList.remove('hidden');
        document.getElementById('gameArea').classList.add('hidden');
        this.resetGame();
    }
    
    showSequentialOptions() {
        document.getElementById('menu').classList.add('hidden');
        document.getElementById('gameArea').classList.remove('hidden');
        document.getElementById('currentMode').textContent = 'Sequential Keyboard Practice';
        document.getElementById('sequentialOptions').classList.remove('hidden');
    }
    
    startMode(mode) {
        this.currentMode = mode;
        document.getElementById('menu').classList.add('hidden');
        document.getElementById('gameArea').classList.remove('hidden');
        document.getElementById('sequentialOptions').classList.add('hidden');
        
        this.resetGame();
        this.gameData.isActive = true;
        this.gameData.startTime = Date.now();
        this.startTimer();
        
        switch(mode) {
            case 'position':
                this.startPositionMode();
                break;
            case 'article':
                this.startArticleMode();
                break;
        }
    }
    
    startSequentialMode() {
        this.gameData.includeNumbers = document.getElementById('includeNumbers').checked;
        this.startMode('sequential');
        this.showSequentialDisplay();
        this.generateSequentialTarget();
    }
    
    startPositionMode() {
        document.getElementById('currentMode').textContent = 'Keyboard Position Practice';
        document.getElementById('positionDisplay').classList.remove('hidden');
        document.getElementById('articleDisplay').classList.add('hidden');
        document.getElementById('sequentialDisplay').classList.add('hidden');
        
        this.createVirtualKeyboard();
        this.generateRandomLetter();
    }
    
    startArticleMode() {
        document.getElementById('currentMode').textContent = 'Article Typing Practice';
        document.getElementById('articleDisplay').classList.remove('hidden');
        document.getElementById('positionDisplay').classList.add('hidden');
        document.getElementById('sequentialDisplay').classList.add('hidden');
        
        this.loadRandomArticle();
        document.getElementById('typingInput').focus();
    }
    
    showSequentialDisplay() {
        document.getElementById('currentMode').textContent = 'Sequential Keyboard Practice' + (this.gameData.includeNumbers ? ' (with Numbers)' : '');
        document.getElementById('sequentialDisplay').classList.remove('hidden');
        document.getElementById('positionDisplay').classList.add('hidden');
        document.getElementById('articleDisplay').classList.add('hidden');
        
        this.createSequentialKeyboard();
        this.gameData.sequentialIndex = 0;
    }
    
    createVirtualKeyboard() {
        const keyboard = document.getElementById('virtualKeyboard');
        keyboard.innerHTML = '';
        
        this.keyboardLayout.forEach(row => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'keyboard-row';
            
            row.forEach(key => {
                const keyDiv = document.createElement('div');
                keyDiv.className = 'key';
                keyDiv.textContent = key.toUpperCase();
                keyDiv.dataset.key = key;
                rowDiv.appendChild(keyDiv);
            });
            
            keyboard.appendChild(rowDiv);
        });
    }
    
    createSequentialKeyboard() {
        const keyboard = document.getElementById('sequentialKeyboard');
        keyboard.innerHTML = '';
        
        this.keyboardLayout.forEach(row => {
            const rowDiv = document.createElement('div');
            rowDiv.className = 'keyboard-row';
            
            row.forEach(key => {
                const keyDiv = document.createElement('div');
                keyDiv.className = 'key';
                keyDiv.textContent = key.toUpperCase();
                keyDiv.dataset.key = key;
                rowDiv.appendChild(keyDiv);
            });
            
            keyboard.appendChild(rowDiv);
        });
        
        if (this.gameData.includeNumbers) {
            const numberRow = document.createElement('div');
            numberRow.className = 'keyboard-row';
            
            for (let i = 1; i <= 9; i++) {
                const keyDiv = document.createElement('div');
                keyDiv.className = 'key';
                keyDiv.textContent = i.toString();
                keyDiv.dataset.key = i.toString();
                numberRow.appendChild(keyDiv);
            }
            
            const zeroKey = document.createElement('div');
            zeroKey.className = 'key';
            zeroKey.textContent = '0';
            zeroKey.dataset.key = '0';
            numberRow.appendChild(zeroKey);
            
            keyboard.insertBefore(numberRow, keyboard.firstChild);
        }
    }
    
    generateRandomLetter() {
        const letters = 'abcdefghijklmnopqrstuvwxyz';
        const randomIndex = Math.floor(Math.random() * letters.length);
        this.gameData.currentTarget = letters[randomIndex];
        this.gameData.letterStartTime = Date.now();
        
        document.getElementById('targetLetter').textContent = this.gameData.currentTarget.toUpperCase();
        this.highlightKey(this.gameData.currentTarget);
    }
    
    generateSequentialTarget() {
        let sequence = this.sequentialKeys;
        if (this.gameData.includeNumbers) {
            sequence += this.numbers;
        }
        
        if (this.gameData.sequentialIndex >= sequence.length) {
            this.endGame();
            return;
        }
        
        this.gameData.currentTarget = sequence[this.gameData.sequentialIndex];
        document.getElementById('sequentialTarget').textContent = `Press: ${this.gameData.currentTarget.toUpperCase()}`;
        document.getElementById('sequenceProgress').textContent = `Progress: ${this.gameData.sequentialIndex}/${sequence.length}`;
        
        this.highlightSequentialKey(this.gameData.currentTarget);
    }
    
    highlightKey(key) {
        const keys = document.querySelectorAll('#virtualKeyboard .key');
        keys.forEach(k => k.classList.remove('highlight'));
        
        const targetKey = document.querySelector(`#virtualKeyboard .key[data-key="${key}"]`);
        if (targetKey) {
            targetKey.classList.add('highlight');
        }
    }
    
    highlightSequentialKey(key) {
        const keys = document.querySelectorAll('#sequentialKeyboard .key');
        keys.forEach(k => k.classList.remove('highlight'));
        
        const targetKey = document.querySelector(`#sequentialKeyboard .key[data-key="${key}"]`);
        if (targetKey) {
            targetKey.classList.add('highlight');
        }
    }
    
    loadRandomArticle() {
        const randomIndex = Math.floor(Math.random() * this.articles.length);
        const article = this.articles[randomIndex];
        
        const articleElement = document.getElementById('articleText');
        articleElement.innerHTML = '';
        
        article.split('').forEach((char, index) => {
            const span = document.createElement('span');
            span.textContent = char;
            span.dataset.index = index;
            span.className = 'char';
            articleElement.appendChild(span);
        });
        
        this.gameData.articleText = article;
        this.gameData.currentPosition = 0;
    }
    
    handleKeyPress(e) {
        if (!this.gameData.isActive) return;
        
        if (this.currentMode === 'position') {
            this.handlePositionKeyPress(e);
        } else if (this.currentMode === 'sequential') {
            this.handleSequentialKeyPress(e);
        }
    }
    
    handlePositionKeyPress(e) {
        e.preventDefault();
        const pressedKey = e.key.toLowerCase();
        const reactionTime = Date.now() - this.gameData.letterStartTime;
        
        if (pressedKey === this.gameData.currentTarget) {
            this.gameData.correctCount++;
            this.gameData.reactionTimes.push(reactionTime);
            this.hideError();
            this.generateRandomLetter();
        } else {
            this.gameData.incorrectCount++;
            this.showError();
        }
        
        this.updateStats();
    }
    
    handleSequentialKeyPress(e) {
        e.preventDefault();
        const pressedKey = e.key.toLowerCase();
        
        if (pressedKey === this.gameData.currentTarget) {
            this.gameData.correctCount++;
            this.gameData.sequentialIndex++;
            this.hideError();
            this.generateSequentialTarget();
        } else {
            this.gameData.incorrectCount++;
            this.showError();
        }
        
        this.updateStats();
    }
    
    handleArticleTyping(e) {
        const input = e.target.value;
        const targetText = this.gameData.articleText.substring(0, input.length);
        
        this.gameData.correctCount = 0;
        this.gameData.incorrectCount = 0;
        
        const chars = document.querySelectorAll('#articleText .char');
        
        for (let i = 0; i < chars.length; i++) {
            const char = chars[i];
            char.classList.remove('correct', 'incorrect', 'current');
            
            if (i < input.length) {
                if (input[i] === this.gameData.articleText[i]) {
                    char.classList.add('correct');
                    this.gameData.correctCount++;
                } else {
                    char.classList.add('incorrect');
                    this.gameData.incorrectCount++;
                }
            } else if (i === input.length) {
                char.classList.add('current');
            }
        }
        
        this.updateStats();
        
        if (input.length === this.gameData.articleText.length) {
            this.endGame();
        }
    }
    
    showError() {
        const errorMsg = document.getElementById('errorMessage');
        errorMsg.classList.remove('hidden');
        setTimeout(() => errorMsg.classList.add('hidden'), 1500);
    }
    
    hideError() {
        document.getElementById('errorMessage').classList.add('hidden');
    }
    
    updateStats() {
        document.getElementById('correctCount').textContent = this.gameData.correctCount;
        document.getElementById('incorrectCount').textContent = this.gameData.incorrectCount;
        
        const total = this.gameData.correctCount + this.gameData.incorrectCount;
        const accuracy = total > 0 ? Math.round((this.gameData.correctCount / total) * 100) : 100;
        document.getElementById('accuracy').textContent = accuracy + '%';
        
        // Calculate and display speed (Letters Per Minute)
        const elapsed = Date.now() - this.gameData.startTime;
        const minutes = elapsed / 60000;
        const lpm = minutes > 0 ? Math.round(this.gameData.correctCount / minutes) : 0;
        document.getElementById('speed').textContent = lpm + ' LPM';
        
        // Calculate and display average reaction time
        if (this.gameData.reactionTimes.length > 0) {
            const avgReaction = Math.round(
                this.gameData.reactionTimes.reduce((sum, time) => sum + time, 0) / this.gameData.reactionTimes.length
            );
            document.getElementById('reactionTime').textContent = avgReaction + 'ms';
        } else {
            document.getElementById('reactionTime').textContent = '0ms';
        }
    }
    
    startTimer() {
        this.timer = setInterval(() => {
            if (!this.gameData.isActive) return;
            
            const elapsed = Date.now() - this.gameData.startTime;
            
            // For position mode, use countdown timer (2 minutes)
            if (this.currentMode === 'position') {
                const remaining = this.gameData.timeLimit - elapsed;
                
                if (remaining <= 0) {
                    this.endGame();
                    return;
                }
                
                const seconds = Math.floor(remaining / 1000);
                const minutes = Math.floor(seconds / 60);
                const remainingSeconds = seconds % 60;
                
                document.getElementById('timer').textContent = 
                    `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
            } else {
                // For other modes, use normal elapsed timer
                const seconds = Math.floor(elapsed / 1000);
                const minutes = Math.floor(seconds / 60);
                const remainingSeconds = seconds % 60;
                
                document.getElementById('timer').textContent = 
                    `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
            }
        }, 1000);
    }
    
    endGame() {
        this.gameData.isActive = false;
        clearInterval(this.timer);
        
        const total = this.gameData.correctCount + this.gameData.incorrectCount;
        const accuracy = total > 0 ? Math.round((this.gameData.correctCount / total) * 100) : 100;
        const elapsed = Date.now() - this.gameData.startTime;
        const seconds = Math.floor(elapsed / 1000);
        
        // Calculate final speed and reaction time
        const minutes = elapsed / 60000;
        const finalLPM = minutes > 0 ? Math.round(this.gameData.correctCount / minutes) : 0;
        const avgReaction = this.gameData.reactionTimes.length > 0 ? 
            Math.round(this.gameData.reactionTimes.reduce((sum, time) => sum + time, 0) / this.gameData.reactionTimes.length) : 0;
        
        document.getElementById('finalStats').innerHTML = `
            <div>Correct: ${this.gameData.correctCount}</div>
            <div>Incorrect: ${this.gameData.incorrectCount}</div>
            <div>Accuracy: ${accuracy}%</div>
            <div>Time: ${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}</div>
            ${this.currentMode === 'position' ? `<div>Speed: ${finalLPM} LPM</div><div>Avg Reaction: ${avgReaction}ms</div>` : ''}
        `;
        
        this.showScoreMessage(accuracy);
        document.getElementById('results').classList.remove('hidden');
    }
    
    showScoreMessage(accuracy) {
        const messageEl = document.getElementById('scoreMessage');
        const animationEl = document.getElementById('animation');
        
        let message = '';
        let animationClass = '';
        
        if (accuracy < 50) {
            message = '再接再厲！Keep practicing!';
            animationClass = 'encourage-animation';
        } else if (accuracy < 70) {
            message = '再加點油！You\'re getting better!';
            animationClass = 'progress-animation';
        } else if (accuracy < 80) {
            message = '表現不錯！Good job!';
            animationClass = 'good-animation';
        } else if (accuracy < 90) {
            message = '很棒！Great work!';
            animationClass = 'great-animation';
        } else if (accuracy < 100) {
            message = '優秀！Excellent!';
            animationClass = 'excellent-animation';
        } else {
            message = '完美！Perfect!';
            animationClass = 'perfect-animation';
        }
        
        messageEl.textContent = message;
        animationEl.className = `animation ${animationClass}`;
        
        setTimeout(() => {
            animationEl.classList.add('show');
        }, 500);
    }
    
    restartCurrentMode() {
        document.getElementById('results').classList.add('hidden');
        this.startMode(this.currentMode);
    }
    
    resetGame() {
        this.gameData = {
            correctCount: 0,
            incorrectCount: 0,
            startTime: null,
            isActive: false,
            currentTarget: null,
            sequentialIndex: 0,
            includeNumbers: false,
            letterStartTime: null,
            reactionTimes: [],
            timeLimit: 120000 // 2 minutes in milliseconds
        };
        
        if (this.timer) {
            clearInterval(this.timer);
        }
        
        document.getElementById('correctCount').textContent = '0';
        document.getElementById('incorrectCount').textContent = '0';
        document.getElementById('accuracy').textContent = '100%';
        document.getElementById('timer').textContent = '2:00';
        document.getElementById('speed').textContent = '0 LPM';
        document.getElementById('reactionTime').textContent = '0ms';
        document.getElementById('typingInput').value = '';
        document.getElementById('results').classList.add('hidden');
        document.getElementById('errorMessage').classList.add('hidden');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TypingGame();
});
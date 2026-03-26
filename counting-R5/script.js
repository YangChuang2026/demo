const queryParams = new URLSearchParams(window.location.search);

let difficultyParam = parseInt(queryParams.get('difficulty')) || 1;
if (difficultyParam < 1 || difficultyParam > 4) {
  difficultyParam = 1;
}

let levelsParam = parseInt(queryParams.get('levels'));
if (levelsParam === null || levelsParam === undefined || levelsParam < 1) {
  if (difficultyParam === 1) levelsParam = 1;
  else if (difficultyParam === 2) levelsParam = 2;
  else if (difficultyParam === 3) levelsParam = 5;
  else if (difficultyParam === 4) levelsParam = 10;
}

let statsParam = parseInt(queryParams.get('stats'));
if (statsParam === null || statsParam === undefined || (statsParam !== 0 && statsParam !== 1)) {
  statsParam = 1;
}

window.urlParams = {
    token: queryParams.get('token') || 'test_token',
    userId: parseInt(queryParams.get('userId')) || 0,
    gameId: parseInt(queryParams.get('gameId')) || 0,
    difficulty: difficultyParam,
    levels: levelsParam,
    stats: statsParam
};

const gameParams = {
    userId: window.urlParams.userId,
    gameId: window.urlParams.gameId,
    difficulty: window.urlParams.difficulty,
    levels: window.urlParams.levels,
    stats: window.urlParams.stats
};

const DIFFICULTY_THRESHOLDS = {
    1: 0,
    2: 2,
    3: 5,
    4: 10
};

function getTotalLevelsForDifficulty(difficulty) {
    if (difficulty === 1) return 1;
    if (difficulty === 2) return 2;
    if (difficulty === 3) return 5;
    if (difficulty === 4) return 10;
    return 1;
}

function checkDifficultyUpgrade() {
    // 如果难度锁定，直接返回 false（不再自动升级）
    if (Game.state.isDifficultyLocked) return false;
    
    const currentStars = Game.getStarRating();
    const achievedDifficulty = currentStars === 0 ? 1 : currentStars + 1;
    
    if (achievedDifficulty > gameParams.difficulty) {
        gameParams.difficulty = achievedDifficulty;
        return true;
    }
    return false;
}

const Game = {
    state: {
        isPlaying: false,
        isPaused: false,
        currentDifficultyLevel: 0,
        n: 2,
        k: 2,
        totalFound: 0,
        currentTargetType: null,
        items: [],
        basketCount: 0,
        savedState: null,
        maxRounds: 0,
        completedRounds: 0,
        gameStartTime: null,
        uploadedDifficulty: 0,
        lastStarRating: 0,
        isDifficultyLocked: false,
        targetTotalFound: 0,
        isGameComplete: false
    },

    elements: {},

    init: function() {
        Stats.init();
        this.cacheElements();
        this.bindEvents();
        this.loadHistory();
    },

    cacheElements: function() {
        this.elements = {
            menuScreen: document.getElementById('menu-screen'),
            gameScreen: document.getElementById('game-screen'),
            pauseScreen: document.getElementById('pause-screen'),
            
            menuStartBtn: document.getElementById('menu-start-btn'),
            
            pauseBtn: document.getElementById('pause-btn'),
            restartBtn: document.getElementById('restart-btn'),
            exitBtn: document.getElementById('exit-btn'),
            resumeBtn: document.getElementById('resume-btn'),
            pauseExitBtn: document.getElementById('pause-exit-btn'),
            
            taskDisplay: document.getElementById('task-display'),
            itemsContainer: document.getElementById('items-container'),
            basket: document.getElementById('basket'),
            basketCount: document.getElementById('basket-count'),
            curtain: document.getElementById('curtain'),
            modal: document.getElementById('modal'),
            modalMessage: document.getElementById('modal-message'),
            modalBtn: document.getElementById('modal-btn'),
            totalDisplay: document.getElementById('total-display'),
            ratingDisplay: document.getElementById('rating-display'),
            levelDisplay: document.getElementById('level-display'),
            targetInfo: document.getElementById('target-info'),
            targetTotal: document.getElementById('target-total'),
            targetCompleted: document.getElementById('target-completed'),
            
            statsModal: document.getElementById('stats-modal'),
            statsContinueBtn: document.getElementById('stats-continue-btn'),
            statsChartContainer: document.getElementById('stats-chart-container'),
            statCorrectTotal: document.getElementById('stat-correct-total'),
            statAccuracy: document.getElementById('stat-accuracy'),
            statReactionTime: document.getElementById('stat-reaction-time'),
            statOperationTime: document.getElementById('stat-operation-time')
        };
    },

    bindEvents: function() {
        this.elements.menuStartBtn.addEventListener('click', this.startGame.bind(this));
        
        this.elements.pauseBtn.addEventListener('click', this.pauseGame.bind(this));
        this.elements.restartBtn.addEventListener('click', this.restartRound.bind(this));
        this.elements.exitBtn.addEventListener('click', this.exitToMenu.bind(this));
        this.elements.resumeBtn.addEventListener('click', this.resumeGame.bind(this));
        this.elements.pauseExitBtn.addEventListener('click', this.exitToMenu.bind(this));
        
        this.elements.modalBtn.addEventListener('click', this.continueGame.bind(this));
        this.elements.statsContinueBtn.addEventListener('click', this.closeStatsModal.bind(this));
        
        DragDrop.init(this.elements.basket, this.handleDrop.bind(this));
    },

    switchTab: function(tabName) {
        this.elements.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        this.elements.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === tabName + '-tab');
        });
    },

    showMenu: function() {
        this.hideAllScreens();
        this.elements.menuScreen.classList.add('active');
    },

    showInstructions: function() {
        this.hideAllScreens();
        this.elements.instructionsScreen.classList.add('active');
    },

    showHistory: function() {
        this.loadHistory();
        this.hideAllScreens();
        this.elements.historyScreen.classList.add('active');
    },

    loadHistory: function() {
        const history = Stats.getHistory();
        this.elements.historyList.innerHTML = '';
        
        if (history.length === 0) {
            this.elements.historyList.innerHTML = '<div style="text-align: center; color: #666; padding: 2rem;">暂无游戏记录</div>';
            return;
        }
        
        history.forEach((session, index) => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <div class="history-date">${session.date}</div>
                <div class="history-stats">
                    <span>正确: ${session.correctCount}/${session.totalAttempts}</span>
                    <span>准确率: ${session.accuracy}%</span>
                    <span>反应: ${Stats.formatTime(session.avgReactionTime)}</span>
                </div>
            `;
            this.elements.historyList.appendChild(item);
        });
    },

    clearHistory: function() {
        if (confirm('确定要清空所有游戏记录吗？')) {
            Stats.clearHistory();
            this.loadHistory();
        }
    },

    hideAllScreens: function() {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.querySelectorAll('.overlay').forEach(overlay => {
            overlay.classList.remove('active');
        });
    },

    startGame: function() {
        this.state.isPlaying = true;
        this.state.isPaused = false;
        this.state.currentDifficultyLevel = 0;
        this.state.n = 2;
        this.state.k = 2;
        this.state.totalFound = 0;
        this.state.basketCount = 0;
        this.state.gameStartTime = Date.now();
        this.state.uploadedDifficulty = 0;
        this.state.lastStarRating = 0;
        this.state.maxRounds = gameParams.levels;
        this.state.completedRounds = 0;
        this.state.isGameComplete = false;
        
        const urlDifficulty = parseInt(new URLSearchParams(window.location.search).get('difficulty'));
        this.state.isDifficultyLocked = !isNaN(urlDifficulty) && urlDifficulty >= 1 && urlDifficulty <= 4;
        
        // 设置目标难度和初始难度
        if (this.state.isDifficultyLocked) {
            gameParams.difficulty = urlDifficulty;  // 目标难度
        }
        
        // 设置目标累计正确数
        if (this.state.isDifficultyLocked) {
            const lockedDifficulty = gameParams.difficulty;
            if (lockedDifficulty === 1) {
                this.state.targetTotalFound = 2;
            } else if (lockedDifficulty === 2) {
                this.state.targetTotalFound = 5;
            } else if (lockedDifficulty === 3) {
                this.state.targetTotalFound = 10;
            } else if (lockedDifficulty === 4) {
                this.state.targetTotalFound = 30;
            }
        } else {
            this.state.targetTotalFound = Infinity;
        }

        Stats.init();
        this.updateRating();
        this.updateBasketCount();
        
        if (this.state.isDifficultyLocked) {
            this.elements.targetInfo.style.display = 'block';
            this.elements.targetTotal.textContent = this.state.targetTotalFound;
            this.updateTargetCompleted();
        } else {
            this.elements.targetInfo.style.display = 'none';
        }
        
        this.hideAllScreens();
        
        Animation.animateCurtain(this.elements.curtain, true, () => {
            this.elements.gameScreen.classList.add('active');
            this.startNewRound();
        });
    },

    startNewRound: function() {
        this.updateNValue();
        this.selectTargetType();
        this.state.k = this.state.n;
        this.clearItems();
        this.clearBasket();
        this.generateItems();
        this.updateTaskDisplay();
        this.updateLevelDisplay();
        
        Stats.startNewRound();
        
        Animation.animateCurtain(this.elements.curtain, false, () => {
            Stats.onCurtainOpen();
        });
    },

    updateNValue: function() {
        const level = this.state.currentDifficultyLevel;
        const maxDifficulty = GameConfig.difficultyLevels.length - 1;

        if (level < maxDifficulty) {
            const maxN = GameConfig.difficultyLevels[level].maxN;
            this.state.n = Math.min(this.state.n + 1, maxN);
        } else {
            this.state.n = Math.floor(Math.random() * 10) + 1;
        }
    },

    selectTargetType: function() {
        const targets = GameConfig.itemTypes.targets;
        this.state.currentTargetType = targets[Math.floor(Math.random() * targets.length)];
    },

    clearItems: function() {
        this.elements.itemsContainer.innerHTML = '';
        this.state.items = [];
    },

    clearBasket: function() {
        this.state.basketCount = 0;
        this.updateBasketCount();
    },

    updateBasketCount: function() {
        this.elements.basketCount.textContent = this.state.basketCount;
    },

    generateItems: function() {
        const totalItems = GameConfig.getItemCount(this.state.n);
        const targetCount = GameConfig.getTargetCount(this.state.n);
        
        const items = [];
        
        for (let i = 0; i < targetCount; i++) {
            items.push({ ...this.state.currentTargetType });
        }
        
        const distractors = GameConfig.itemTypes.distractor;
        for (let i = targetCount; i < totalItems; i++) {
            const distractor = distractors[Math.floor(Math.random() * distractors.length)];
            items.push({ ...distractor });
        }
        
        this.shuffleArray(items);
        
        items.forEach((itemData, index) => {
            const itemElement = this.createItemElement(itemData, index, totalItems);
            this.state.items.push(itemElement);
            this.elements.itemsContainer.appendChild(itemElement);
        });
    },

    shuffleArray: function(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    },

    createItemElement: function(itemData, index, totalItems) {
        const item = document.createElement('div');
        item.className = 'item';
        item.dataset.type = itemData.id;
        item.dataset.isTarget = itemData.isTarget;
        
        if (itemData.imgPath) {
            const img = document.createElement('img');
            img.src = itemData.imgPath;
            img.alt = itemData.name;
            item.appendChild(img);
        } else {
            item.textContent = itemData.emoji;
        }
        
        const containerWidth = this.elements.itemsContainer.offsetWidth;
        const containerHeight = this.elements.itemsContainer.offsetHeight;
        const centerX = containerWidth / 2 - 25;
        const centerY = containerHeight / 2 - 20;
        
        const minDimension = Math.min(containerWidth, containerHeight);
        const maxRadius = minDimension * (0.45 + (this.state.currentDifficultyLevel * 0.06));
        const minRadius = 40;
        
        const itemSize = 60;
        const minDistance = 75;
        
        let position = null;
        
        for (let attempt = 0; attempt < 500; attempt++) {
            const radius = minRadius + Math.sqrt(Math.random()) * (maxRadius - minRadius);
            const angle = Math.random() * Math.PI * 2;
            
            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;
            
            const clampedX = Math.max(10, Math.min(x, containerWidth - itemSize - 10));
            const clampedY = Math.max(10, Math.min(y, containerHeight - itemSize - 10));
            
            if (!this.checkCollision(clampedX, clampedY, minDistance)) {
                position = { x: clampedX, y: clampedY };
                break;
            }
        }
        
        if (!position) {
            position = this.gridBasedSearch(centerX, centerY, containerWidth, containerHeight, itemSize, minDistance, minRadius, maxRadius);
        }
        
        item.style.left = position.x + 'px';
        item.style.top = position.y + 'px';
        
        DragDrop.makeDraggable(item);
        
        return item;
    },

    checkCollision: function(x, y, minDistance) {
        for (let i = 0; i < this.state.items.length; i++) {
            const existingItem = this.state.items[i];
            const existingX = parseFloat(existingItem.style.left);
            const existingY = parseFloat(existingItem.style.top);
            const distance = Math.sqrt(Math.pow(x - existingX, 2) + Math.pow(y - existingY, 2));
            
            if (distance < minDistance) {
                return true;
            }
        }
        return false;
    },

    gridBasedSearch: function(centerX, centerY, containerWidth, containerHeight, itemSize, minDistance, minRadius, maxRadius) {
        const gridSize = minDistance;
        const margin = 10;
        
        let bestPosition = null;
        let bestMinDist = 0;
        
        const startX = margin;
        const startY = margin;
        const endX = containerWidth - itemSize - margin;
        const endY = containerHeight - itemSize - margin;
        
        for (let x = startX; x <= endX; x += gridSize) {
            for (let y = startY; y <= endY; y += gridSize) {
                for (let offset = 0; offset < 10; offset++) {
                    const jitterX = x + (Math.random() - 0.5) * 30;
                    const jitterY = y + (Math.random() - 0.5) * 30;
                    
                    const clampedX = Math.max(startX, Math.min(jitterX, endX));
                    const clampedY = Math.max(startY, Math.min(jitterY, endY));
                    
                    const distFromCenter = Math.sqrt(Math.pow(clampedX - centerX, 2) + Math.pow(clampedY - centerY, 2));
                    
                    if (distFromCenter >= minRadius && distFromCenter <= maxRadius) {
                        let currentMinDist = Infinity;
                        let valid = true;
                        
                        for (let i = 0; i < this.state.items.length; i++) {
                            const existingItem = this.state.items[i];
                            const existingX = parseFloat(existingItem.style.left);
                            const existingY = parseFloat(existingItem.style.top);
                            const distance = Math.sqrt(Math.pow(clampedX - existingX, 2) + Math.pow(clampedY - existingY, 2));
                            
                            if (distance < minDistance) {
                                valid = false;
                                break;
                            }
                            currentMinDist = Math.min(currentMinDist, distance);
                        }
                        
                        if (valid && currentMinDist > bestMinDist) {
                            bestMinDist = currentMinDist;
                            bestPosition = { x: clampedX, y: clampedY };
                        }
                    }
                }
            }
        }
        
        if (bestPosition) {
            return bestPosition;
        }
        
        let fallbackX = centerX;
        let fallbackY = centerY;
        let maxMinDist = 0;
        
        for (let i = 0; i < 100; i++) {
            const x = margin + Math.random() * (containerWidth - itemSize - 2 * margin);
            const y = margin + Math.random() * (containerHeight - itemSize - 2 * margin);
            
            let currentMinDist = Infinity;
            for (let j = 0; j < this.state.items.length; j++) {
                const existingItem = this.state.items[j];
                const existingX = parseFloat(existingItem.style.left);
                const existingY = parseFloat(existingItem.style.top);
                const distance = Math.sqrt(Math.pow(x - existingX, 2) + Math.pow(y - existingY, 2));
                currentMinDist = Math.min(currentMinDist, distance);
            }
            
            if (currentMinDist > maxMinDist) {
                maxMinDist = currentMinDist;
                fallbackX = x;
                fallbackY = y;
            }
        }
        
        return { x: fallbackX, y: fallbackY };
    },

    updateTaskDisplay: function() {
        const targetName = this.state.currentTargetType.name;
        this.elements.taskDisplay.textContent = 
            `从以下物品中找出 ${this.state.n} 个"${targetName}"，当前还需找到 ${this.state.k} 个`;
    },

    handleDrop: function(item, originalParent, dragStartTime) {
        if (this.state.isPaused) return;
        
        const isTarget = item.dataset.isTarget === 'true';
        Stats.onItemDrop(isTarget);
        
        if (isTarget) {
            this.handleTargetItem(item);
        } else {
            this.handleDistractorItem(item, originalParent);
        }
    },

    handleTargetItem: function(item) {
        if (this.state.isGameComplete) return;
        
        DragDrop.placeItemInBasket(item);
        this.state.basketCount++;
        this.updateBasketCount();
        this.state.k--;
        this.state.totalFound++;
        this.updateTargetCompleted();
        this.updateTaskDisplay();
        this.updateTotalDisplay();
        this.updateRating();
        
        if (this.state.isDifficultyLocked && this.state.totalFound >= this.state.targetTotalFound) {
            this.gameComplete();
            return;
        }
        
        if (this.state.k === 0) {
            this.handleRoundComplete();
        }
    },

    handleDistractorItem: function(item, originalParent) {
        Animation.shakeBasket(this.elements.basket);
        Animation.flashBorder();
        DragDrop.ejectItem(item, originalParent);
    },

    handleRoundComplete: function() {
        this.state.completedRounds++;
        
        Animation.createConfetti(this.elements.taskDisplay);
        
        Stats.handleRoundComplete();
        const sessionData = Stats.getAllRoundsData();
        
        // 难度锁定时，只在完成所有任务时显示庆祝
        let shouldShowCelebration = false;
        if (this.state.isDifficultyLocked) {
            shouldShowCelebration = (this.state.completedRounds >= this.state.maxRounds || this.state.totalFound >= this.state.targetTotalFound);
        } else {
            const currentStars = Game.getStarRating();
            const achievedDifficulty = currentStars === 0 ? 1 : currentStars + 1;
            shouldShowCelebration = (achievedDifficulty > gameParams.difficulty);
        }
        
        if (gameParams.stats === 0) {
            this.showSimpleCompleteModal(shouldShowCelebration);
            return;
        }
        
        const shouldShowStats = (
            this.state.totalFound >= GameConfig.rating.fourStar ||
            this.state.totalFound >= GameConfig.rating.threeStar ||
            this.state.totalFound >= GameConfig.rating.twoStar ||
            this.state.totalFound >= GameConfig.rating.oneStar
        );
        
        if (shouldShowStats) {
            this.showStatsModal(sessionData, shouldShowCelebration);
        } else {
            this.showModal('你完成了任务！');
        }
    },

    showStatsModal: function(sessionData, showCelebration = false) {
        this.elements.statCorrectTotal.textContent = `${sessionData.totalCorrect} / ${sessionData.totalAttempts}`;
        
        const accuracy = sessionData.totalAttempts > 0 
            ? Math.round((sessionData.totalCorrect / sessionData.totalAttempts) * 100) 
            : 0;
        this.elements.statAccuracy.textContent = `${accuracy}%`;
        
        const lastRound = Stats.getCurrentRound();
        const avgReactionTime = lastRound ? lastRound.reactionTime : -1;
        const avgOperationTime = lastRound ? lastRound.operationTime : -1;
        
        this.elements.statReactionTime.textContent = Stats.formatTime(avgReactionTime);
        this.elements.statOperationTime.textContent = Stats.formatTime(avgOperationTime);
        
        const progressMessage = document.getElementById('progressMessage');
        if (progressMessage) {
            if (showCelebration) {
                progressMessage.textContent = '🎉 恭喜！你完成了这一难度的所有关卡！';
                progressMessage.style.color = '#4CAF50';
                progressMessage.style.fontWeight = 'bold';
                progressMessage.style.fontSize = '1.1em';
                progressMessage.style.display = 'block';
            } else {
                progressMessage.style.display = 'none';
            }
        }
        
        this.elements.statsModal.style.display = 'flex';
        setTimeout(() => {
            this.elements.statsModal.classList.add('show');
        }, 10);
    },

    closeStatsModal: function() {
        this.elements.statsModal.classList.remove('show');
        setTimeout(() => {
            this.elements.statsModal.style.display = 'none';
            
            // 难度锁定时，只在完成所有任务时上报数据
            if (this.state.isDifficultyLocked) {
                const isFinalComplete = (this.state.completedRounds >= this.state.maxRounds || this.state.totalFound >= this.state.targetTotalFound);
                if (isFinalComplete && !this.state.uploadedDifficulty) {
                    this.sendFinalGameData();
                    this.state.uploadedDifficulty = 1;  // 标记已上报
                }
            } else {
                // 非锁定难度，按原逻辑处理
                const currentStars = this.getStarRating();
                const starUpgraded = currentStars > this.state.lastStarRating;
                
                if (starUpgraded) {
                    this.sendFinalGameData();
                    this.state.lastStarRating = currentStars;
                }
                
                if (starUpgraded && currentStars === 4) {
                    alert('🎉 恭喜你完成了所有难度！游戏结束！');
                    this.exitToMenu();
                    return;
                }
            }
            
            this.continueGame();
        }, 300);
    },

    showModal: function(message) {
        this.elements.modalMessage.textContent = message;
        Animation.showModal(this.elements.modal);
    },

    showSimpleCompleteModal: function(showCelebration = false) {
        const modal = this.elements.modal;
        const message = this.elements.modalMessage;
        const btn = this.elements.modalBtn;
        
        if (showCelebration) {
            message.textContent = '🎉 恭喜！你完成了这一难度的所有关卡！';
        } else {
            message.textContent = '恭喜完成！';
        }
        
        btn.replaceWith(btn.cloneNode(true));
        this.elements.modalBtn = document.getElementById('modal-btn');
        
        this.elements.modalBtn.addEventListener('click', () => {
            Animation.hideModal(modal, () => {
                // 难度锁定时，只在完成所有任务时上报数据
                if (this.state.isDifficultyLocked) {
                    const isFinalComplete = (this.state.completedRounds >= this.state.maxRounds || this.state.totalFound >= this.state.targetTotalFound);
                    if (isFinalComplete && !this.state.uploadedDifficulty) {
                        this.sendFinalGameData();
                        this.state.uploadedDifficulty = 1;  // 标记已上报
                    }
                } else {
                    // 非锁定难度，按原逻辑处理
                    const difficultyUpgraded = checkDifficultyUpgrade();
                    
                    if (difficultyUpgraded && this.state.uploadedDifficulty < gameParams.difficulty) {
                        this.sendFinalGameData();
                        this.state.uploadedDifficulty = gameParams.difficulty;
                    }
                }
                
                if (this.state.completedRounds >= this.state.maxRounds) {
                    this.startGame();
                } else {
                    this.startNewRound();
                }
            });
        });
    },

    continueGame: function() {
        Animation.hideModal(this.elements.modal, () => {
            this.updateDifficultyLevel();
            
            if (this.state.completedRounds >= this.state.maxRounds) {
                alert('恭喜！已完成所有回合！');
                this.exitToMenu();
            } else {
                Animation.animateCurtain(this.elements.curtain, true, () => {
                    this.startNewRound();
                });
            }
        });
    },

    updateDifficultyLevel: function() {
        const maxLevel = GameConfig.difficultyLevels.length - 1;
        const currentMaxN = GameConfig.difficultyLevels[this.state.currentDifficultyLevel].maxN;
        
        if (this.state.currentDifficultyLevel < maxLevel && this.state.n >= currentMaxN) {
            this.state.currentDifficultyLevel++;
        }
    },

    updateTotalDisplay: function() {
        this.elements.totalDisplay.textContent = `总共找到：${this.state.totalFound} 个目标物品`;
    },

    updateLevelDisplay: function() {
        const currentRound = this.state.completedRounds + 1;
        const maxRounds = this.state.maxRounds || gameParams.levels;
        this.elements.levelDisplay.textContent = `第${currentRound}关`;
    },

    updateTargetCompleted: function() {
        if (this.state.isDifficultyLocked) {
            this.elements.targetCompleted.textContent = this.state.totalFound;
        }
    },

    getStarRating: function() {
        if (this.state.isDifficultyLocked) {
            const lockedDifficulty = gameParams.difficulty;
            // 难度锁定时，未完成目标前显示 targetDifficulty - 1，完成后显示 targetDifficulty
            const targetThreshold = this.state.targetTotalFound;
            if (this.state.totalFound >= targetThreshold) {
                return lockedDifficulty;  // 已完成目标，返回目标难度
            } else {
                return Math.max(0, lockedDifficulty - 1);  // 未完成，返回目标难度 - 1
            }
        }
        
        // 否则原有动态计算逻辑
        let stars = 0;
        if (this.state.totalFound >= GameConfig.rating.fourStar) {
            stars = 4;
        } else if (this.state.totalFound >= GameConfig.rating.threeStar) {
            stars = 3;
        } else if (this.state.totalFound >= GameConfig.rating.twoStar) {
            stars = 2;
        } else if (this.state.totalFound >= GameConfig.rating.oneStar) {
            stars = 1;
        }
        return stars;
    },

    updateRating: function() {
        const stars = this.getStarRating();
        this.elements.ratingDisplay.textContent = '★'.repeat(stars) + '☆'.repeat(4 - stars);
    },

    pauseGame: function() {
        if (!this.state.isPlaying) return;
        
        this.state.isPaused = true;
        this.state.savedState = {
            items: this.state.items.map(item => ({
                element: item,
                left: item.style.left,
                top: item.style.top,
                parent: item.parentElement
            }))
        };
        
        this.elements.pauseScreen.classList.add('active');
    },

    resumeGame: function() {
        this.state.isPaused = false;
        this.elements.pauseScreen.classList.remove('active');
    },

    restartRound: function() {
        if (!this.state.isPlaying) return;
        
        Stats.init();
        Animation.animateCurtain(this.elements.curtain, true, () => {
            this.state.k = this.state.n;
            this.clearItems();
            this.clearBasket();
            this.generateItems();
            this.updateTaskDisplay();
            
            Animation.animateCurtain(this.elements.curtain, false, () => {
                Stats.onCurtainOpen();
            });
        });
    },

    sendFinalGameData: function() {
        if (!Stats.currentSession || Stats.currentSession.rounds.length === 0) {
            return;
        }

        const userId = window.urlParams.userId || 0;
        const gameId = window.urlParams.gameId || 0;
        const game = 'ABLLS_R5';
        // 难度锁定时，difficulty 始终为锁定值；否则根据星星数计算
        const difficulty = this.state.isDifficultyLocked ? gameParams.difficulty : (this.getStarRating() === 0 ? 1 : this.getStarRating());
        const levels = Stats.currentSession.rounds.length;
        
        let totalCorrect = 0;
        let totalAttempts = 0;
        Stats.currentSession.rounds.forEach(round => {
            totalCorrect += round.correctCount || 0;
            totalAttempts += round.totalAttempts || 0;
        });
        const accuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;
        
        const reactionTime = [];
        const operationTime = [];
        const totalTime = [];
        
        for (let i = 0; i < levels; i++) {
            const round = Stats.currentSession.rounds[i];
            if (round) {
                if (round.reactionTime && round.reactionTime > 0) {
                    reactionTime.push(Math.round(round.reactionTime));
                } else {
                    reactionTime.push(-1);
                }
                
                if (round.operationTime && round.operationTime > 0) {
                    operationTime.push(Math.round(round.operationTime));
                } else {
                    operationTime.push(-1);
                }
                
                const rt = reactionTime[reactionTime.length - 1];
                const ot = operationTime[operationTime.length - 1];
                
                let total = -1;
                if (rt !== -1 && ot !== -1) {
                    total = rt + ot;
                } else if (rt !== -1) {
                    total = rt;
                } else if (ot !== -1) {
                    total = ot;
                }
                totalTime.push(total);
                
                // 如果 operationTime 为 -1 但 totalTime 不为 -1，则用 totalTime 填充 operationTime
                if (operationTime[operationTime.length - 1] === -1 && totalTime[totalTime.length - 1] !== -1) {
                    operationTime[operationTime.length - 1] = totalTime[totalTime.length - 1];
                }
            } else {
                reactionTime.push(-1);
                operationTime.push(-1);
                totalTime.push(-1);
            }
        }
        
        let gameTime = 0;
        if (this.state.gameStartTime) {
            const lastRoundEndTime = Stats.currentSession.rounds.length > 0 
                ? Stats.currentSession.rounds[Stats.currentSession.rounds.length - 1].endTime 
                : 0;
            if (lastRoundEndTime > 0) {
                gameTime = Math.round(lastRoundEndTime - this.state.gameStartTime);
            } else {
                gameTime = Math.round(Date.now() - this.state.gameStartTime);
            }
        }
        
        const timestamp = new Date().toISOString();
        
        const gameData = {
            userId: userId,
            game: game,
            gameId: gameId,
            gameResult: {
                difficulty: difficulty,
                levels: levels,
                accuracy: accuracy,
                reactionTime: reactionTime,
                operationTime: operationTime,
                totalTime: totalTime
            },
            gameTime: gameTime,
            timestamp: timestamp
        };
        
        console.log('发送游戏数据:', gameData);
        
        if (typeof sendGameData === 'function') {
            sendGameData(gameData);
        }
    },

    gameComplete: function() {
        if (this.state.isGameComplete) return;
        this.state.isGameComplete = true;
        
        this.sendFinalGameData();
        alert('🎉 恭喜！你已完成目标！');
        this.exitToMenu();
    },

    exitToMenu: function() {
        if (this.state.isPlaying && Stats.currentSession && Stats.currentSession.rounds.length > 0) {
            this.sendFinalGameData();
        }

        this.state.isPlaying = false;
        this.state.isPaused = false;
        
        this.elements.pauseScreen.classList.remove('active');
        this.showMenu();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Game.init();
});

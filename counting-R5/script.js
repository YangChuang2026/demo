const queryParams = new URLSearchParams(window.location.search);
window.urlParams = {
    token: queryParams.get('token') || '',
    user_id: queryParams.get('user_id') || 'user',
    difficulty: queryParams.get('difficulty') ? parseInt(queryParams.get('difficulty')) : null,
    levels: queryParams.get('levels') ? parseInt(queryParams.get('levels')) : null,
    game_id: queryParams.get('game_id') || 'R5'
};

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
        savedState: null
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
        this.state.finalDataSent = false;

        Stats.init();
        this.updateRating();
        this.updateBasketCount();
        
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
        
        // 第一步：使用改进的随机放置算法，最大尝试500次
        for (let attempt = 0; attempt < 500; attempt++) {
            // 使用 sqrt(random) 生成半径，使物品更集中在中心但边缘也有分布
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
        
        // 第二步：如果随机放置失败，使用网格抖动放置算法
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
        DragDrop.placeItemInBasket(item);
        this.state.basketCount++;
        this.updateBasketCount();
        this.state.k--;
        this.state.totalFound++;
        this.updateTaskDisplay();
        this.updateTotalDisplay();
        this.updateRating();
        
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
        Animation.createConfetti(this.elements.taskDisplay);
        
        Stats.handleRoundComplete();
        const sessionData = Stats.getAllRoundsData();
        
        const shouldShowStats = (
            this.state.totalFound >= GameConfig.rating.fourStar ||
            this.state.totalFound >= GameConfig.rating.threeStar ||
            this.state.totalFound >= GameConfig.rating.twoStar ||
            this.state.totalFound >= GameConfig.rating.oneStar
        );
        
        if (shouldShowStats) {
            this.showStatsModal(sessionData);
        } else {
            this.showModal('你完成了任务！');
        }
    },

    showStatsModal: function(sessionData) {
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
        
        this.elements.statsModal.style.display = 'flex';
        setTimeout(() => {
            this.elements.statsModal.classList.add('show');
        }, 10);
    },

    closeStatsModal: function() {
        this.elements.statsModal.classList.remove('show');
        setTimeout(() => {
            this.elements.statsModal.style.display = 'none';
            this.continueGame();
        }, 300);
    },

    showModal: function(message) {
        this.elements.modalMessage.textContent = message;
        Animation.showModal(this.elements.modal);
    },

    continueGame: function() {
        Animation.hideModal(this.elements.modal, () => {
            this.updateDifficultyLevel();
            Animation.animateCurtain(this.elements.curtain, true, () => {
                this.startNewRound();
            });
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

    updateRating: function() {
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
        
        this.state.finalDataSent = false;
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

        if (this.state.finalDataSent) {
            return;
        }
        this.state.finalDataSent = true;

        // user_id：从 URL 参数获取，默认为 "user"
        const user_id = window.urlParams.user_id || 'user';
        
        // game_id：从 URL 参数获取，默认为 "R5"
        const game_id = window.urlParams.game_id || 'R5';

        // difficulty：优先使用 URL 参数，否则根据星级计算
        let difficulty = window.urlParams.difficulty;
        if (difficulty === null || difficulty === undefined) {
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
            difficulty = stars;
        } else {
            difficulty = parseInt(difficulty);
        }

        // levels：优先使用 URL 参数，否则使用已完成的回合数
        let levels = window.urlParams.levels;
        if (levels === null || levels === undefined) {
            levels = Stats.currentSession.rounds.length;
        } else {
            levels = parseInt(levels);
        }

        // 计算所有回合的正确次数和总尝试次数
        let totalCorrect = 0;
        let totalAttempts = 0;
        Stats.currentSession.rounds.forEach(round => {
            totalCorrect += round.correctCount;
            totalAttempts += round.totalAttempts;
        });
        
        // accuracy：正确率（0~1），无尝试则为 -1
        const accuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : -1;

        // 构建时间数组
        const reaction_time = [];
        const operation_time = [];
        const total_time = [];
        
        Stats.currentSession.rounds.forEach(round => {
            // reaction_time：整数，无反应时间则为 -1
            if (round.reactionTime && round.reactionTime > 0) {
                reaction_time.push(Math.round(round.reactionTime));
            } else {
                reaction_time.push(-1);
            }
            
            // operation_time：整数，无操作时间则为 -1
            if (round.operationTime && round.operationTime > 0) {
                operation_time.push(Math.round(round.operationTime));
            } else {
                operation_time.push(-1);
            }
            
            // total_time：反应时间 + 操作时间
            // 若反应时间为 -1 则只取操作时间，若两者都为 -1 则填 -1
            const rt = reaction_time[reaction_time.length - 1];
            const ot = operation_time[operation_time.length - 1];
            
            let total = -1;
            if (rt !== -1 && ot !== -1) {
                total = rt + ot;
            } else if (rt !== -1) {
                total = rt;
            } else if (ot !== -1) {
                total = ot;
            }
            total_time.push(total);
        });
        
        // game_time：从游戏开始到最后一个回合结束的毫秒数
        let game_time = 0;
        if (this.state.gameStartTime) {
            const lastRoundEndTime = Stats.currentSession.rounds.length > 0 
                ? Stats.currentSession.rounds[Stats.currentSession.rounds.length - 1].endTime 
                : 0;
            if (lastRoundEndTime > 0) {
                game_time = Math.round(lastRoundEndTime - this.state.gameStartTime);
            } else {
                game_time = Math.round(Date.now() - this.state.gameStartTime);
            }
        }
        
        // timestamp：ISO 8601 格式 UTC 时间
        const timestamp = new Date().toISOString();

        const data = {
            user_id,
            game_id,
            difficulty,
            levels,
            accuracy,
            reaction_time,
            operation_time,
            total_time,
            game_time,
            timestamp
        };

        console.log('发送游戏数据:', data);

        if (typeof sendGameData === 'function') {
            sendGameData(data);
        }
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
// 解析 URL 参数
function parseUrlParams() {
  const queryParams = new URLSearchParams(window.location.search);
  
  // 解析 difficulty，默认 1，范围 [1,2,3,4]
  let difficulty = parseInt(queryParams.get('difficulty')) || 1;
  if (difficulty < 1 || difficulty > 4) {
    difficulty = 1;
  }
  
  // 解析 levels，根据 difficulty 自动设置
  let levels = parseInt(queryParams.get('levels'));
  if (levels === null || levels === undefined || levels < 1) {
    if (difficulty === 1) levels = 1;
    else if (difficulty === 2) levels = 2;
    else if (difficulty === 3) levels = 5;
    else if (difficulty === 4) levels = 10;
  }
  
  // 解析 stats，默认 1
  let stats = parseInt(queryParams.get('stats'));
  if (stats === null || stats === undefined || (stats !== 0 && stats !== 1)) {
    stats = 1;
  }
  
  return {
    userId: parseInt(queryParams.get('userId')) || 0,
    gameId: parseInt(queryParams.get('gameId')) || 0,
    token: queryParams.get('token') || 'test_token',
    difficulty: difficulty,
    levels: levels,
    stats: stats
  };
}

// 创建全局 URL 参数对象
window.urlParams = parseUrlParams();

// 游戏内部记录这些参数值
const gameParams = {
  userId: window.urlParams.userId,
  gameId: window.urlParams.gameId,
  difficulty: window.urlParams.difficulty,
  levels: window.urlParams.levels,
  stats: window.urlParams.stats
};

let state = {
  currentPage: 1,
  totalPages: 0,  // 初始为 0，在 resetGame 中根据 levels 设置
  matchedPairs: [],
  pages: [],
  selectedImage: null,
  isPaused: false,
  isProcessing: false,
  pageStats: {},
  previousPageReactionTime: null,
  gameStartTime: null,
  completedPages: 0  // 记录已完成的页面数
};

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

function initializePages() {
  state.pages = [];
  const shuffledPairs = shuffleArray(wordImagePairs);
  
  for (let i = 0; i < state.totalPages; i++) {
    const startIndex = i * 3;
    const pagePairs = shuffledPairs.slice(startIndex, startIndex + 3);
    state.pages.push(pagePairs);
  }
  
  initializePageStats();
}

function initializePageStats() {
  state.pageStats = {};
  for (let i = 1; i <= state.totalPages; i++) {
    state.pageStats[i] = {
      correctCount: 0,
      totalAttempts: 0,
      reactionTime: null,
      operationTimes: [],
      pageEnterTime: null,
      firstImageClickTime: null,
      imageClickTimes: {},
      pageTotalOperationTime: null
    };
  }
}

function getStarRating() {
  const count = state.matchedPairs.length;
  if (count >= 20) return 4;
  if (count >= 10) return 3;
  if (count >= 5) return 2;
  if (count >= 2) return 1;
  return 0;
}

function updateStarsDisplay() {
  const starsContainer = document.getElementById('stars');
  const starRating = getStarRating();
  let starsHTML = '';
  
  for (let i = 0; i < 4; i++) {
    starsHTML += i < starRating ? '⭐' : '☆';
  }
  
  starsContainer.textContent = starsHTML;
}

function updateScoreDisplay() {
  const scoreElement = document.getElementById('score');
  scoreElement.textContent = state.matchedPairs.length;
  updateStarsDisplay();
}

function updatePageInfo() {
  const pageInfoElement = document.getElementById('pageInfo');
  pageInfoElement.textContent = `${state.currentPage}/${state.totalPages}`;
}

function isPageComplete(pageNum) {
  const pageData = state.pages[pageNum - 1];
  return pageData.every(pair => state.matchedPairs.includes(pair.id));
}

function updateNavigationButtons() {
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  
  prevBtn.disabled = state.currentPage <= 1;
  
  const canGoNext = state.currentPage < state.totalPages && isPageComplete(state.currentPage);
  nextBtn.disabled = !canGoNext;
}

function generateWordOptions(correctPair) {
  const usedWords = state.matchedPairs.map(id => {
    const pair = wordImagePairs.find(p => p.id === id);
    return pair ? pair.word : null;
  }).filter(Boolean);
  
  let options = [correctPair.word];
  
  const otherPairs = wordImagePairs.filter(p => 
    p.id !== correctPair.id && !usedWords.includes(p.word)
  );
  
  const shuffledOthers = shuffleArray(otherPairs);
  const additionalOptions = shuffledOthers.slice(0, 4);
  
  options = options.concat(additionalOptions.map(p => p.word));
  
  while (options.length < 5) {
    const backupPairs = wordImagePairs.filter(p => 
      p.id !== correctPair.id && !options.includes(p.word)
    );
    if (backupPairs.length > 0) {
      options.push(backupPairs[0].word);
    } else {
      break;
    }
  }
  
  return shuffleArray(options);
}

function renderCurrentPage() {
  const imagesGrid = document.getElementById('imagesGrid');
  imagesGrid.innerHTML = '';
  
  const currentPageData = state.pages[state.currentPage - 1];
  
  if (!state.pageStats[state.currentPage].pageEnterTime) {
    state.pageStats[state.currentPage].pageEnterTime = Date.now();
  }
  
  currentPageData.forEach((pair) => {
    const isMatched = state.matchedPairs.includes(pair.id);
    const isSelected = state.selectedImage === pair.id;
    
    const card = document.createElement('div');
    card.className = `image-card ${isMatched ? 'matched' : ''} ${isSelected ? 'selected' : ''}`;
    card.dataset.pairId = pair.id;
    
    const imageDisplay = document.createElement('div');
    imageDisplay.className = 'image-display';
    imageDisplay.textContent = pair.icon;
    
    card.appendChild(imageDisplay);
    
    const optionsContainer = document.createElement('div');
    optionsContainer.className = `word-options-container ${isSelected ? 'active' : ''}`;
    optionsContainer.id = `options-${pair.id}`;
    
    if (isSelected && !isMatched) {
      const options = generateWordOptions(pair);
      const optionsWrapper = document.createElement('div');
      optionsWrapper.className = 'word-options';
      
      options.forEach((word) => {
        const option = document.createElement('button');
        option.className = 'word-option';
        option.textContent = word;
        option.onclick = (e) => {
          e.stopPropagation();
          handleWordSelection(pair.id, word);
        };
        optionsWrapper.appendChild(option);
      });
      
      optionsContainer.appendChild(optionsWrapper);
    }
    
    if (!isMatched) {
      card.onclick = () => selectImage(pair.id);
    }
    
    card.appendChild(optionsContainer);
    imagesGrid.appendChild(card);
  });
  
  updatePageInfo();
  updateNavigationButtons();
  updateScoreDisplay();
}

function selectImage(pairId) {
  if (state.matchedPairs.includes(pairId) || state.isPaused || state.isProcessing) return;
  
  const pageStats = state.pageStats[state.currentPage];
  
  if (!pageStats.firstImageClickTime) {
    pageStats.firstImageClickTime = Date.now();
    pageStats.reactionTime = pageStats.firstImageClickTime - pageStats.pageEnterTime;
  }
  
  if (!pageStats.imageClickTimes[pairId]) {
    pageStats.imageClickTimes[pairId] = Date.now();
  }
  
  state.selectedImage = state.selectedImage === pairId ? null : pairId;
  renderCurrentPage();
}

function handleWordSelection(pairId, selectedWord) {
  if (state.isPaused) return;
  
  const pair = wordImagePairs.find(p => p.id === pairId);
  
  if (!pair) return;
  
  const pageStats = state.pageStats[state.currentPage];
  pageStats.totalAttempts++;
  
  const optionsContainer = document.getElementById(`options-${pairId}`);
  const optionButtons = optionsContainer.querySelectorAll('.word-option');
  
  optionButtons.forEach(btn => {
    if (btn.textContent === pair.word) {
      btn.classList.add('correct');
    } else if (btn.textContent === selectedWord) {
      btn.classList.add('wrong');
    }
  });
  
  if (selectedWord === pair.word) {
    pageStats.correctCount++;
    state.isProcessing = true;
    
    if (pageStats.imageClickTimes[pairId]) {
      const operationTime = Date.now() - pageStats.imageClickTimes[pairId];
      pageStats.operationTimes.push(operationTime);
    }
    
    setTimeout(() => {
      state.matchedPairs.push(pairId);
      state.selectedImage = null;
      state.isProcessing = false;
      renderCurrentPage();
      
      if (isPageComplete(state.currentPage)) {
        showStatsModal();
      }
    }, 800);
  }
}

function goToPrevPage() {
  if (state.currentPage > 1 && !state.isPaused) {
    state.currentPage--;
    state.selectedImage = null;
    renderCurrentPage();
  }
}

function goToNextPage() {
  if (state.currentPage < state.totalPages && isPageComplete(state.currentPage) && !state.isPaused) {
    state.currentPage++;
    state.selectedImage = null;
    renderCurrentPage();
  }
}

function addMorePage() {
  const usedIds = state.pages.flat().map(p => p.id);
  const availablePairs = wordImagePairs.filter(p => !usedIds.includes(p.id));
  
  if (availablePairs.length >= 3) {
    const shuffledAvailable = shuffleArray(availablePairs);
    const newPage = shuffledAvailable.slice(0, 3);
    state.pages.push(newPage);
    state.totalPages++;
    state.pageStats[state.totalPages] = {
      correctCount: 0,
      totalAttempts: 0,
      reactionTime: null,
      operationTimes: [],
      pageEnterTime: null,
      firstImageClickTime: null,
      imageClickTimes: {},
      pageTotalOperationTime: null
    };
  } else if (availablePairs.length > 0) {
    state.pages.push(availablePairs);
    state.totalPages++;
    state.pageStats[state.totalPages] = {
      correctCount: 0,
      totalAttempts: 0,
      reactionTime: null,
      operationTimes: [],
      pageEnterTime: null,
      firstImageClickTime: null,
      imageClickTimes: {},
      pageTotalOperationTime: null
    };
  }
}

function showStatsModal() {
  const pageStats = state.pageStats[state.currentPage];
  
  // 计算页面总操作时间
  pageStats.pageTotalOperationTime = pageStats.operationTimes.length > 0
    ? pageStats.operationTimes.reduce((a, b) => a + b, 0)
    : 0;
  
  // 标记该页面已完成
  state.completedPages++;
  
  // 根据 stats 参数决定是否显示统计界面
  if (gameParams.stats === 0) {
    // stats=0：显示简单完成提示
    showSimpleCompleteModal();
    return;
  }
  
  // stats=1：显示技术统计弹窗
  document.getElementById('statCorrectTotal').textContent = `${pageStats.correctCount}/${pageStats.totalAttempts}`;
  
  const accuracy = pageStats.totalAttempts > 0 
    ? Math.round((pageStats.correctCount / pageStats.totalAttempts) * 100) 
    : 0;
  document.getElementById('statAccuracy').textContent = `${accuracy}%`;
  
  const reactionTime = pageStats.reactionTime 
    ? (pageStats.reactionTime / 1000).toFixed(1) 
    : '0';
  document.getElementById('statReactionTime').textContent = `${reactionTime}s`;
  
  const avgOperationTime = pageStats.operationTimes.length > 0
    ? (pageStats.operationTimes.reduce((a, b) => a + b, 0) / pageStats.operationTimes.length / 1000).toFixed(1)
    : '0';
  document.getElementById('statOperationTime').textContent = `${avgOperationTime}s`;
  
  const progressMessage = document.getElementById('progressMessage');
  if (state.previousPageReactionTime !== null && pageStats.reactionTime !== null) {
    if (pageStats.reactionTime < state.previousPageReactionTime) {
      progressMessage.textContent = '✨ 你做得比上次匹配更好！';
    } else {
      progressMessage.textContent = '💪 还能进步，加油';
    }
    progressMessage.style.display = 'block';
  } else {
    progressMessage.style.display = 'none';
  }
  
  state.previousPageReactionTime = pageStats.reactionTime;
  
  document.getElementById('statsModal').classList.add('active');
  
  saveGameHistory(pageStats, accuracy, reactionTime, avgOperationTime);
  
  const closeBtn = document.getElementById('statsModalCloseBtn');
  closeBtn.replaceWith(closeBtn.cloneNode(true));
  document.getElementById('statsModalCloseBtn').addEventListener('click', function onClose() {
    document.getElementById('statsModal').classList.remove('active');
    
    if (state.currentPage < state.totalPages) {
      state.currentPage++;
    } else {
      const usedIds = state.pages.flat().map(p => p.id);
      const availablePairs = wordImagePairs.filter(p => !usedIds.includes(p.id));
      if (availablePairs.length > 0) {
        addMorePage();
        state.currentPage = state.totalPages;
      } else {
        // 所有配对完成，发送游戏数据
        collectAndSendGameData();
        alert('恭喜！所有词语已配对完毕！');
        return;
      }
    }
    
    state.selectedImage = null;
    renderCurrentPage();
  });
}

// 显示简单完成提示（stats=0 时使用）
function showSimpleCompleteModal() {
  const modal = document.getElementById('modal');
  const message = document.getElementById('modal-message');
  const btn = document.getElementById('modal-btn');
  
  message.textContent = '恭喜完成！';
  
  // 移除旧的点击事件
  btn.replaceWith(btn.cloneNode(true));
  
  // 添加新的点击事件：重新开始游戏
  document.getElementById('modal-btn').addEventListener('click', function() {
    modal.style.display = 'none';
    modal.classList.remove('active');
    
    // 检查是否所有页面都已完成
    if (state.currentPage >= state.totalPages) {
      // 发送数据并重新开始
      collectAndSendGameData();
      resetGame();
      renderCurrentPage();
    } else {
      // 继续下一个页面
      state.currentPage++;
      state.selectedImage = null;
      renderCurrentPage();
    }
  });
  
  modal.style.display = 'flex';
  setTimeout(() => {
    modal.classList.add('active');
  }, 10);
}

function saveGameHistory(pageStats, accuracy, reactionTime, avgOperationTime) {
  const history = JSON.parse(localStorage.getItem('matchGameHistory') || '[]');
  
  const record = {
    date: new Date().toLocaleString('zh-CN'),
    correctTotal: `${pageStats.correctCount}/${pageStats.totalAttempts}`,
    accuracy: `${accuracy}%`,
    reactionTime: `${reactionTime}s`,
    operationTime: `${avgOperationTime}s`,
    stars: getStarRating()
  };
  
  history.unshift(record);
  
  if (history.length > 50) {
    history.pop();
  }
  
  localStorage.setItem('matchGameHistory', JSON.stringify(history));
}

// 发送游戏数据（符合游戏制作规范 V1.0）
function collectAndSendGameData() {
  // userId：长整型，从 URL 参数获取，默认 0
  const userId = window.urlParams.userId || 0;
  
  // gameId：长整型，从 URL 参数获取，默认 0
  const gameId = window.urlParams.gameId || 0;
  
  // game：固定为 "ABLLS_Q5"
  const game = 'ABLLS_Q5';
  
  // difficulty：从 URL 参数获取，默认 1
  const difficulty = gameParams.difficulty || 1;
  
  // levels：从 URL 参数获取，默认根据 difficulty 设置
  const levels = gameParams.levels || (difficulty === 1 ? 1 : difficulty === 2 ? 2 : difficulty === 3 ? 5 : 10);
  
  // 计算 accuracy：正确完成的关卡数 / 总关卡数
  // 正确完成的关卡 = 所有图片都已匹配的页面数
  let completedCount = 0;
  const completedPageCount = state.completedPages;
  
  // 计算所有已完成页面的统计数据
  const reactionTime = [];
  const operationTime = [];
  const totalTime = [];
  
  for (let i = 1; i <= levels; i++) {
    const pageStat = state.pageStats[i];
    if (pageStat) {
      // 检查该页面是否完成（所有图片都已匹配）
      const pageData = state.pages[i - 1];
      if (pageData && pageData.every(pair => state.matchedPairs.includes(pair.id))) {
        completedCount++;
      }
      
      // reactionTime：整数，无反应时间则为 -1
      if (pageStat.reactionTime && pageStat.reactionTime > 0) {
        reactionTime.push(Math.round(pageStat.reactionTime));
      } else {
        reactionTime.push(-1);
      }
      
      // operationTime：整数，无操作时间则为 -1
      if (pageStat.pageTotalOperationTime && pageStat.pageTotalOperationTime > 0) {
        operationTime.push(Math.round(pageStat.pageTotalOperationTime));
      } else {
        operationTime.push(-1);
      }
      
      // totalTime：反应时间 + 操作时间
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
    } else {
      // 该页面未进行，填充 -1
      reactionTime.push(-1);
      operationTime.push(-1);
      totalTime.push(-1);
    }
  }
  
  // accuracy：正确完成的关卡数 / 总关卡数
  const accuracy = levels > 0 ? completedCount / levels : 0;
  
  // gameTime：从游戏开始到最后一个关卡结束的毫秒数
  const gameTime = state.gameStartTime ? Math.round(Date.now() - state.gameStartTime) : 0;
  
  // timestamp：ISO 8601 格式 UTC 时间
  const timestamp = new Date().toISOString();
  
  // 构建数据对象
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
  
  // 调用 api.js 中的 sendGameData 函数
  if (typeof sendGameData === 'function') {
    sendGameData(gameData);
  }
}

function showMenuScreen() {
  document.getElementById('menuScreen').classList.add('active');
  document.getElementById('tableScreen').style.display = 'none';
  document.getElementById('gameScreen').classList.remove('active');
}

function showGameScreen() {
  document.getElementById('menuScreen').classList.remove('active');
  document.getElementById('tableScreen').style.display = 'none';
  document.getElementById('gameScreen').classList.add('active');
  
  resetGame();
  renderCurrentPage();
}

function pauseGame() {
  state.isPaused = true;
  document.getElementById('pauseModal').classList.add('active');
}

function resumeGame() {
  state.isPaused = false;
  document.getElementById('pauseModal').classList.remove('active');
}

function resetGame() {
  state.currentPage = 1;
  state.totalPages = gameParams.levels;  // 使用 levels 设置总页数
  state.matchedPairs = [];
  state.selectedImage = null;
  state.isPaused = false;
  state.isProcessing = false;
  state.previousPageReactionTime = null;
  state.gameStartTime = Date.now();
  state.completedPages = 0;
  
  initializePages();
}

function restartGame() {
  if (confirm('确定要重新开始游戏吗？')) {
    resetGame();
    renderCurrentPage();
  }
}

function exitGame() {
  // 退出前发送游戏数据
  collectAndSendGameData();
  document.getElementById('pauseModal').classList.remove('active');
  document.getElementById('statsModal').classList.remove('active');
  showMenuScreen();
}

document.addEventListener('DOMContentLoaded', () => {
  initializePages();
  
  showMenuScreen();
  
  document.getElementById('startGameBtn').addEventListener('click', showGameScreen);
  
  document.getElementById('table').addEventListener('click', showGameScreen);
  document.getElementById('backBtn').addEventListener('click', showMenuScreen);
  document.getElementById('prevBtn').addEventListener('click', goToPrevPage);
  document.getElementById('nextBtn').addEventListener('click', goToNextPage);
  
  document.getElementById('pauseBtn').addEventListener('click', pauseGame);
  document.getElementById('restartBtn').addEventListener('click', restartGame);
  document.getElementById('exitBtn').addEventListener('click', exitGame);
  
  document.getElementById('resumeBtn').addEventListener('click', resumeGame);
  document.getElementById('pauseExitBtn').addEventListener('click', exitGame);
});

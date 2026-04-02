﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿// 解析 URL 参数
function parseUrlParams() {
  const queryParams = new URLSearchParams(window.location.search);
  
  // 解析 difficulty，默认 1，范围 [1,2,3,4]
  let difficulty = parseInt(queryParams.get('difficulty'));
  if (isNaN(difficulty) || difficulty < 1 || difficulty > 4) {
    difficulty = 1;
  }
  
  // 解析 levels，根据 difficulty 自动设置
  let levels = parseInt(queryParams.get('levels'));
  if (isNaN(levels) || levels < 1) {
    // 根据 difficulty 设置默认 levels
    if (difficulty === 1) levels = 1;
    else if (difficulty === 2) levels = 2;
    else if (difficulty === 3) levels = 5;
    else if (difficulty === 4) levels = 10;
    else levels = 1; // 保底
  }
  
  // 解析 stats，默认 1
  let stats = parseInt(queryParams.get('stats'));
  if (isNaN(stats) || (stats !== 0 && stats !== 1)) {
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

// 难度等级与星星数映射（基于已匹配对数）
const DIFFICULTY_THRESHOLDS = {
  1: 0,    // 难度1（0星）
  2: 2,    // 难度2（1星）达到2个配对
  3: 5,    // 难度3（2星）达到5个配对
  4: 10    // 难度4（3星）达到10个配对
};

// 根据当前难度获取总关卡数
function getTotalLevelsForDifficulty(difficulty) {
  if (difficulty === 1) return 1;
  if (difficulty === 2) return 2;
  if (difficulty === 3) return 5;
  if (difficulty === 4) return 10;
  return 1;
}

// 检查是否达到新的难度等级（根据星星数即时升级）
function checkDifficultyUpgrade() {
  // 如果难度锁定，直接返回 false（不再自动升级）
  if (state.isDifficultyLocked) return false;
  
  const currentStars = getStarRating();  // 0-4
  const achievedDifficulty = currentStars === 0 ? 1 : currentStars + 1;
  
  // 如果达到更高难度，立即升级
  if (achievedDifficulty > gameParams.difficulty) {
    gameParams.difficulty = achievedDifficulty;
    return true;
  }
  return false;
}

let state = {
  currentPage: 1,
  totalPages: 0,
  matchedPairs: [],
  wrongPairs: [],  // 记录配对错误的图片 ID
  pages: [],
  selectedImage: null,
  isPaused: false,
  isProcessing: false,
  pageStats: {},
  previousPageReactionTime: null,
  gameStartTime: null,
  completedPages: 0,
  prevStarRating: 0,
  uploadedDifficulty: 0,
  completedLevelsInCurrentDifficulty: 0,  // 记录当前难度已完成的关卡数
  lastStarRating: 0,  // 记录上次上报时的星级，用于检测星级提升
  isDifficultyLocked: false,  // 是否锁定难度
  targetPairs: 0,  // 目标配对数量
  isGameComplete: false  // 游戏是否已完成（防止重复调用 gameComplete）
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
      pageTotalOperationTime: null,
      pageEndTime: null  // 页面结束时间
    };
  }
}

function getStarRating() {
  // 如果难度锁定，根据是否完成目标返回星级
  if (state.isDifficultyLocked) {
    const lockedDifficulty = gameParams.difficulty;
    // 难度锁定时，未完成目标前显示 targetDifficulty - 1，完成后显示 targetDifficulty
    if (state.matchedPairs.length >= state.targetPairs) {
      return lockedDifficulty;  // 已完成目标，返回目标难度
    } else {
      return Math.max(0, lockedDifficulty - 1);  // 未完成，返回目标难度 - 1
    }
  }
  
  // 否则原有动态计算逻辑
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

function updateTargetCompleted() {
  if (state.isDifficultyLocked) {
    document.getElementById('target-completed').textContent = state.matchedPairs.length;
  }
}

function isPageComplete(pageNum) {
  const pageData = state.pages[pageNum - 1];
  // 页面完成条件：所有图片都已匹配或标记为错误
  return pageData.every(pair => 
    state.matchedPairs.includes(pair.id) || state.wrongPairs.includes(pair.id)
  );
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
  
  // 自动选中第一个未匹配且未标记为错误的图片
  if (!state.selectedImage) {
    const firstUnmatchedPair = currentPageData.find(pair => 
      !state.matchedPairs.includes(pair.id) && !state.wrongPairs.includes(pair.id)
    );
    if (firstUnmatchedPair) {
      state.selectedImage = firstUnmatchedPair.id;
    }
  }
  
  currentPageData.forEach((pair) => {
    const isMatched = state.matchedPairs.includes(pair.id);
    const isWrong = state.wrongPairs.includes(pair.id);
    const isSelected = state.selectedImage === pair.id;
    
    const card = document.createElement('div');
    card.className = `image-card ${isMatched ? 'matched' : ''} ${isWrong ? 'wrong' : ''} ${isSelected ? 'selected' : ''}`;
    card.dataset.pairId = pair.id;
    
    const imageDisplay = document.createElement('div');
    imageDisplay.className = 'image-display';
    imageDisplay.textContent = pair.icon;
    
    card.appendChild(imageDisplay);
    
    const optionsContainer = document.createElement('div');
    optionsContainer.className = `word-options-container ${isSelected ? 'active' : ''}`;
    optionsContainer.id = `options-${pair.id}`;
    
    if (isSelected && !isMatched && !isWrong) {
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
    
    card.appendChild(optionsContainer);
    imagesGrid.appendChild(card);
  });
  
  updatePageInfo();
  updateNavigationButtons();
  updateScoreDisplay();
}

function handleWordSelection(pairId, selectedWord) {
  if (state.isPaused) return;
  
  const pair = wordImagePairs.find(p => p.id === pairId);
  
  if (!pair) return;
  
  const pageStats = state.pageStats[state.currentPage];
  pageStats.totalAttempts++;
  
  // 如果是本页面的第一次选择，记录反应时间
  if (!pageStats.firstImageClickTime) {
    pageStats.firstImageClickTime = Date.now();
    pageStats.reactionTime = pageStats.firstImageClickTime - pageStats.pageEnterTime;
  }
  
  // 记录当前图片的点击时间（用于计算操作时间）
  if (!pageStats.imageClickTimes[pairId]) {
    pageStats.imageClickTimes[pairId] = Date.now();
  }
  
  const optionsContainer = document.getElementById(`options-${pairId}`);
  const optionButtons = optionsContainer.querySelectorAll('.word-option');
  
  optionButtons.forEach(btn => {
    if (btn.textContent === pair.word) {
      btn.classList.add('correct');
    } else if (btn.textContent === selectedWord) {
      btn.classList.add('wrong');
    }
  });
  
  // 无论对错，都立即处理并标记为已处理
  state.isProcessing = true;
  
  if (pageStats.imageClickTimes[pairId]) {
    const operationTime = Date.now() - pageStats.imageClickTimes[pairId];
    pageStats.operationTimes.push(operationTime);
  }
  
  setTimeout(() => {
    if (selectedWord === pair.word) {
      pageStats.correctCount++;
      state.matchedPairs.push(pairId);
      updateTargetCompleted();
      
      if (state.isDifficultyLocked && state.matchedPairs.length >= state.targetPairs) {
        // 清空选中，自动选中下一个未处理的图片
        state.selectedImage = null;
        state.isProcessing = false;
        renderCurrentPage();
        gameComplete();
        return;
      }
    } else {
      // 错误：标记为错误，不再允许选择
      state.wrongPairs.push(pairId);
    }
    
    // 清空选中，自动选中下一个未处理的图片
    state.selectedImage = null;
    state.isProcessing = false;
    renderCurrentPage();
    
    // 检查页面是否完成（所有图片都已匹配或标记为错误）
    if (isPageComplete(state.currentPage)) {
      showStatsModal();
    }
  }, 800);
}

function goToPrevPage() {
  if (state.currentPage > 1 && !state.isPaused) {
    state.currentPage--;
    state.selectedImage = null;  // 重置选中，让上一页自动选中第一个
    renderCurrentPage();
  }
}

function goToNextPage() {
  if (state.currentPage < state.totalPages && isPageComplete(state.currentPage) && !state.isPaused) {
    state.currentPage++;
    state.selectedImage = null;  // 重置选中，让下一页自动选中第一个
    renderCurrentPage();
  } else if (state.currentPage >= state.totalPages && isPageComplete(state.currentPage) && !state.isPaused) {
    // 已经是最后一页且已完成，添加新页面
    addMorePage();
    state.currentPage++;
    state.selectedImage = null;
    renderCurrentPage();
  }
}

function addMorePage() {
  // 如果难度锁定且达到目标配对数量，直接返回，不再添加新页面
  if (state.isDifficultyLocked && state.matchedPairs.length >= state.targetPairs) {
    return;
  }
  
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
      pageTotalOperationTime: null,
      pageEndTime: null
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
      pageTotalOperationTime: null,
      pageEndTime: null
    };
  } else {
    // 所有配对都已使用，重新开始循环使用所有配对
    const shuffledAll = shuffleArray(wordImagePairs);
    const newPage = shuffledAll.slice(0, 3);
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
      pageTotalOperationTime: null,
      pageEndTime: null
    };
  }
}

function showStatsModal(showCelebration = false) {
  const pageStats = state.pageStats[state.currentPage];
  
  // 记录页面结束时间
  const pageEndTime = Date.now();
  pageStats.pageEndTime = pageEndTime;
  
  // 计算操作时间：从页面首次点击到页面结束的总时间
  if (pageStats.firstImageClickTime && pageStats.pageEndTime) {
    pageStats.pageTotalOperationTime = pageStats.pageEndTime - pageStats.firstImageClickTime;
  } else {
    pageStats.pageTotalOperationTime = 0;
  }
  
  state.completedPages++;
  state.completedLevelsInCurrentDifficulty++;  // 增加当前难度已完成关卡计数
  
  // 检查是否达到新的难度等级
  const difficultyUpgraded = checkDifficultyUpgrade();
  
  // 进度消息：根据是否升级难度显示不同消息
  const progressMessage = document.getElementById('progressMessage');
  
  // 难度锁定时，只在完成所有任务时显示庆祝
  if (state.isDifficultyLocked) {
    const isFinalComplete = (state.matchedPairs.length >= state.targetPairs);
    if (isFinalComplete) {
      progressMessage.textContent = '🎉 恭喜！你完成了这一难度的所有关卡！';
      progressMessage.style.color = '#4CAF50';
      progressMessage.style.fontWeight = 'bold';
      progressMessage.style.fontSize = '1.1em';
      progressMessage.style.display = 'block';
    } else {
      progressMessage.style.display = 'none';
    }
  } else if (difficultyUpgraded) {
    progressMessage.textContent = '🎉 恭喜！你完成了这一难度的所有关卡！';
    progressMessage.style.color = '#4CAF50';
    progressMessage.style.fontWeight = 'bold';
    progressMessage.style.fontSize = '1.1em';
    progressMessage.style.display = 'block';
  } else if (state.previousPageReactionTime !== null && pageStats.reactionTime !== null) {
    if (pageStats.reactionTime < state.previousPageReactionTime) {
      progressMessage.textContent = '✨ 你做得比上次匹配更好！';
      progressMessage.style.color = '';
      progressMessage.style.fontWeight = '';
      progressMessage.style.fontSize = '';
    } else {
      progressMessage.textContent = '💪 还能进步，加油';
      progressMessage.style.color = '';
      progressMessage.style.fontWeight = '';
      progressMessage.style.fontSize = '';
    }
  } else {
    progressMessage.style.display = 'none';
  }
  
  state.previousPageReactionTime = pageStats.reactionTime;
  
  // 难度锁定时，只在完成所有任务时显示庆祝
  let shouldShowCelebration = false;
  if (state.isDifficultyLocked) {
    shouldShowCelebration = (state.matchedPairs.length >= state.targetPairs);
  } else {
    shouldShowCelebration = difficultyUpgraded;
  }
  
  // 根据 stats 参数和是否显示庆祝决定显示哪个弹窗
  if (gameParams.stats === 0) {
    showSimpleCompleteModal(shouldShowCelebration);
    return;
  }
  
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
  
  document.getElementById('statsModal').classList.add('active');
  
  saveGameHistory(pageStats, accuracy, reactionTime, avgOperationTime);
  
  const closeBtn = document.getElementById('statsModalCloseBtn');
  closeBtn.replaceWith(closeBtn.cloneNode(true));
  document.getElementById('statsModalCloseBtn').addEventListener('click', function onClose() {
    document.getElementById('statsModal').classList.remove('active');
    
    // 难度锁定时，只在完成所有任务时上报数据
    if (state.isDifficultyLocked) {
      const isFinalComplete = (state.matchedPairs.length >= state.targetPairs);
      if (isFinalComplete && !state.uploadedDifficulty) {
        collectAndSendGameData();
        state.uploadedDifficulty = 1;  // 标记已上报
      }
    } else {
      // 非锁定难度，按原逻辑处理
      const currentStars = getStarRating();
      const starUpgraded = currentStars > state.lastStarRating;
      
      // 如果星级提升，立即上报数据
      if (starUpgraded) {
        collectAndSendGameData();
        state.lastStarRating = currentStars;
      }
      
      // 如果本次星级提升后达到 4 星（最高难度），游戏结束
      if (starUpgraded && currentStars === 4) {
        // 显示游戏完成提示
        alert('🎉 恭喜你完成了所有难度！游戏结束！');
        // 返回菜单
        exitGame();
        return;
      }
    }
    
    // 否则继续游戏
    // 检查是否需要添加新页面
    if (state.currentPage >= state.totalPages) {
      // 完成所有预设关卡，自动添加新关卡
      addMorePage();
    }
    
    // 前进到下一页
    if (state.currentPage < state.totalPages) {
      state.currentPage++;
    }
    
    state.selectedImage = null;
    renderCurrentPage();
  });
}

function showSimpleCompleteModal(showCelebration = false) {
  const modal = document.getElementById('modal');
  const message = document.getElementById('modal-message');
  const btn = document.getElementById('modal-btn');
  
  if (showCelebration) {
    message.textContent = '🎉 恭喜！你完成了这一难度的所有关卡！';
  } else {
    message.textContent = '恭喜完成！';
  }
  
  btn.replaceWith(btn.cloneNode(true));
  
  document.getElementById('modal-btn').addEventListener('click', function() {
    modal.style.display = 'none';
    modal.classList.remove('active');
    
    // 难度锁定时，只在完成所有任务时上报数据
    if (state.isDifficultyLocked) {
      const isFinalComplete = (state.matchedPairs.length >= state.targetPairs);
      if (isFinalComplete && !state.uploadedDifficulty) {
        collectAndSendGameData();
        state.uploadedDifficulty = 1;  // 标记已上报
      }
    } else {
      // 非锁定难度，按原逻辑处理
      const currentStars = getStarRating();
      
      // 如果星级提升，立即上报数据
      if (currentStars > state.lastStarRating) {
        collectAndSendGameData();
        state.lastStarRating = currentStars;
      }
    }
    
    // 检查是否需要添加新页面
    if (state.currentPage >= state.totalPages) {
      // 完成所有预设关卡，自动添加新关卡
      addMorePage();
    }
    
    // 前进到下一页
    if (state.currentPage < state.totalPages) {
      state.currentPage++;
    }
    
    state.selectedImage = null;
    renderCurrentPage();
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

function collectAndSendGameData() {
  const userId = window.urlParams.userId || 0;
  const gameId = window.urlParams.gameId || 0;
  const game = 'ABLLS_Q5';
  // 难度锁定时，difficulty 始终为锁定值；否则根据星星数计算
  const difficulty = state.isDifficultyLocked ? gameParams.difficulty : (getStarRating() === 0 ? 1 : getStarRating());
  // 使用实际完成的页面数作为 levels
  const levels = state.completedPages;
  
  let totalCorrect = 0;
  let totalAttempts = 0;
  Object.values(state.pageStats).forEach(s => {
    totalCorrect += s.correctCount || 0;
    totalAttempts += s.totalAttempts || 0;
  });
  const accuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;
  
  const reactionTime = [];
  const operationTime = [];
  const totalTime = [];
  
  // 遍历所有已完成的页面
  for (let i = 1; i <= levels; i++) {
    const pageStat = state.pageStats[i];
    if (pageStat) {
      if (pageStat.reactionTime && pageStat.reactionTime > 0) {
        reactionTime.push(Math.round(pageStat.reactionTime));
      } else {
        reactionTime.push(-1);
      }
      
      if (pageStat.pageTotalOperationTime && pageStat.pageTotalOperationTime > 0) {
        operationTime.push(Math.round(pageStat.pageTotalOperationTime));
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
  
  const gameTime = state.gameStartTime ? Math.round(Date.now() - state.gameStartTime) : 0;
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
  
  let totalPages = gameParams.levels;
  if (isNaN(totalPages) || totalPages < 1) {
    totalPages = 1;
  }
  state.totalPages = totalPages;
  
  state.matchedPairs = [];
  state.wrongPairs = [];  // 重置错误标记
  state.selectedImage = null;
  state.isPaused = false;
  state.isProcessing = false;
  state.previousPageReactionTime = null;
  state.gameStartTime = Date.now();
  state.completedPages = 0;
  state.prevStarRating = 0;
  state.uploadedDifficulty = 0;
  state.completedLevelsInCurrentDifficulty = 0;  // 重置当前难度已完成关卡计数
  state.lastStarRating = 0;  // 重置上次上报时的星级
  state.isGameComplete = false;  // 重置游戏完成标志
  
  // 检查 URL 是否指定了 difficulty（且为有效值），如果是则锁定难度
  const urlDifficulty = parseInt(new URLSearchParams(window.location.search).get('difficulty'));
  state.isDifficultyLocked = !isNaN(urlDifficulty) && urlDifficulty >= 1 && urlDifficulty <= 4;
  
  // 如果难度锁定，设置目标配对数量
  if (state.isDifficultyLocked) {
    const lockedDifficulty = gameParams.difficulty;
    if (lockedDifficulty === 1) {
      state.targetPairs = 2;
    } else if (lockedDifficulty === 2) {
      state.targetPairs = 5;
    } else if (lockedDifficulty === 3) {
      state.targetPairs = 10;
    } else if (lockedDifficulty === 4) {
      state.targetPairs = 20;
    }
  } else {
    state.targetPairs = Infinity;
  }
  
  if (state.isDifficultyLocked) {
    document.getElementById('target-info').style.display = 'inline';
    document.getElementById('target-total').textContent = state.targetPairs;
    updateTargetCompleted();
  } else {
    document.getElementById('target-info').style.display = 'none';
  }
  
  initializePages();
}

function restartGame() {
  if (confirm('确定要重新开始游戏吗？')) {
    resetGame();
    renderCurrentPage();
  }
}

function gameComplete() {
  if (state.isGameComplete) return;
  
  state.isGameComplete = true;
  state.isProcessing = true;
  
  collectAndSendGameData();
  
  setTimeout(() => {
    alert('🎉 恭喜你完成了所有难度！游戏结束！');
    showMenuScreen();
  }, 500);
}

function exitGame() {
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
// demo/counting-R5/stats.js

const Stats = {
    currentSession: {
        rounds: []
    },

    init: function() {
        this.currentSession.rounds = [];
    },

    startNewRound: function() {
        const round = {
            roundIndex: this.currentSession.rounds.length,
            startTime: 0,
            firstClickTime: 0,
            endTime: 0,
            reactionTime: -1,
            operationTime: -1,
            correctCount: 0,
            totalAttempts: 0
        };
        this.currentSession.rounds.push(round);
    },

    onCurtainOpen: function() {
        const currentRound = this.getCurrentRound();
        if (currentRound) {
            currentRound.startTime = Date.now();
        }
    },

    onItemDragStart: function() {
        const currentRound = this.getCurrentRound();
        if (currentRound && currentRound.firstClickTime === 0) {
            currentRound.firstClickTime = Date.now();
            if (currentRound.startTime > 0) {
                currentRound.reactionTime = currentRound.firstClickTime - currentRound.startTime;
            }
        }
    },

    onItemDrop: function(isTarget) {
        const currentRound = this.getCurrentRound();
        if (!currentRound) return;

        if (currentRound.firstClickTime === 0) {
            this.onItemDragStart();
        }

        currentRound.totalAttempts++;
        if (isTarget) {
            currentRound.correctCount++;
        }
    },

    handleRoundComplete: function() {
        const currentRound = this.getCurrentRound();
        if (currentRound) {
            currentRound.endTime = Date.now();
            if (currentRound.firstClickTime > 0) {
                currentRound.operationTime = currentRound.endTime - currentRound.firstClickTime;
            } else {
                currentRound.operationTime = -1;
            }
        }
    },

    getCurrentRound: function() {
        return this.currentSession.rounds[this.currentSession.rounds.length - 1];
    },

    getAllRoundsData: function() {
        const reaction_time = [];
        const operation_time = [];
        const total_time = [];
        let totalCorrect = 0;
        let totalAttempts = 0;

        this.currentSession.rounds.forEach(round => {
            reaction_time.push(round.reactionTime);
            operation_time.push(round.operationTime);
            
            let total = -1;
            if (round.reactionTime !== -1 || round.operationTime !== -1) {
                total = (round.reactionTime === -1 ? 0 : round.reactionTime) + 
                        (round.operationTime === -1 ? 0 : round.operationTime);
            }
            total_time.push(total);

            totalCorrect += round.correctCount;
            totalAttempts += round.totalAttempts;
        });

        return {
            reaction_time,
            operation_time,
            total_time,
            totalCorrect,
            totalAttempts,
            levels: this.currentSession.rounds.length
        };
    },

    formatTime: function(ms) {
        if (ms === -1) return '--';
        return (ms / 1000).toFixed(2) + 's';
    },

    getHistory: function() {
        return JSON.parse(localStorage.getItem('countingR5History') || '[]');
    },

    clearHistory: function() {
        localStorage.removeItem('countingR5History');
    }
};

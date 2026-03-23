const Animation = {
    createConfetti: function(element) {
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
        const container = element;
        
        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 2 + 's';
            container.appendChild(confetti);
        }

        setTimeout(() => {
            const confettiElements = container.querySelectorAll('.confetti');
            confettiElements.forEach(el => el.remove());
        }, GameConfig.confettiDuration);
    },

    shakeBasket: function(basket) {
        basket.classList.add('shake');
        setTimeout(() => {
            basket.classList.remove('shake');
        }, GameConfig.shakeDuration);
    },

    flashBorder: function() {
        document.body.classList.add('flash-border');
        setTimeout(() => {
            document.body.classList.remove('flash-border');
        }, GameConfig.flashDuration);
    },

    animateCurtain: function(curtain, isClosing, callback) {
        if (isClosing) {
            curtain.classList.remove('curtain-open');
            curtain.classList.add('curtain-close');
        } else {
            curtain.classList.remove('curtain-close');
            curtain.classList.add('curtain-open');
        }

        setTimeout(callback, GameConfig.curtainDuration);
    },

    showModal: function(element) {
        element.style.display = 'flex';
        setTimeout(() => {
            element.classList.add('show');
        }, 10);
    },

    hideModal: function(element, callback) {
        element.classList.remove('show');
        setTimeout(() => {
            element.style.display = 'none';
            if (callback) callback();
        }, 300);
    },

    bounceItem: function(item, fromX, fromY, toX, toY) {
        const startX = fromX;
        const startY = fromY;
        const endX = toX;
        const endY = toY;
        
        let startTime = null;
        const duration = 500;

        function animate(timestamp) {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const easeOutBounce = function(t) {
                const n1 = 7.5625;
                const d1 = 2.75;
                
                if (t < 1 / d1) {
                    return n1 * t * t;
                } else if (t < 2 / d1) {
                    return n1 * (t -= 1.5 / d1) * t + 0.75;
                } else if (t < 2.5 / d1) {
                    return n1 * (t -= 2.25 / d1) * t + 0.9375;
                } else {
                    return n1 * (t -= 2.625 / d1) * t + 0.984375;
                }
            };

            const y = startY + (endY - startY) * easeOutBounce(progress);
            const x = startX + (endX - startX) * progress;

            item.style.left = x + 'px';
            item.style.top = y + 'px';

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        }

        requestAnimationFrame(animate);
    }
};
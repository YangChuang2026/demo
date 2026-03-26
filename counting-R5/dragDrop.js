const DragDrop = {
    init: function(basket, onDrop) {
        this.basket = basket;
        this.onDrop = onDrop;
        this.draggedItem = null;
        this.offsetX = 0;
        this.offsetY = 0;
        this.originalX = 0;
        this.originalY = 0;
        this.originalParent = null;
        this.dragStartTime = null;
    },

    makeDraggable: function(item) {
        item.addEventListener('mousedown', this.onMouseDown.bind(this));
        item.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    },

    onMouseDown: function(e) {
        e.preventDefault();
        this.startDrag(e.target, e.clientX, e.clientY);
        
        document.addEventListener('mousemove', this.onMouseMove.bind(this));
        document.addEventListener('mouseup', this.onMouseUp.bind(this));
    },

    onTouchStart: function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.startDrag(e.target, touch.clientX, touch.clientY);
        
        document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
        document.addEventListener('touchend', this.onTouchEnd.bind(this));
    },

    startDrag: function(item, clientX, clientY) {
        this.draggedItem = item;
        this.originalParent = item.parentElement;
        this.originalX = item.offsetLeft;
        this.originalY = item.offsetTop;
        this.dragStartTime = Date.now();
        
        const rect = item.getBoundingClientRect();
        this.offsetX = clientX - rect.left;
        this.offsetY = clientY - rect.top;

        item.classList.add('dragging');
        item.style.position = 'fixed';
        item.style.zIndex = '1000';
        item.style.left = (clientX - this.offsetX) + 'px';
        item.style.top = (clientY - this.offsetY) + 'px';
        document.body.appendChild(item);
        
        Stats.onItemDragStart();
    },

    onMouseMove: function(e) {
        this.moveItem(e.clientX, e.clientY);
    },

    onTouchMove: function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this.moveItem(touch.clientX, touch.clientY);
    },

    moveItem: function(clientX, clientY) {
        if (!this.draggedItem) return;
        
        this.draggedItem.style.left = (clientX - this.offsetX) + 'px';
        this.draggedItem.style.top = (clientY - this.offsetY) + 'px';
    },

    onMouseUp: function(e) {
        this.endDrag(e.clientX, e.clientY);
        document.removeEventListener('mousemove', this.onMouseMove.bind(this));
        document.removeEventListener('mouseup', this.onMouseUp.bind(this));
    },

    onTouchEnd: function(e) {
        const touch = e.changedTouches[0];
        this.endDrag(touch.clientX, touch.clientY);
        document.removeEventListener('touchmove', this.onTouchMove.bind(this));
        document.removeEventListener('touchend', this.onTouchEnd.bind(this));
    },

    endDrag: function(clientX, clientY) {
        if (!this.draggedItem) return;
        
        const item = this.draggedItem;
        item.classList.remove('dragging');

        const basketRect = this.basket.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();
        
        const isInBasket = (
            itemRect.left < basketRect.right &&
            itemRect.right > basketRect.left &&
            itemRect.top < basketRect.bottom &&
            itemRect.bottom > basketRect.top
        );

        if (isInBasket) {
            this.onDrop(item, this.originalParent, this.dragStartTime);
        } else {
            this.returnItemToOriginalPosition(item);
        }

        this.draggedItem = null;
        this.dragStartTime = null;
    },

    returnItemToOriginalPosition: function(item) {
        item.style.position = '';
        item.style.zIndex = '';
        item.style.left = '';
        item.style.top = '';
        // 如果有原始坐标，恢复到原始位置
        if (this.originalX !== undefined && this.originalY !== undefined) {
            item.style.left = this.originalX + 'px';
            item.style.top = this.originalY + 'px';
        }
        this.originalParent.appendChild(item);
    },

    placeItemInBasket: function(item) {
        item.remove();
    },

    ejectItem: function(item, originalParent) {
        const basketRect = this.basket.getBoundingClientRect();
        const itemRect = item.getBoundingClientRect();
        
        const startX = itemRect.left;
        const startY = itemRect.top;
        const endX = Math.random() * (window.innerWidth - 100);
        const endY = Math.random() * (window.innerHeight - 300 - 100);

        item.style.position = 'fixed';
        item.style.left = startX + 'px';
        item.style.top = startY + 'px';
        item.style.zIndex = '1000';
        document.body.appendChild(item);

        Animation.bounceItem(item, startX, startY, endX, endY);

        setTimeout(() => {
            item.style.position = '';
            item.style.zIndex = '';
            item.style.left = '';
            item.style.top = '';
            originalParent.appendChild(item);
        }, 500);
    }
};
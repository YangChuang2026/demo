const GameConfig = {
    difficultyLevels: [
        { name: '初级', maxN: 2 },
        { name: '中级', maxN: 5 },
        { name: '高级', maxN: 7 },
        { name: '专家级', maxN: 10 }
    ],

    rating: {
        fourStar: 30,
        threeStar: 20,
        twoStar: 10,
        oneStar: 2
    },

    itemTypes: {
        targets: [
            { id: 'animal_cat', name: '猫咪', emoji: '🐱', isTarget: true, imgPath: '' },
            { id: 'animal_dog', name: '狗狗', emoji: '🐶', isTarget: true, imgPath: '' },
            { id: 'animal_panda', name: '熊猫', emoji: '🐼', isTarget: true, imgPath: '' },
            { id: 'animal_frog', name: '青蛙', emoji: '🐸', isTarget: true, imgPath: '' },
            { id: 'vehicle_car', name: '汽车', emoji: '🚗', isTarget: true, imgPath: '' },
            { id: 'vehicle_bus', name: '巴士', emoji: '🚌', isTarget: true, imgPath: '' },
            { id: 'vehicle_bike', name: '自行车', emoji: '🚲', isTarget: true, imgPath: '' },
            { id: 'vehicle_plane', name: '飞机', emoji: '✈️', isTarget: true, imgPath: '' },
            { id: 'food_apple', name: '苹果', emoji: '🍎', isTarget: true, imgPath: '' },
            { id: 'food_banana', name: '香蕉', emoji: '🍌', isTarget: true, imgPath: '' },
            { id: 'food_pizza', name: '披萨', emoji: '🍕', isTarget: true, imgPath: '' },
            { id: 'food_icecream', name: '冰淇淋', emoji: '🍦', isTarget: true, imgPath: '' },
            { id: 'block_red', name: '红色积木', emoji: '🔴', isTarget: true, imgPath: '' },
            { id: 'block_blue', name: '蓝色积木', emoji: '🔵', isTarget: true, imgPath: '' },
            { id: 'block_yellow', name: '黄色积木', emoji: '🟡', isTarget: true, imgPath: '' },
            { id: 'block_green', name: '绿色积木', emoji: '🟢', isTarget: true, imgPath: '' }
        ],
        distractor: [
            { id: 'circle', name: '圆形', emoji: '⭕', isTarget: false, imgPath: '' },
            { id: 'star', name: '星星', emoji: '⭐', isTarget: false, imgPath: '' },
            { id: 'heart', name: '心形', emoji: '💗', isTarget: false, imgPath: '' },
            { id: 'triangle', name: '三角形', emoji: '🔺', isTarget: false, imgPath: '' },
            { id: 'diamond', name: '菱形', emoji: '💎', isTarget: false, imgPath: '' },
            { id: 'square', name: '方块', emoji: '▪️', isTarget: false, imgPath: '' },
            { id: 'flower', name: '花朵', emoji: '🌸', isTarget: false, imgPath: '' },
            { id: 'sun', name: '太阳', emoji: '☀️', isTarget: false, imgPath: '' },
            { id: 'moon', name: '月亮', emoji: '🌙', isTarget: false, imgPath: '' },
            { id: 'rainbow', name: '彩虹', emoji: '🌈', isTarget: false, imgPath: '' },
            { id: 'fish', name: '鱼', emoji: '🐟', isTarget: false, imgPath: '' },
            { id: 'bird', name: '鸟', emoji: '🐦', isTarget: false, imgPath: '' }
        ]
    },
    //这里能不能修改成一段时间内只能有一个item的isTarget为真，此时可以有任意distractor

    curtainDuration: 800,
    confettiDuration: 2000,
    shakeDuration: 500,
    flashDuration: 300,

    stats: {
        storageKey: 'countingGameHistory',
        maxHistory: 50
    },

    getItemCount: function(n) {
        const min = Math.min(Math.pow(n, 2), 10 * n);
        const max = Math.max(Math.pow(n - 1, 2), 10 * n);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    getTargetCount: function(n) {
        return n + Math.floor(Math.random() * 3) + 1;
    }
};
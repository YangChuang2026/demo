# 儿童互动游戏训练系统 - Demo

本项目包含三个基于 Web 的儿童互动训练游戏，用于认知能力训练和数据收集。

## 📁 项目结构

```
demo/
├── matching-Q5/          # 图文匹配游戏（图片配对文字）
│   ├── index.html        # 游戏入口
│   ├── script.js         # 游戏主逻辑
│   ├── styles.css        # 样式文件
│   └── data.js           # 词图配对数据
├── Matching_q5/          # 文字配对游戏（文字配对图片）
│   ├── index.html        # 游戏入口
│   ├── script.js         # 游戏主逻辑
│   ├── styles.css        # 样式文件
│   └── data.js           # 词图配对数据（与 matching-Q5 共享）
├── counting-R5/          # 数物品游戏
│   ├── index.html        # 游戏入口
│   ├── script.js         # 游戏主逻辑
│   ├── styles.css        # 样式文件
│   ├── animation.js      # 动画效果
│   ├── dragDrop.js       # 拖拽功能
│   ├── stats.js          # 数据统计
│   └── gameConfig.js     # 游戏配置
├── config.js             # 全局配置（API 地址等）
├── api.js                # 数据上报接口
└── README.md             # 项目说明文档
```

## 🎮 游戏介绍

### 1. 图文匹配游戏 (matching-Q5)

**游戏目标**：训练儿童的图像与词语配对能力

**游戏玩法**：
- 每页显示 3 个图片卡片（如 🐱）
- 点击图片后显示 5 个文字选项（猫、狗、兔子等）
- 选择正确的文字完成配对
- 完成一页后自动进入下一页
- 支持多页内容，根据难度参数动态调整

**训练能力**：
- 词汇理解
- 图像识别
- 手眼协调

### 2. 文字配对游戏 (Matching_q5)

**游戏目标**：训练儿童的词语与图像配对能力（与 matching-Q5 玩法相反）

**游戏玩法**：
- 每页显示 3 个文字卡片（如"猫"）
- 点击文字后显示 5 个图片选项（🐱、🐕、🐰等）
- 选择正确的图片完成配对
- 完成一页后自动进入下一页
- 支持多页内容，根据难度参数动态调整

**训练能力**：
- 词汇理解
- 图像识别
- 手眼协调
- 逆向思维能力

### 3. 数物品游戏 (counting-R5)

**游戏目标**：训练儿童的计数和分类能力

**游戏玩法**：
- 从混合物品中找出指定数量的目标物品
- 拖拽目标物品到篮子中
- 完成指定数量后进入下一回合
- 根据难度动态调整物品数量和种类

**训练能力**：
- 数字概念
- 分类能力
- 精细动作控制

## 🔧 技术特性

### 统一数据格式（游戏制作规范 V1.0）

三个游戏均遵循统一的数据上报格式：

```json
{
  "userId": 0,
  "game": "ABLLS_Q5",
  "gameId": 0,
  "gameResult": {
    "difficulty": 1,
    "levels": 5,
    "accuracy": 0.6,
    "reactionTime": [300, 400, 300, 350, 450],
    "operationTime": [400, 500, 400, 450, 550],
    "totalTime": [700, 900, 700, 800, 1000]
  },
  "gameTime": 4100,
  "timestamp": "2026-03-03T14:25:30.123Z"
}
```

**字段说明**：
- `userId`：用户 ID（长整型）
- `gameId`：游戏 ID（长整型）
- `game`：游戏标识
  - "ABLLS_Q5"：图文匹配游戏 (matching-Q5)
  - "ABLLS_Matching_Q5"：文字配对游戏 (Matching_q5)
  - "ABLLS_R5"：数物品游戏 (counting-R5)
- `difficulty`：难度等级（1-4）
- `levels`：关卡数（根据难度自动设置：1→1, 2→2, 3→5, 4→10）
- `accuracy`：正确率（正确完成关卡数 / 总关卡数）
- `reactionTime`：各关卡反应时间数组（毫秒）
- `operationTime`：各关卡操作时间数组（毫秒）
- `totalTime`：各关卡总时间数组（毫秒）
- `gameTime`：游戏总时长（毫秒）
- `timestamp`：UTC 时间戳（ISO 8601 格式）

### URL 参数配置

游戏支持通过 URL 参数进行配置：

| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `userId` | 整数 | 0 | 用户 ID |
| `gameId` | 整数 | 0 | 游戏 ID |
| `token` | 字符串 | "test_token" | 认证令牌 |
| `difficulty` | 整数 | 1 | 难度等级 (1-4)，可锁定难度 |
| `levels` | 整数 | 自动 | 关卡数 (不传时根据 difficulty 自动设置) |
| `stats` | 整数 | 1 | 统计展示 (0=简单模式，1=详细统计) |

**难度锁定说明**：
- 当 URL 参数中包含有效的 `difficulty` (1-4) 时，游戏难度将被锁定
- 锁定后，游戏将显示目标配对数量（如难度1目标2对，难度2目标5对，难度3目标10对，难度4目标20对）
- 玩家完成后直接结束游戏，不再自动升级难度

**示例 URL**：
```
# 图文匹配 - 难度 3，5 关，显示统计
http://localhost:8080/demo/matching-Q5/index.html?userId=12345&gameId=100&difficulty=3&levels=5&stats=1

# 文字配对 - 难度 2，显示统计
http://localhost:8080/demo/Matching_q5/index.html?userId=12346&gameId=101&difficulty=2&stats=1

# 数物品 - 难度 4，10 关，简单模式
http://localhost:8080/demo/counting-R5/index.html?userId=12347&gameId=102&difficulty=4&levels=10&stats=0
```

### 数据上报

**上报时机**：
- **完成一个难度等级的所有关卡并点击继续时**：当玩家完成当前难度的所有关卡（达到星级提升条件）并点击继续按钮时上报
- **锁定难度完成目标时**：当使用 URL 锁定难度并完成目标配对数量时上报
- **玩家主动退出时**：点击暂停菜单中的"退出"按钮时上报
- **其他情况不会上报**：重新开始、继续游戏、页面切换等操作不会触发数据上传

**防重复上传机制**：
- 每个难度等级的数据只上传一次
- 使用 `uploadedDifficulty` 标志位记录已上传的难度等级
- 同一难度等级内多次完成不会重复上传
- 游戏重置时会重置上传标志

**上报接口**：
- 地址：`http://47.107.136.94:18888/save-data`
- 方法：POST
- 格式：JSON
- 认证：通过 `Authorization` 请求头传递 token

## 🚀 快速开始

### 环境要求

- 现代浏览器（Chrome、Firefox、Edge 等）
- 本地 Web 服务器（可选，用于测试 URL 参数）

### 运行方式

#### 方式 1：直接打开（基础功能）

直接双击 `index.html` 文件即可运行游戏：

```bash
# 图文匹配游戏（图片配对文字）
open matching-Q5/index.html

# 文字配对游戏（文字配对图片）
open Matching_q5/index.html

# 数物品游戏
open counting-R5/index.html
```

#### 方式 2：使用本地服务器（推荐）

使用任意 HTTP 服务器启动项目：

```bash
# 使用 Python
cd demo
python -m http.server 8080

# 使用 Node.js (需要先安装 http-server)
npx http-server -p 8080

# 使用 PHP
php -S localhost:8080
```

然后访问：
```
http://localhost:8080/matching-Q5/index.html
http://localhost:8080/Matching_q5/index.html
http://localhost:8080/counting-R5/index.html
```

#### 方式 3：带参数运行

```bash
# 图文匹配 - 难度 3，5 关，显示统计
http://localhost:8080/matching-Q5/index.html?userId=1001&gameId=1&difficulty=3&levels=5&stats=1

# 文字配对 - 锁定难度 2，目标 5 对
http://localhost:8080/Matching_q5/index.html?userId=1002&gameId=2&difficulty=2&stats=1

# 数物品 - 难度 2，2 关，简单模式
http://localhost:8080/counting-R5/index.html?userId=1003&gameId=3&difficulty=2&levels=2&stats=0
```

## 📊 数据说明

### 统计数据定义

**图文匹配游戏 / 文字配对游戏**：
- **反应时间**：从页面加载到首次点击选项的时间
- **操作时间**：从首次点击到完成所有配对的时间
- **正确完成**：页面所有卡片都正确配对

**数物品游戏**：
- **反应时间**：从幕布打开到首次拖拽物品的时间
- **操作时间**：从首次拖拽到回合结束的时间
- **正确完成**：成功找到所有目标物品（k=0）

### 难度与关卡对应关系

| 难度 (difficulty) | 默认关卡数 (levels) | 目标配对数 (锁定时) | 说明 |
|------------------|---------------------|---------------------|------|
| 1 | 1 | 2 | 入门级 |
| 2 | 2 | 5 | 进阶级 |
| 3 | 5 | 10 | 挑战级 |
| 4 | 10 | 20 | 专家级 |

## 🛠️ 开发说明

### 核心模块

#### matching-Q5（图文匹配）

- **script.js**：游戏主逻辑
  - 页面渲染与导航
  - 图片选择与文字匹配
  - 数据统计与上报
  
- **data.js**：词图配对数据
  - 35 组预设的词图配对
  - 支持扩展自定义数据

#### Matching_q5（文字配对）

- **script.js**：游戏主逻辑
  - 页面渲染与导航
  - 文字选择与图片匹配（与 matching-Q5 玩法相反）
  - 数据统计与上报
  
- **data.js**：与 matching-Q5 共享数据

#### counting-R5

- **script.js**：游戏主逻辑
  - 回合管理
  - 物品生成与布局
  - 游戏流程控制
  
- **animation.js**：动画效果
  - 幕布动画
  - 震动反馈
  - 彩带特效
  
- **dragDrop.js**：拖拽功能
  - 鼠标/触摸拖拽
  - 碰撞检测
  - 物品放置与弹出
  
- **stats.js**：数据统计
  - 回合数据记录
  - 时间统计
  - 正确率计算
  
- **gameConfig.js**：游戏配置
  - 物品类型定义
  - 难度等级配置
  - 星级评定标准

### 游戏扩展

如需添加新游戏，请遵循以下规范：

1. **目录结构**：
   ```
   new-game-X1/
   ├── index.html
   ├── script.js
   ├── styles.css
   └── (其他模块文件)
   ```

2. **URL 参数解析**：
   ```javascript
   const queryParams = new URLSearchParams(window.location.search);
   window.urlParams = {
     userId: parseInt(queryParams.get('userId')) || 0,
     gameId: parseInt(queryParams.get('gameId')) || 0,
     token: queryParams.get('token') || 'test_token',
     difficulty: parseInt(queryParams.get('difficulty')) || 1,
     levels: parseInt(queryParams.get('levels')) || 1,
     stats: parseInt(queryParams.get('stats')) || 1
   };
   ```

3. **数据上报格式**：
   严格按照统一格式构建数据对象，调用 `sendGameData(data)` 发送。

4. **引入公共模块**：
   ```html
   <script src="../config.js"></script>
   <script src="../api.js"></script>
   ```

## 📝 注意事项

1. **数据上报**：
   - 确保服务器地址配置正确（见 `config.js`）
   - 网络异常时数据会上报到控制台，不会丢失游戏进度
   - token 为空时会移除 Authorization 请求头

2. **浏览器兼容性**：
   - 推荐使用 Chrome 80+、Firefox 75+、Edge 80+
   - 不支持 IE11 及以下版本

3. **移动端支持**：
   - 三个游戏均支持触摸操作
   - 建议使用平板或大屏手机获得更好体验

4. **本地存储**：
   - 游戏历史记录保存在 localStorage
   - 最多保留 50 条历史记录
   - 可通过游戏内菜单清空历史

5. **难度锁定**：
   - 使用 URL 参数 `difficulty` 可锁定游戏难度
   - 锁定后显示目标完成数量
   - 完成后直接结束游戏并上报数据

## 🐛 常见问题

### Q: 游戏无法加载？
A: 检查浏览器控制台是否有错误信息。如果是跨域问题，请使用本地服务器运行。

### Q: 数据上报失败？
A: 检查网络连接和服务器地址配置。查看控制台输出的详细错误信息。

### Q: 如何修改难度？
A: 通过 URL 参数 `difficulty` 设置，范围 1-4。

### Q: 如何锁定难度并设置目标？
A: 使用 URL 参数 `difficulty` 设置目标难度（1-4），游戏将自动设置目标配对数量。

### Q: 如何关闭统计弹窗？
A: 设置 URL 参数 `stats=0`，游戏完成后会显示简单提示而非详细统计。

### Q: matching-Q5 和 Matching_q5 有什么区别？
A: 
- matching-Q5：图片配对文字（显示图片，选择文字）
- Matching_q5：文字配对图片（显示文字，选择图片）
- 两者玩法相反，但使用相同的数据和样式

### Q: 如何自定义游戏内容？
A: 
- matching-Q5 / Matching_q5：修改 `data.js` 中的 `wordImagePairs` 数组
- counting-R5：修改 `gameConfig.js` 中的物品配置

## 📄 许可证

本项目为内部训练系统，请勿外传。

## 📞 技术支持

如有问题或建议，请联系开发团队。

---

**最后更新时间**：2026-03-26

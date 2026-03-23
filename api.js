// API 数据发送模块

/**
 * 发送游戏数据到服务器
 * @param {Object} data - 游戏数据对象
 */
function sendGameData(data) {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (urlParams && urlParams.token) {
        headers['Authorization'] = urlParams.token;
    }
    
    fetch(API_CONFIG.SAVE_DATA_URL, {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        headers: headers,
        body: JSON.stringify(data)
    })
    .then(response => {
        console.log('响应状态:', response.status);
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`HTTP error! status: ${response.status}, body: ${text}`);
            });
        }
        return response.json();
    })
    .then(result => {
        console.log('数据发送成功:', result);
    })
    .catch(error => {
        console.error('数据发送失败:', error);
        console.error('错误详情:', error.message);
    });
}

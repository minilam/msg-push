const {
    saveToRedis,
    removeFromRedis,
} = require("../libs/common");

// 建立了新的socket连接后,处理用户连接
function handleConnect(socket, users, params) {
    if (params.uid > 0 && params.type.length > 0) {
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            // 单点登录，登录以前先进行删除的操作
            if (user.uid === params.uid) {
                // 更换 topic
                if (user.topic !== params.topic) {
                    if (user.topic) {
                        socket.leave(user.topic, () => {
                        });
                    }
                    if (params.topic) {
                        socket.join(params.topic, () => {// 把该token加入对应的 '房间'
                            // console.log(socket.rooms);
                        });
                    }
                    user.topic = params.topic 
                }
                if (params.type === 'customer' || params.type === 'rider') {
                    let clientIo = params.type === 'rider' ? riderIo : customerIo;
                    clientIo.sockets[user.socketIds[0]].leave(user.topic);

                    users.splice(i, 1);
                }
            }

            if (user.token === params.fcm_token) {
                if (user.uid !== params.uid) {
                    user.uid = params.uid;
                }
                if (user.socketIds.indexOf(socket.id) === -1) {
                    user.socketIds.push(socket.id);
                }
                return;
            }
        }
        let data = {
            uid: params.uid,
            token: params.fcm_token,
            socketIds: [socket.id],
            client: params.client,
            type: params.type, // 保存fcm token到数据库时使用拼接key
            topic: params.topic
        }
        users.push(data);
        // 第一次登录
        if (params.topic) {
            socket.join(params.topic, () => {// 把该token加入对应的 '房间'
                // console.log(socket.rooms);
            }) 
        }
        // 商家端
        // 骑手端
        // 商家应用端的 房间 -> app  pos pad 以便平台可以单独对每个端做一个推送消息
        addToClientRoom(socket, params);
        removeFromRedis(data);

        // debug 查看当前链接用户
        forDebugInfo();
    }
}

function addToClientRoom (socket, params) {
    let room_name = '';
    let rooms = [];
    if (params.type === 'customer' || params.type === 'rider') {
        // 1. openfood_customer
        // 2. openfood_rider
        room_name = 'openfood_' + params.type; // 用户端/骑手端所有的token 对应房间名 -> 用于平台推送
    } else if (params.type === 'merchant') {
        if (params.client) {
            // 1. openfood_merchant_app 
            // 2. openfood_merchant_pos 
            // 3. openfood_merchant_pad
            room_name = 'openfood_merchant_' + params.client

            if (params.client === 'pos') {
                // NOTE: 需要给pos单独推送的话，需要单独的一个房间 如：pos_1_base_notification
                let topic_arr = params.topic.split('_')
                topic_arr[0] = params.client
                let client_room = topic_arr.join('_')
                rooms.push(client_room)

                socket.join(client_room, () => {
                    // console.log(socket.rooms);
                });
            }
        } 
    }
    if (room_name !== '') {
        rooms.push(room_name)
        socket.join(room_name, () => {  
            // console.log(socket.rooms);
        })
    }
    id_topic[socket.id] = {
        rooms
    }
}

/** 
 * 处理用户断开连接
 * 
 * @param {*} users 
 * @param {*} users 
 */
function handleDisConnect(socket, users, id_topic, params) {
    var topic = '';
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        let sidIdx = user.socketIds.indexOf(socket.id);
        if (sidIdx > -1) {
            topic = user.topic;
            // 如果参数type 的类型是 disconnect，说明是异常断开，把改fcm_token保存至redis，以备发送fcm token激活该设备的连接
            if (params.action === 'disconnect') {
                // user 就是需要找的用户
                saveToRedis(user);
            }
            user.socketIds.splice(sidIdx, 1);
            if (user.socketIds.length === 0) {
                users.splice(i, 1);
                break;
            }
        }
    }

    // 从对应的房间删除
    if (typeof id_topic[socket.id] !== 'undefined') {
        let rooms = id_topic[socket.id].rooms
        rooms.forEach(room => {
            socket.leave(room, () => {})
        });
    }
    if (topic) {
        socket.leave(topic, () => {});
    }

    // debug 查看当前链接用户
    forDebugInfo();
    return;
}

function forDebugInfo()
{
    for_show.customer = [];
    for_show.rider = [];
    for_show.merchant = [];
    // 处理 customer
    customer.forEach((item) => {
        let key = item.type + '_' + item.uid + '_' + item.client + ' ===> ' + item.socketIds[0];
        for_show.customer.push(key);
    });

    rider.forEach((item) => {
        let key = item.type + '_' + item.uid + '_' + item.client + ' ===> ' + item.socketIds[0];
        for_show.rider.push(key);
    });

    merchant.forEach((item) => {
        let key = item.type + '_' + item.uid + '_' + item.client + ' ===> ' + item.socketIds[0];
        if (item.topic) {
            key = key + '  ======> topic :  ' + item.topic;
        }
        if (item.client === 'pos' && typeof printer_sid[item.socketIds[0]] !== 'undefined') {
            key = key + '  ======> deviceid :  ' + printer_sid[item.socketIds[0]];
        }
        for_show.merchant.push(key);
    });

    show_id.forEach((id) => {
        showIo.to(id).send(JSON.stringify(for_show));
    });

    // 处理 rider
    // 处理 merchant
}

// 处理 h5 的链接
function handleH5Connect(socket, users, params, type)
{
    if (params.uid > 0 && params.type.length > 0) {
        if (type === 'person') {
            for (let i = 0; i < users.length; i++) {
                const user = users[i];
                if (user.uid === params.uid) {
                    user.socketIds = [];
                    user.socketIds.push(socket.id);
                    forDebugInfo();
                    return;
                }
            }
        }
        // 如果是堂吃的直接加入 桌台的topic， 清台的时候需要清空topic
        if (type === 'table') {
            var topic = 'h5_' + params.uid + '_base_notification';
            socket.join(topic, () => {// 把该token加入对应的 '房间'
                // console.log(socket.rooms);
            });
            if (!h5_topic[topic]) {
                h5_topic[topic] = [];
            }
            if (h5_topic.indexOf(socket.id) === -1) {
                h5_topic[topic].push(socket.id);
            }
        }
        if (type === 'person') {
            let data = {
                uid: params.uid,
                socketIds: [socket.id],
                client: params.client
            }
            users.push(data);
        }
        // debug 查看当前链接用户
        forDebugInfo();
    }
}

// 处理h5断开链接
function handleH5DisConnect (socket, users, h5_topic)
{
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        let sidIdx = user.socketIds.indexOf(socket.id);
        if (sidIdx > -1) {
            user.socketIds.splice(sidIdx, 1);
            if (user.socketIds.length === 0) {
                users.splice(i, 1);
                break;
            }
        }
    }
    for (let i in h5_topic) {
        let index = h5_topic[i].indexOf(socket.id);
        if (index !== -1) {
            h5_topic[i].splice(index, 1);
            socket.leave(i);
        }
        if (h5_topic[i].length === 0) {
            delete h5_topic[i];
        }
    }
}

module.exports = {
    handleConnect,
    handleDisConnect,
    handleH5Connect,
    handleH5DisConnect
};
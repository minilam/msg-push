// 建立了新的socket连接后,处理用户连接
function handleConnect(socket, users, id_topic, params) {
    // console.log('handleconnect');
    if (params.uid > 0 && params.type.length > 0) {
        let key = params.type + '_' + params.uid + '_' + params.client;
        users[key] = params.socket_id;
        id_topic[params.socket_id] = {
            key: key,
            topic: params.topic
        };
        console.log(users);
        // 骑手 和 商家 需要群发
        if (params.type === 'rider' || params.type === 'merchant') {            
            if (params.topic) {
                socket.join(params.topic, () => {// 把该token加入对应的 '房间'
                    // console.log(socket.rooms)
                }) 
            }
        }
        // 商家端
        // 骑手端
        // 商家应用端的 房间 -> app  pos pad 以便平台可以单独对每个端做一个推送消息
        addToClientRoom(socket, id_topic, params);
    }
}

function addToClientRoom (socket, id_topic, params) {
    let rooms = []
    let room_name = '';
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

            // NOTE: 需要给pos单独推送的话，需要单独的一个房间 如：pos_1_base_notification
            let topic_arr = params.topic.split('_')
            topic_arr[0] = params.client
            let client_room = topic_arr.join('_')
            rooms.push(client_room)

            socket.join(client_room, () => {
                // console.log(socket.rooms);
            })
        } 
    }
    if (room_name !== '') {
        rooms.push(room_name)
        socket.join(room_name, () => {  
            // console.log(socket.rooms);
        })
    }
    id_topic[socket.id].rooms = rooms
    // console.log(id_topic)
}

/** 
 * 处理用户断开连接
 * 
 * @param {*} users 
 * @param {*} users 
 */
function handleDisConnect(socket, users, id_topic) {
    if (typeof id_topic[socket.id] !== 'undefined') {
        let key = id_topic[socket.id].key;
        delete users[key];

        // topic
        let topic = id_topic[socket.id].topic;
        if (topic !== '') {
            // 把该socket.id 从主题中移除
            socket.leave(topic, () => {
                // console.log(socket.rooms);
            });
        }
        
        // 从对应的房间删除
        let rooms = id_topic[socket.id].rooms
        rooms.forEach(room => {
            socket.leave(room, () => {})
        });

        delete id_topic[socket.id];
    }
}

module.exports = {
    handleConnect,
    handleDisConnect
};
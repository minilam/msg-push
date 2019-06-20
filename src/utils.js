// 建立了新的socket连接后,处理用户连接
function handleConnect(socket, users, id_topic, params) {
    if (params.uid > 0 && params.type.length > 0) {
        if (typeof id_topic[params.socket_id] !== 'undefined') {
            handleDisConnect(socket, users, id_topic, params);
        }
        let key = params.type + '_' + params.uid + '_' + params.client;
        // 商家端是允许重登录的，保存没有意义
        if (params.type !== 'merchant') {
            users[key] = params.socket_id;
        }
        id_topic[params.socket_id] = {
            key: key,
            topic: params.topic
        };
        // 骑手 和 商家 需要群发
        if (params.type === 'rider' || params.type === 'merchant') {            
            if (params.topic) {
                socket.join(params.topic, () => {// 把该token加入对应的 '房间'
                    // console.log(socket.rooms);
                }) 
            }
        }
        // 商家端
        // 骑手端
        // 商家应用端的 房间 -> app  pos pad 以便平台可以单独对每个端做一个推送消息
        addToClientRoom(socket, id_topic, params);

        // 为了debug用
        let show_key = params.type + '_' + params.uid +'_' + params.client + ' - ' + params.socket_id;
        if (params.type === 'merchant') {
            if (id_topic[socket.id].topic.length > 0) {
                show_key = show_key + '  <-->  ' + id_topic[socket.id].topic;
            }
            if (params.client === 'pos') {
                let device_id = params.device_id;
                if (device_id.length > 0) {
                    show_key = show_key + ' <--> device_id ：' + device_id
                }
            }
            if (for_show.merchant.indexOf(show_key) === -1) {
                for_show.merchant.push(show_key)
            }
        } else if (params.type === 'rider') {
            if (for_show.rider.indexOf(show_key) === -1) {
                for_show.rider.push(show_key)
            }
        } else if (params.type === 'customer') {
            if (for_show.customer.indexOf(show_key) === -1) {
                for_show.customer.push(show_key)
            }
        }
        show_id.forEach((id) => {
            showIo.to(id).send(JSON.stringify(for_show));
        });
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
}

/** 
 * 处理用户断开连接
 * 
 * @param {*} users 
 * @param {*} users 
 */
function handleDisConnect(socket, users, id_topic, params) {
    if (typeof id_topic[socket.id] !== 'undefined') {
        // 为了debug用 - start
        show_key = id_topic[socket.id].key + ' - ' + socket.id;
        if (params.type === 'merchant') {
            if (id_topic[socket.id].topic.length > 0) {
                show_key = show_key + '  <-->  ' + id_topic[socket.id].topic;
            }
            if (typeof params.device_id !== 'undefined' && params.device_id.length > 0) {
                show_key = show_key + ' <--> device_id ：' + params.device_id
            }
            if (for_show.merchant.indexOf(show_key) !== -1) {
                for_show.merchant.splice(for_show.merchant.indexOf(show_key), 1)
            }
        } else if (params.type === 'rider') {
            if (for_show.rider.indexOf(show_key) !== -1) {
                for_show.rider.splice(for_show.rider.indexOf(show_key), 1)
            }
        } else if (params.type === 'customer') {
            if (for_show.customer.indexOf(show_key) !== -1) {
                for_show.customer.splice(for_show.customer.indexOf(show_key), 1)
            }
        }
        // end

        if (params.type !== 'merchant') {
            let key = id_topic[socket.id].key;
            delete users[key];
        }

        // topic
        let topic = id_topic[socket.id].topic;
        if (topic !== '' && topic !== params.topic) {
            // 把该socket.id 从主题中移除
            socket.leave(topic, () => {
            });
        }
        
        // 从对应的房间删除
        let rooms = id_topic[socket.id].rooms
        rooms.forEach(room => {
            socket.leave(room, () => {})
        });
        delete id_topic[socket.id]; 
        show_id.forEach((id) => {
            showIo.to(id).send(JSON.stringify(for_show));
        });
    }
}

module.exports = {
    handleConnect,
    handleDisConnect
};
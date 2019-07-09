const express = require('express');
const router = express.Router();
const { sendFcmFromRedis, getSocketId } = require("../../libs/common");

// 主题推送
router.post('/topic_push', (req, res) => {
    // 获取推送参数
    // 确定命名空间下的 io
    let topic = req.body.topic;
    if (req.body.type !== 'h5') {
        var clietnIo = req.body.type === 'rider' ? riderIo : merchantIo;
        let key = '';
        if (req.body.type === 'rider') {
            key ='rider:' + topic
        } else {
            key ='merchant:' + topic
        }
        sendFcmFromRedis(key, req.body.data);
    } else {
        var clietnIo = h5Io;
    }
    // 推送给指定对象
    clietnIo.to(topic).send(JSON.stringify(req.body.data));

    res.send({
        responseCode: 200,
        data: 'OK'
    });
});

// 单设备推送
router.post('/device_push', (req, res) => {
    // 获取推送参数
    let params = req.body;
    // 确定命名空间下的 io
    let clietnIo = '';
    let users = '';
    if (params.type === 'rider') {
        clietnIo = riderIo;
        users = rider;
    } else if (params.type === 'customer') {
        clietnIo = customerIo;
        users = customer;
    } else if (params.type === 'h5') {
        clietnIo = h5Io;
        users = h5;
    }
    let socketId = getSocketId(users, params.uid);
    let ids = Object.keys(clietnIo.sockets);
    if (ids.length > 0) {
        if (ids.indexOf(socketId) > -1) {
            clietnIo.to(socketId).send(JSON.stringify(params.data));
        }
    }
    // NOTE: 判断redis中是否有相应断开的连接，如果有，发送fcm推送
    if (params.type !== 'h5') {
        let key = params.type + ':' + params.type + '_' + params.uid;
        sendFcmFromRedis(key, params.data);
    }
    res.send({
        responseCode: 200,
        data: 'OK'
    });
});

// 系统推送 - 推广
router.post('/client_push', (req, res) => {
    // params.clietns: ['customer', 'rider', 'merchant_app', 'merchant_pos', 'merchant_pad']
    let params = req.body
    if (params.clients.length > 0) {
        let data = {
            title: params.title,
            body: params.body,
            push_type: params.push_type
        };
        params.clients.forEach(name => {
            let io = ''
            let room = ''
            if (name === 'customer') {
                io = customerIo
                room = 'openfood_' + name // openfood_customer
            } else if (name === 'rider') {
                io = riderIo
                room = 'openfood_' + name // openfood_rider
            } else {
                io = merchantIo;
                room = 'openfood_' + name
            }

            if (io !== '') {
                io.to(room).send(JSON.stringify(data))
            }
        });
    }
    res.send({
        responseCode: 200,
        data: 'OK'
    });
})

/**
 * 打印推送 - 专用
 * 
 * @param { int } id 需要推送的socketId 
 * @param { int } data  需要推送的内容
 */
router.post('/print_push', (req, res) => {
    // 获取推送参数
    let params = req.body;
    let socket_id = params.id // 需要推送的socket.id
    // 判断该socket_id 是否还处于连接中，否则需要提醒商家重新链接
    let ids = Object.keys(merchantIo.sockets);
    if (ids.length > 0) {
        if (ids.indexOf(socket_id) > -1) {
            merchantIo.to(socket_id).send(JSON.stringify(params.data));
        }
    }
    res.send({
        responseCode: 200,
        data: 'OK'
    });
});

/**
 * 清台
 */
router.post('/clear_table', (req, res) => {
    // 获取推送参数
    let params = req.body; // topic
    // 清h5 连接到桌台的连接
    if (h5_topic[params.topic]) {
        h5Io.in(params.topic).clients((errors, clients) => {
            if (clients.length > 0) {
                clients.forEach(function (socket_id) {
                    //console.log(socket_id)
                    h5Io.sockets[socket_id].leave(params.topic)
                });
            }
        })
        delete h5_topic[params.topic];
    }
    res.send({
        responseCode: 200,
        data: 'OK'
    });
});

module.exports = router;
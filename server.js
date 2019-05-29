const app = require('express')();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const bodyParser = require('body-parser');
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

global.riderIo = io.of('/rider');
global.customerIo = io.of('/customer');
global.merchantIo = io.of('/merchant');
global.customer = {};
global.customer_id_topic = {}; // socket.id 对应的token 用于断开连接清除对应的socket.id
global.rider = {};
global.rider_id_topic = {};
global.merchant = {};
global.merchant_id_topic = {};

// require the routes
if (process.env.NODE_ENV === 'development') {
    const test = require('./src/routes/test');
    app.use('/', test);
}
const push = require('./src/routes/push');
// setup the routes
app.use('/', push);

const { handleConnect, handleDisConnect } = require('./src/utils');

// 命名空间是 rider 下的 socket 连接
riderIo.on('connection', (socket) => {
    socket.send('connect success');
    socket.on('set_connect', (queryObj) => {
        let params = {
            uid: queryObj.uid,
            type: 'rider',
            topic: queryObj.topic,
            socket_id: socket.id,
            client: 'app'
        }
        if (params.uid > 0) {
            handleConnect(socket, rider, rider_id_topic, params);    
        }
    });
    // 自动监听
    socket.on('disconnect', () => {
        // 断开连接
        handleDisConnect(socket, rider, rider_id_topic, {type: 'rider', topic: ''});
    });
});

// 命名空间是 customer 下的 socket 连接
customerIo.on('connection', (socket) => {
    socket.send('connect success');
    socket.on('set_connect', (queryObj) => {
        let params = {
            uid: queryObj.uid,
            type: 'customer',
            topic: '',
            socket_id: socket.id,
            client: 'app'
        }
        if (params.uid > 0) {
            handleConnect(socket, customer, customer_id_topic, params);    
        }
    });
    socket.on('disconnect', () => {
        // 断开连接
        handleDisConnect(socket, customer, customer_id_topic, {type: 'customer', topic: ''});
    });
});

merchantIo.on('connection', (socket) => {
    socket.send('connect success');
    socket.on('set_connect', (queryObj) => {
        let params = {
            uid: queryObj.uid,
            type: 'merchant',
            topic: queryObj.topic,
            socket_id: socket.id,
            client: queryObj.client // 客户端 pos app pad
        }
        if (params.uid > 0) {
            handleConnect(socket, merchant, merchant_id_topic, params);    
        }
    });
    socket.on('disconnect', () => {
        // 断开连接
        handleDisConnect(socket, merchant, merchant_id_topic, {type: 'merchant', topic: ''});
    });
});

http.listen(port, () => {
  console.log('listening on *:' + port);
});

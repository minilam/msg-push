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
global.printer_sid = {};

// require the routes
if (process.env.NODE_ENV === 'development') {
    const test = require('./src/routes/test');
    app.use('/', test);
}
const push = require('./src/routes/push');
// setup the routes
app.use('/', push);

const { handleConnect, handleDisConnect } = require('./src/utils');
const { setPrinterSocket } = require('./src/api/printer');

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
    socket.on('logout', () => {
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
    socket.on('logout', () => {
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
            if (params.client === 'pos') {
                let device_id = queryObj.device_id
                setPrinterSocket({sid: socket.id, device_id: device_id, type: 1});
                printer_sid[socket.id] = device_id
            }    
        }
    });
    socket.on('logout', () => {
        // 断开连接 - 打印机部分设置
        if (typeof printer_sid[socket.id] !== 'undefined') {
            let device_id = printer_sid[socket.id];
            setPrinterSocket({sid: socket.id, device_id: device_id, type: 2});
            delete printer_sid[socket.id];
        }
        handleDisConnect(socket, merchant, merchant_id_topic, {type: 'merchant', topic: ''});
    });
    socket.on('disconnect', () => {
        // 断开连接 - 打印机部分设置
        if (typeof printer_sid[socket.id] !== 'undefined') {
            let device_id = printer_sid[socket.id];
            setPrinterSocket({sid: socket.id, device_id: device_id, type: 2});
            delete printer_sid[socket.id];
        }
        handleDisConnect(socket, merchant, merchant_id_topic, {type: 'merchant', topic: ''});
    });
});

http.listen(port, () => {
  console.log('listening on *:' + port);
});
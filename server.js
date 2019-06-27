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
global.showIo = io.of('/show');
global.customer = [];
global.id_topic = {};
global.rider = [];
global.merchant = [];

global.printer_sid = {};

global.show_id = [];
global.for_show = {
    customer: [],
    rider: [],
    merchant: []
};

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

showIo.on('connection', (socket) => {
    socket.send(JSON.stringify(for_show));
    if (show_id.indexOf(socket.id) === -1) {
        show_id.push(socket.id);
    }
    socket.on('disconnect', () => {
        // 断开连接
        if (show_id.indexOf(socket.id) !== -1) {
            show_id.splice(show_id.indexOf(socket.id), 1);
        }
    });
});

// 命名空间是 customer 下的 socket 连接
customerIo.on('connection', (socket) => {
    // socket.send('connect success');
    socket.on('set_connect', (queryObj) => {
        let params = {
            uid: queryObj.uid,
            type: 'customer',
            topic: '',
            client: 'app',
            fcm_token: queryObj.token
        }
        if (params.uid > 0) {
            handleConnect(socket, customer, params);    
        }
    });
    socket.on('disconnect', () => {
        // 断开连接
        handleDisConnect(socket, customer, id_topic, {action: 'disconnect'});
    });
    socket.on('logout', () => {
        // 断开连接
        handleDisConnect(socket, customer, id_topic, {action: 'logout'});
    });
});

// 命名空间是 rider 下的 socket 连接
riderIo.on('connection', (socket) => {
    socket.send('connect success');
    socket.on('set_connect', (queryObj) => {
        let params = {
            uid: queryObj.uid,
            type: 'rider',
            topic: queryObj.topic,
            socket_id: socket.id,
            client: 'app',
            fcm_token: queryObj.token
        }
        if (params.uid > 0) {
            handleConnect(socket, rider, params);    
        }
    });
    // 自动监听
    socket.on('disconnect', () => {
        // 断开连接
        handleDisConnect(socket, rider, id_topic, {action: 'disconnect'});
    });
    socket.on('logout', () => {
        // 断开连接
        handleDisConnect(socket, rider, id_topic, {action: 'logout'});
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
            client: queryObj.client, // 客户端 pos app pad
            fcm_token: queryObj.token
        }
        if (params.uid > 0) {
            if (params.client === 'pos') {
                let device_id = queryObj.device_id
                if (device_id.length > 0) {
                    setPrinterSocket({sid: socket.id, device_id: device_id, type: 1});
                    printer_sid[socket.id] = device_id
                }
            }  
            handleConnect(socket, merchant, params);  
        }
    });
    socket.on('logout', () => {
        // 断开连接 - 打印机部分设置
        let params =  {
            action: 'logout'
        };
        if (typeof printer_sid[socket.id] !== 'undefined') {
            let device_id = printer_sid[socket.id];
            params.device_id = device_id;
            setPrinterSocket({sid: socket.id, device_id: device_id, type: 2});
            delete printer_sid[socket.id];
        }
        handleDisConnect(socket, merchant, id_topic, params);
    });
    socket.on('disconnect', () => {
        // 断开连接 - 打印机部分设置
        let params =  {
            action: 'disconnect'
        };
        if (typeof printer_sid[socket.id] !== 'undefined') {
            let device_id = printer_sid[socket.id];
            params.device_id = device_id;
            setPrinterSocket({sid: socket.id, device_id: device_id, type: 2});
            delete printer_sid[socket.id];
        }
        handleDisConnect(socket, merchant, id_topic, params);
    });
});

http.listen(port, () => {
  console.log('listening on *:' + port);
});
const socketUrl = require("./config/prod.env.js").socket
const app = require('express')();
const http = require('http').createServer(app, socketUrl);
const io = require('socket.io')(http);
const bodyParser = require('body-parser');
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

global.riderIo = io.of('/socket/rider');
global.customerIo = io.of('/socket/customer');
global.merchantIo = io.of('/socket/merchant');
global.h5Io = io.of('/socket/h5');
global.showIo = io.of('/socket/show');
global.customer = [];
global.h5 = [];
global.h5_topic = [];
global.id_topic = {};
global.rider = [];
global.merchant = [];

global.printer_sid = {};

global.show_id = [];
global.for_show = {
    customer: [],
    rider: [],
    merchant: [],
    h5: []
};

// require the routes
if (process.env.NODE_ENV === 'development') {
    const test = require('./src/routes/test');
    app.use('/', test);
}
const push = require('./src/routes/push');
// setup the routes
app.use('/', push);

const { handleConnect, handleDisConnect, handleH5Connect, handleH5DisConnect } = require('./src/utils');
const { setPrinterSocket } = require('./src/api/printer');
const redisHelper = require("./libs/redis");

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
    socket.on('flush_db', () => {
        redisHelper.flushDb();
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

// 命名空间是 merchant 下的 socket 连接
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

// 命名空间是h5 下的 socket 连接
h5Io.on('connection', (socket) => {
    socket.send('connect success');
    socket.on('set_connect', (queryObj) => {
        if (typeof queryObj.connect_type !== 'undefined') {
            let params = {
                uid: queryObj.uid,
                type: 'customer',
                client: 'h5',
            }
            if (params.uid.length > 0) {
                handleH5Connect(socket, h5, params, queryObj.connect_type);    
            }
        }
        
    })
    socket.on('disconnect', () => {
        // 断开连接
        handleH5DisConnect(socket, h5, h5_topic);
    });
    socket.on('logout', () => {
        // 断开连接
        handleH5DisConnect(socket, h5, h5_topic);
    });
});

http.listen(port, () => {
  console.log('listening on *:' + port);
});
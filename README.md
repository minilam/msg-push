# Base Socket.io push system

- 实时消息推送

## Features

- a Node.js server (this repository)
- a [Javascript client library](https://github.com/socketio/socket.io-client) for the browser (or a Node.js client)


## Installation

在项目的根目录执行命令：
```bash
npm install

启动：
开发环境： npm run dev
线上环境： npm start
```

## How to connect

- 系统主要包括了三个端： `cusomer(用户端)` 、`rider(骑手端)` 和 `merchant(商家端)`
- 商家端细分： app、pos 和 pad
- 主要端的管理通过namespace 进行区分管理

用户端连接：

```js
// url:port/customer
var customerSocket = io('http://xxx:port/customer');
let params = {
    uid: uid, // 用户的id
    type: client // client 代表是哪个客户端 - 这里应该填写 customer
}
customerSocket.emit('set_connect', params) // 建立连接
```

骑手端连接

```js
// url:port/rider
var riderSocket = io('http://xxx:port/rider');
let params = {
    uid: uid, // 骑手id
    type: client, // 客户端 - rider表示 骑手端
    topic: topic // 把该骑手加入哪个主题 - 用于区域广播（新订单通知） 如：rider_Tianhe_Qu_notification
}
riderSocket.emit('set_connect', params) // 建立连接
```

商家端连接

```js
// url:port/merchant
var riderSocket = io('http://xxx:port/merchant');
let params = {
    uid: uid, // 骑手id
    type: client, // 客户端 - rider表示 骑手端
    topic: topic // 把该用户加入哪个主题, 如： store_1_base_notification
    client: client // 在哪个细分的客户端登录 pos app pad
}
riderSocket.emit('set_connect', params) // 建立连接
```

---

## How to push

There are three api for system to send their own message:

### Device push

#### 1. 单设备推送 [POST url:port/device_push]

```
参数示例 - json格式：
push_data = [
    'type' => 'rider',
    'uid' => '1',
    'data' => [
        'title' => 'New Order',
        'id' => 1,
        "order_status" => 7,
        "push_type" => 'store_get_order' // 推送类型
    ]
];
```

+ Parameters
    + type: (required) - 客户端类型 骑手 - rider  用户 - customer
    + uid: (integer, required) - 需要推送的用户id
    + data: (array, required) - 推送的内容

+ Response 200 (application/json)
    + Body

            {
                "code": 0,
                "message": "",
            }

### Topic push

#### 2. 主题推送 [POST url:port/topic_push]

```
参数示例 - json格式：
data = [
    'type' => 'merchant',
    'topic' => 'pos_1_base_notification',
    'data' => [
        'title' => 'New Order',
        'id' => 1,
        "order_status" => 7,
        "push_type" => 'store_get_order' // 推送类型
    ]
];
```

+ Parameters
    + type: (required) - 客户端类型 骑手 - rider  商家端 - merchant
    + topic: (integer, required) - 需要推送的主题
    + data: (array, required) - 推送的内容

+ Response 200 (application/json)
    + Body

            {
                "code": 0,
                "message": "",
            }

### System push

#### 3. 系统推送 [POST url:port/client_push]

```
参数示例 - json格式：
data = [
    'title' => 'System push',
    'body' => 'Welcome back',
    'clients' => ['customer', 'rider, 'app', 'pos', 'pad'],
    'push_type' => 'system_push_notice'
];
```

+ Parameters
    + title: (required) - 推送标题
    + body: (required) - 推送内容
    + clients: (array, required) - 推送客户端，数组
    + push_type： (string, required) - 推送类型

+ Response 200 (application/json)
    + Body

            {
                "code": 0,
                "message": "",
            }
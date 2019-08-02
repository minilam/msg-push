var axios = require('axios');
const redisHelper = require("./redis");
const baseUrl = require("../config/prod.env.js").url
const db_idx = require("../config/prod.env.js").redis.select;

// wirte something here
function getRedisKey(params)
{
    let keys = [];
    if (params.topic) {
        keys.push(params.type + ':' + params.topic);
    }
    let key = params.type + ':' + params.type + '_' + params.uid;
    keys.push(key);

    return keys;
}

// { uid: '1',
// token: 'gdgd',
// socketIds: [ '/merchant#Y9rW7OqpyWYae5I6AAAC' ],
// client: 'app',
// type: 'merchant',
// topic: 'store_1_base_notification' } ]
function saveToRedis(user)
{
    let redisKey = getRedisKey(user);
    if (redisKey.length > 0 && user.token) {
        let fcm_client = '';
        if (user.type === 'merchant') {
            fcm_client = user.client === 'app' ? 'store' : user.client;  
        } else {
            fcm_client = user.type;
        }
        for (let i = 0; i < redisKey.length; i++) {
            redisHelper.getString(redisKey[i])
                .then((result) => {
                    let data = '';
                    var temp = [];
                    let val = fcm_client + '_' + user.uid + '=> ' + user.token;
                    if (result === null) {
                        temp.push(val);
                        data = JSON.stringify(temp);
                    } else {
                        let arr = JSON.parse(result);
                        if (arr.indexOf(val) === -1) {
                            arr.push(val);
                        }
                        data = JSON.stringify(arr);
                    }
                    redisHelper.setString(redisKey[i], data);
                }).catch((err) => {
                console.log('设置失败', err);
            })
        }
    }
}

function removeFromRedis(user)
{
    let redisKey = getRedisKey(user);
    if (redisKey.length > 0 && user.token) {
        let fcm_client = '';
        if (user.type === 'merchant') {
            fcm_client = user.client === 'app' ? 'store' : user.client;  
        } else {
            fcm_client = user.type;
        }
        for (let i = 0; i < redisKey.length; i++) {
            redisHelper.getString(redisKey[i])
                .then((result) => {
                    if (result !== null) {
                        let tokens = JSON.parse(result);
                        let index = tokens.indexOf(fcm_client + '_' + user.uid + '=> ' + user.token);
                        if (index > -1) {
                            tokens.splice(index, 1);
                        }
                        if (tokens.length > 0) {
                            redisHelper.setString(redisKey[i], JSON.stringify(tokens));
                        } else {
                            redisHelper.delString(redisKey[i])
                        }
                    }
                }).catch( (err) => {
                    console.log('设置失败', err);
                })
            }
    }
}

function sendFcmFromRedis(redisKey, params)
{
    // console.log('sendFcmFromRedis : ' + redisKey);
    if (redisKey.length > 0) {
        redisHelper.getString(redisKey)
            .then((result) => {
                if (result !== null) {
                    // 对应需要唤醒的的tokens
                    let tokens = JSON.parse(result);
                    axios.request({
                        url: baseUrl + 'api/common/call',
                        data: {
                            db_idx: db_idx,
                            key: redisKey,
                            tokens: tokens,
                            data: params
                        },
                        method: "post"
                      }).then(res => res.data)
                      .catch((err) => {
                        console.log('Error', err);
                      });
                }
            }).catch( (err) => {
                console.log('设置失败', err);
            })
    }
}

function getSocketId(users, uid)
{
    // 同一用户会打开多个页面，存在多个socketId
    let result = [];
    users.forEach(user => {
        if (user.uid === uid) {
            result = user.socketIds;
        }
    });
    return result.length > 0 ? result[0] : '';
}

module.exports = {
    saveToRedis,
    removeFromRedis,
    sendFcmFromRedis,
    getSocketId
}
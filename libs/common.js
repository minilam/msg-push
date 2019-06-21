var axios = require('axios');
const redisHelper = require("./redis");
const baseUrl = require("../config/prod").url

// wirte something here

function getRedisKey(key, topic)
{
    let keys = [];
    if (key.length > 0) {
        let arr = key.split('_');
        let redisKey = arr[0];
        if (topic) {
            keys.push(redisKey + ':' + topic);
        }
        keys.push(redisKey + ':' + key);
    }

    return keys;
}


function saveToRedis(idTopic)
{
    let redisKey = getRedisKey(idTopic.key, idTopic.topic);
    if (redisKey.length > 0 && idTopic.token) {
        let config = idTopic.key.split('_');
        let fcm_client = '';
        if (config[0] === 'merchant') {
            fcm_client = config[2] === 'app' ? 'store' : config[2];  
        } else {
            fcm_client = config[0];
        }
        for (let i = 0; i < redisKey.length; i++) {
        redisHelper.getString(redisKey[i])
            .then((result) => {
                let data = '';
                var temp = [];
                if (result === null) {
                    temp.push(fcm_client + ' -- ' + idTopic.token);
                    data = JSON.stringify(temp);
                } else {
                    let arr = JSON.parse(result);
                    arr.push(idTopic.token);
                    data = JSON.stringify(arr);
                }
                redisHelper.setString(redisKey[i], data);
            }).catch((err) => {
                console.log('设置失败', error);
            })
        }
    }
}

function removeFromRedis(idTopic)
{
    let redisKey = getRedisKey(idTopic.key, idTopic.topic);
    if (redisKey.length > 0 && idTopic.token) {
        let config = idTopic.key.split('_');
        let fcm_client = '';
        if (config[0] === 'merchant') {
            fcm_client = config[2] === 'app' ? 'store' : config[2];  
        } else {
            fcm_client = config[0];
        }
        for (let i = 0; i < redisKey.length; i++) {
            redisHelper.getString(redisKey[i])
                .then((result) => {
                    if (result !== null) {
                        let tokens = JSON.parse(result);
                        let index = tokens.indexOf(fcm_client + ' -- ' + idTopic.token);
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

function sendFcmFromRedis(key, params, type)
{
    let redisKey = type === 'device' ? getRedisKey(key) : key;
    console.log('sendFcmFromRedis : ' + redisKey)
    if (redisKey.length > 0) {
        redisHelper.getString(redisKey)
            .then((result) => {
                if (result !== null) {
                    // 对应需要唤醒的的tokens
                    let tokens = JSON.parse(result);
                    axios.request({
                        url: baseUrl + 'api/common/call',
                        data: {
                            tokens: tokens,
                            data: params
                        },
                        method: "post"
                      }).then(res => res.data)
                      .catch();
                }
            }).catch( (err) => {
                console.log('设置失败', err);
            })
    }
}

module.exports = {
    saveToRedis,
    removeFromRedis,
    sendFcmFromRedis
}
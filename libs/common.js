var axios = require('axios');
const redisHelper = require("./redis");
const baseUrl = require("../config/prod.env.js").url

// wirte something here
function getRedisKey(params) {
  let keys = [];
  let key = params.type + ':' + params.type + '_' + params.uid;
  keys.push(key);

  if (params.topic && params.type === 'merchant') {
    keys.push(params.type + ':' + params.topic);
  }
  return keys;
}

// { uid: '1',
// token: 'gdgd',
// socketIds: [ '/merchant#Y9rW7OqpyWYae5I6AAAC' ],
// client: 'app',
// type: 'merchant',
// topic: 'store_1_base_notification' } ]
function saveToRedis(user) {
  let redisKey = getRedisKey(user);
  if (redisKey.length > 0 && user.token) {
    let fcm_client = '';
    if (user.type === 'merchant') {
      fcm_client = user.client === 'app' ? 'store' : user.client;
    } else {
      fcm_client = user.type;
    }
    for (let i = 0; i < redisKey.length; i++) {
      let val = fcm_client + '_' + user.uid + '=>' + user.token;
      if (fcm_client === 'rider') {
        delBeforeSave(redisKey[i]);
      }
      redisHelper.setSet(redisKey[i], val);
    }
  }
}

function removeFromRedis(user) {
  let redisKey = getRedisKey(user);
  if (redisKey.length > 0 && user.token) {
    let fcm_client = '';
    if (user.type === 'merchant') {
      fcm_client = user.client === 'app' ? 'store' : user.client;
    } else {
      fcm_client = user.type;
    }
    for (let i = 0; i < redisKey.length; i++) {
      let val = fcm_client + '_' + user.uid + '=>' + user.token;
      if (fcm_client === 'rider') {
        delBeforeSave(redisKey[i]);
      }
      redisHelper.delMemeberFromSet(redisKey[i], val);
    }
  }
}

function sendFcmFromRedis(redisKey, params) {
  if (redisKey.length > 0) {
    axios.request({
      url: baseUrl + 'api/common/call',
      data: {
        key: redisKey,
        data: params
      },
      method: "post"
    }).then(res => res.data)
      .catch((err) => {
        console.log('Error', err);
      });
  }
}

function setAsSet(key, val) {
  if (key && val) {
    redisHelper.setSet(key, val);
  }
}

function delFromSet(key, val) {
  if (key && val) {
    redisHelper.delMemeberFromSet(key, val);
  }
}

function getSocketId(users, uid, num = 1) {
  // 同一用户会打开多个页面，存在多个socketId
  let result = [];
  users.forEach(user => {
    if (user.uid === uid) {
      result = user.socketIds;
    }
  });
  if (result.length > 0) {
    return num === 1 ? result[0] : result;
  }
}

function delBeforeSave(key) {
  redisHelper.memebersFromSet(key)
    .then((res) => {
      if (res) {
        redisHelper.delMemeberFromSet(key, res[0]);
      }
    }).catch(err => {
      console.log(err);
    })
}

module.exports = {
  saveToRedis,
  removeFromRedis,
  sendFcmFromRedis,
  getSocketId,
  setAsSet,
  delFromSet
}
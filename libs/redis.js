const redis = require("redis");
const config = require("./../config/prod").redis

// 实例redis对象 同时选择数据库
const client = redis.createClient(config.port, config.url); 
client.auth(config.password, (err) => {
    if (err) {
        console.log('Invalid Password');
    }
});

//连接错误处理
client.on("error", err => {
    console.log('redis connect err', err);
});

client.on('connect', () => {
    console.log('redis connect success');
})
client.select(config.select);

//验证redis
// client.auth(config.password);

const redisHelper = {};
/**
 * redisHelper 添加string类型的数据
 * @param key 键
 * @param value 值
 * @param expire (过期时间,单位秒;可为空，为空表示不过期) 
 */
redisHelper.setString = (key, value, expire) => {
    return new Promise((resolve, reject) => {
        client.set(key, value, (err, result) => {
            if (err) {
                console.log(err);
                callback(err, null);
                reject(err);
            }
            // 设置过期时间
            if (!isNaN(expire) && expire > 0) {
                client.expire(key, parseInt(expire));
            }
            resolve(result);
        })
    });
}

/**
 * redisHelper 查询string类型的数据
 * 
 * @param key 键
 * @param callBack(err,result)
 */
redisHelper.getString = (key) => {
    return new Promise((resolve, reject) => {
        client.get(key, (err, result) => {
            if (err) {
                reject(err)
            }
            resolve(result)
        });
    });
}

/**
 * 设置过期时间，定时删除某个key
 * 
 * @param key 键
 * @param expire 过期时间(s)
 */
redisHelper.setExpire = (key, expire) => {
    // 设置过期时间
    if (!isNaN(expire) && expire > 0) {
        client.expire(key, parseInt(expire));
    }
}

/**
 * 移除过期时间，使得key永不过期
 * 
 * @param key 键
 */
redisHelper.removeExpire = (key) => {
   client.persist(key);
}

redisHelper.delString = (key) => {
    client.del(key);
 }

module.exports = redisHelper;
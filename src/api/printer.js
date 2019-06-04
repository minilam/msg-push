var axios = require('axios');
const baseUrl = require("../../config/prod.env.js").url

// 设置打印机连接的socket
function setPrinterSocket(data) {
    return axios.request({
        url: baseUrl + 'api/business/printer/socket',
        data: data,
        method: "post"
      }).then(res => res.data)
}

module.exports = {
    setPrinterSocket
};
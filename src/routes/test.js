const express = require('express');
const router = express.Router();
var path = require('path');

const basePath = path.join(__dirname, '../../');

/**
 *  用户test, 部署的时候需要去掉
 */
router.get('/rider', (req, res) => {
  res.sendFile(basePath + 'public/rider.html')
});
router.get('/customer', (req, res) => {
  res.sendFile(basePath + '/public/customer.html')
});
router.get('/merchant', (req, res) => {
  res.sendFile(basePath + '/public/merchant.html')
});

router.get('/show', (req, res) => {
  res.sendFile(basePath + '/public/show.html')
});

router.get('/h5', (req, res) => {
  res.sendFile(basePath + '/public/h5.html')
});

router.get('/platform', (req, res) => {
  res.sendFile(basePath + '/public/platform.html')
});

module.exports = router;
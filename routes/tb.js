var express = require('express');
var request = require('request');
var lodash = require('lodash');
// var fs = require('fs-extra');
var router = express.Router();
var pid = 'mm_45810589_44050141_407492367';
var tbName = 'tb932560225';
var apkey = 'fd0b4755-79bd-8463-8ca5-e19301a81ba5';
router.get('/union',function (req,res) {
    var id = req.query.id;
    if (!id) {
        res.send({code:0});
        return
    }
    request.get(
        `https://api.open.21ds.cn/apiv1/getitemgyurl?apkey=${apkey}&itemid=${id}&pid=${pid}&tbname=${tbName}&shorturl=1`,
        {timeout:5000},
        function (error,response,body) {
            if (error) {
                console.log("\n" + new Date() + error);
                res.send({code:0});
            } else {
                var data = lodash.attempt(JSON.parse.bind(null,body));
                res.send(data);
            }
        }
    );
});//淘宝高佣接口
module.exports = router;
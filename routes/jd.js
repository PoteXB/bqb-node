var express = require('express');
var request = require('request');
var lodash = require('lodash');
// var fs = require('fs-extra');
var router = express.Router();
var apiUrl = 'https://api.open.21ds.cn/jd_api_v1';
var apkey = 'fd0b4755-79bd-8463-8ca5-e19301a81ba5';
var unionid = '1000907277';
var positionid = '1432352431';
router.get('/union',function (req,res) {
    var id = req.query.id;
    if (!id) {
        res.send({code:0});
        return
    }
    request.get(
        `${apiUrl}/getjdquanitem?apkey=${apkey}&skulist=${id}`,
        {timeout:5000},
        function (error,response,body) {
            if (error) {
                console.log("\n" + new Date() + error);
                res.send({code:0});
                return
            }
            var data = lodash.attempt(JSON.parse.bind(null,body));
            if (!data) {
                res.send({code:0});
                return
            }
            var link = lodash.get(data,'data.data[0].couponList[0].link');
            if (!link) {
                res.send({code:0});
                return
            }
            link = 'https:' + link;
            var pattern = 'to=([^&]*)';
            var replaceText = `to=item.jd.com/${id}.html`;
            if (link.match(pattern)) {
                link = link.replace(/(to=)([^&]*)/gi,replaceText);
            }
            link = encodeURIComponent(link);
            request.get(
                `${apiUrl}/getquanitemurl?apkey=${apkey}&couponurl=${link}&materialids=${id}&unionid=${unionid}&positionid=${positionid}`,
                {timeout:5000},
                function (error,response,body) {
                    if (error) {
                        console.log("\n" + new Date() + error);
                        res.send({code:0});
                        return
                    }
                    var data = lodash.attempt(JSON.parse.bind(null,body));
                    if (!data) {
                        res.send({code:0});
                        return
                    }
                    var linkShort = lodash.get(data,'data.urlList');
                    if (!lodash.keys(linkShort)[0]) {
                        res.send({code:0});
                        return
                    }
                    linkShort = linkShort[lodash.keys(linkShort)[0]];
                    if (!linkShort) {
                        res.send({code:0});
                        return
                    }
                    res.send({code:1,data:linkShort});
                }
            );
        }
    )
    ;
});//京东联盟优惠券
// router.get('/conLink',function (req,res) {
//     res.send({code:0});
// });//第三方接口转链
module.exports = router;
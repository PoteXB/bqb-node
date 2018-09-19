var express = require('express');
var request = require('request');
var lodash = require('lodash');
var fs = require('fs-extra');
var router = express.Router();
var CouponSwitch = 1;                                               //模拟登录开关
var getJdCookie = require('../jdCoupon/zhuaCookie.js');             //模拟登录方法
var jdCookies = fs.readFileSync('jdCoupon/jdCookie.txt','utf-8');
router.get('/union',function (req,res) {
    var id = req.query.id;
    var options = {
        url:`https://media.jd.com/gotoadv/goods?keyword=${id}&input_keyword=${id}&hasCoupon=1`,
        gzip:true,
        headers:{
            'Cookie':`thor=${jdCookies}`
        }
    };
    request.get(options,function (err,response,body) {
        var isLogin = lodash.get(body.match("CPS商品推广 - 京东联盟"),[0]);
        if (!isLogin) {
            console.log("\n登录失效\n");
            if (CouponSwitch) {
                CouponSwitch = 0;
                getJdCookie.jd(
                    function (value) {
                        CouponSwitch = 1;
                        if (value.code) {
                            jdCookies = value.data
                        } else {
                            console.log("\n" + value.data + "\n");
                        }
                    }
                );
            }
            res.send({code:0});
            return
        }
        var couponLink = lodash.get(body.match(/'couponLink':'(.*)?'/),[1]);
        if (!couponLink) {
            console.log("\n" + '未查到优惠券' + "\n");
            res.send({code:0});
            return
        }
        couponLink = couponLink.replace(/##/g,'=');
        request.post('http://japi.jingtuitui.com/api/get_goods_link',
            {
                form:{
                    appid:'1809121218514231',
                    appkey:'799e6a1d5d6815fad7880b6e17c48c18',
                    unionid:'1000405866',
                    positionid:'454564',
                    gid:id,
                    coupon_url:couponLink
                }
            },
            function (err,response,body) {
                if (err) {
                    res.send({code:0});
                    return
                }
                res.send({code:1,data:lodash.attempt(JSON.parse.bind(null,body))});
            }
        );
    });
});//查找联盟券并第三方接口转链
router.get('/conLink',function (req,res) {
    request.post('http://japi.jingtuitui.com/api/get_goods_link',
        {
            form:{
                appid:'1809121218514231',
                appkey:'799e6a1d5d6815fad7880b6e17c48c18',
                unionid:'1000405866',
                positionid:'454564',
                gid:id,
                coupon_url:couponLink
            }
        },
        function (err,response,body) {
            if (err) {
                res.send({code:0});
                return
            }
            res.send({code:1,data:lodash.attempt(JSON.parse.bind(null,body))});
        }
    );
});//第三方接口转链
module.exports = router;

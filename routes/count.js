var express = require('express');
var redis = require("redis");
var moment = require("moment");
var file = require('../sever/admin/file.js');
var md5 = require('md5');
var client = redis.createClient();
client.on("error",function (err) {
});
var router = express.Router();
function saveRedis(req,res,type) {
    var pid = req.query.pid;
    var uid = req.query.uid;
    var cid = req.query.cid;
    var key = req.query.key;
    // var timestamp = new Date().getTime();
    // file.writeFile(`/alidata/url/${timestamp}.txt`,`${req.protocol}://${req.headers.host}${req.baseUrl}${req._parsedUrl.pathname}/?cid=${cid}&pid=${pid}&uid=${uid}&key=${key}`);
    if (!pid || !uid || !cid || !key) {
        res.end();
        return;
    }
    if (md5(`${uid}|${pid}|${cid}|!@#zhaoquano$%^`) != key) {
        res.end();
        return;
    }
    var time3 = moment().format('YYYYMMDD');
    var time4 = moment().format('YYYYMMDDHH');
    var hashKey = time4 + '_' + type;
    var allActiveHashKey = time4 + '_newActive';
    var b = '',d = '';
    if (type == 'install') {
        b = 'dayAZ_';
    } else if (type == 'active') {
        b = 'dayRH_';
        d = 'allRH_';
    } else {
        b = 'dayXZ_';
    }
    var hourName = 'hour_' + pid + "_" + cid + "_" + time3;
    var allName = b + pid + "_" + cid + "_" + time3;
    var allActive = d + pid + "_" + cid;
    client.sadd(allName,uid,function (err,e) {
        if (err) {
            res.end();
            console.log(err);
            return;
        }
        if (e == 1) {
            client.hincrby(hourName,hashKey,1,function (err,e) {
                if (err) {
                    console.log(err);
                }
            });
            res.end();
        } else {
            res.end();
        }
    });
    if (type == 'active') {
        client.sadd(allActive,uid,function (err,e) {
            if (err) {
                console.log(err);
                return;
            }
            if (e == 1) {
                client.hincrby(hourName,allActiveHashKey,1,function (err,e) {
                    if (err) {
                        console.log(err);
                    }
                });
            }
        });
    }
}
router.get('/install',function (req,res) {
    saveRedis(req,res,'install')
});
router.get('/active',function (req,res) {
    saveRedis(req,res,'active')
});
router.get('/uninstall',function (req,res) {
    saveRedis(req,res,'uninstall')
});
module.exports = router;
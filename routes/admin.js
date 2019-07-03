var express = require('express');
//请求模块
var request = require('request');
//数据库操作封装
var db = require('../sever/admin/db.js');
//文件操作封装
var file = require('../sever/admin/file.js');
//jwt登录签名验证
var jwt = require('jsonwebtoken');
//文件上传文件解析中间件
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
//工具函数
var utils = require('../utils');
//时间模块
var moment = require("moment");
var router = express.Router();
var tokenKey = "qili!@#%$#45897";
var lock = 0;
var access_token = "";
router.all('*',function (req,res,next) {
    res.header('Access-Control-Allow-Headers','Content-Type, Content-Length, Authorization, Accept, X-Requested-With , x-token');
    res.header('Access-Control-Allow-Methods','PUT, POST, GET, DELETE, OPTIONS');
    if (req.method == 'OPTIONS') {
        res.end();
    }
    else {
        if ('/user/login' == req.url) {
            next();
        } else {
            let header = req.headers["x-token"];
            if (header) {
                jwt.verify(header,tokenKey,function (err,decoded) {
                    if (err) {
                        res.status(200).json({"code":50014,"message":"无效请求"});
                    } else {
                        req.jwtValue = decoded;
                        next();
                    }
                });
            } else {
                res.status(200).json({"code":50008,"message":"无效请求"});
            }
        }
    }
});
// 登录
router.post('/user/login',function (req,res) {
    let name = JSON.stringify(req.body.username);
    let pwd = req.body.password;
    let errText = '';
    db.selectAll("select * from user where uname = " + name,(e,r) => {
        if (e) {
            res.status(200).json({"code":0,"message":"服务器错误"});
            return
        }
        let tt = r.length;
        if (tt == 0) {
            errText = "账号不存在";
            res.status(200).json({"code":0,"message":errText});
        } else if (pwd != r[0].upwd) {
            errText = "密码错误";
            res.status(200).json({"code":0,"message":errText});
        } else {
            var token = jwt.sign({
                data:r[0].uname,
                role:r[0].role
            },tokenKey,{expiresIn:'24h'});
            res.status(200).json({"code":20000,"data":{"token":token}});
        }
    });
});
// 获取权限以及个人信息
router.get('/user/info',function (req,res) {
    let jwtValue = req.jwtValue;
    const r = {
        name:jwtValue.data,
        roles:[jwtValue.role],
        avatar:"https://wpimg.wallstcn.com/f778738c-e4f8-4870-b634-56703b4acafe.gif"
    };
    res.status(200).json({"code":20000,"data":r});
});
// 登出
router.post('/user/logout',function (req,res) {
    res.status(200).json({"code":20000,"data":"success"});
});
// 表情包列表
router.post('/novel/list',function (req,res) {
    let {body} = req;
    let {pageSize,currentPage} = body;
    let data = {"env":"test-39qs6","query":"db.collection('user').where({name:'user'}).get()"};
    // utils.getAccessToken().then((body) => {
    //     console.log(body);
    //     res.status(200).json({"code":20000,"data":body});
    // }).catch((error) => {
    //     console.log(error);
    //     res.status(200).json({"code":20000,"data":error});
    // });
    let options = {
        method:'POST',
        url:'https://api.weixin.qq.com/tcb/databasequery',
        qs:{access_token},
        headers:{'content-type':'application/json'},
        body:data,
        json:true
    };
    if (lock) {
        //请求微信token路由上锁
        res.status(200).json({"code":0,"data":{"lock":true}});
        return
    }
    request(options,function (error,response,body) {
        if (error) {
            res.status(200).json({"code":0,"message":"云开发出错"});
            return
        }
        if (body.errcode == 42001 || body.errcode == 41001) {
            //微信token已过期
            lock = 1;
            utils.getAccessToken().then((body) => {
                access_token = body.access_token ? body.access_token : ""
                console.log(access_token);
            }).catch((error) => {
            }).finally(() => {
                lock = 0
            });
            res.status(200).json({"code":0,"data":{"lock":true}});
        } else {
            res.status(200).json({"code":20000,"data":body});
        }
    });
});
// 添加表情包
router.post('/novel/add',function (req,res) {
    let options = {
        method:'POST',
        url:'https://api.weixin.qq.com/tcb/invokecloudfunction',
        qs:{access_token},
        headers:{'content-type':'application/json'},
        body:data,
        json:true
    };
    request(options,function (error,response,body) {
        if (error) {
            res.status(200).json({"code":0,"message":"云开发出错"});
            return
        }
        if (body.errcode == 42001 || body.errcode == 41001) {
            //微信token已过期
            lock = 1;
            utils.getAccessToken().then((body) => {
                access_token = body.access_token ? body.access_token : ""
            }).catch((error) => {
            }).finally(() => {
                lock = 0
            });
            res.status(200).json({"code":0,"data":{"lock":true}});
        } else {
            res.status(200).json({"code":20000,"data":body});
        }
    });
});
module.exports = router;
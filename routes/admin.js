var express = require('express');
var request = require('request');
//数据库操作封装
var db = require('../sever/admin/db.js');
//文件操作封装
var file = require('../sever/admin/file.js');
//jwt登录签名验证
var jwt = require('jsonwebtoken');
//文件上传文件解析中间件
var multipart = require('connect-multiparty');
//时间模块
var moment = require("moment");
var CDN = require('../sever/admin/ypyCDN.js');
var multipartMiddleware = multipart();
var router = express.Router();
var tokenKey = "qili!@#%$#45897";
let env = process.env.NODE_ENV;
console.log(env);
var chars = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
var access_token = "23_v0pPriOBGKUtBLFP82BZGYMXzcYJOttV1H1oMyJCx1w96uiO9ggBXsstj3GrpH6RTsAXb6k23x0TqcD3cMZUyt81zsDkADTPrdkOYEC0FQhbFklLmDMWzufx96gIKi9hRRtN7CGYc1IV6yUkIBXgAAAXQM";
function generateMixed(n) {
    var res = "";
    for (var i = 0; i < n; i++) {
        var id = Math.ceil(Math.random() * 35);
        res += chars[id];
    }
    return res;
}
router.all('*',function (req,res,next) {
    res.header('Access-Control-Allow-Headers','Content-Type, Content-Length, Authorization, Accept, X-Requested-With , x-token');
    res.header('Access-Control-Allow-Methods','PUT, POST, GET, DELETE, OPTIONS');
    if (req.method == 'OPTIONS') {
        res.end();
    }
    else {
        if ('/user/login' == req.url||env == 'development') {
          console.log(1);
            next();
        } else {
          console.log(2);
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
// 获取表情包列表
router.post('/novel/list',function (req,res) {
    let {body} = req;
    let {pageSize,currentPage} = body;
    let data = {"env":"test-39qs6","query":"db.collection('user').where({name:'user'}).get()"};
    let options = {
        method:'POST',
        url:'https://api.weixin.qq.com/tcb/databasequery',
        qs:{access_token},
        headers:
            {'content-type':'application/json'},
        body:data,
        json:true
    };
    request(options,function (error,response,body) {
        if (error) throw new Error(error);
        res.status(200).json({"code":20000,"data":body});
    });
});
router.post('/novel/get',function (req,res) {
    var jwtValue = jwtTest(req,res);
    if (!jwtValue) {
        return
    }
    var url = req.body.url;
    var type = req.body.type;
    if (!url.match(`${proUrl}/${type}`)) {
        res.status(200).json({"code":0,"message":"非法地址"});
        return
    }
    db.selectAll("select * from novel where url = " + `'${url}'`,(e,r) => {
        if (e) {
            res.status(200).json({"code":0,"message":"服务器错误"});
            return
        }
        let tt = r.length;
        if (tt == 0) {
            res.status(200).json({"code":0,"message":"地址不存在,请新建地址"});
        } else {
            var jsonPath = r[0].path + "/data.json";
            file.get(jsonPath,function (status,data) {
                if (!status) {
                    res.status(200).json({"code":0,"message":"内部错误"});
                    return
                }
                res.status(200).json({"code":20000,"data":data});
            });
        }
    });
});
//新建小说地址
router.post('/novel/new',function (req,res) {
    var jwtValue = jwtTest(req,res);
    if (!jwtValue) {
        return
    }
    var type = req.body.type;
    if (!type) {
        res.status(200).json({"code":0,"message":"非法请求"});
        return
    }
    var nowTime = moment().format('X') + generateMixed(4)
    var newPath = `${path[type].htmlPath}/${nowTime}`;
    file.copy(path[type].templatePath,`${newPath}`,function (status) {
        if (!status) {
            res.status(200).json({"code":0,"message":"内部错误"});
            return
        }
        file.getFile(`${newPath}/index.html`,function (status,data1) {
            if (!status) {
                res.status(200).json({"code":0,"message":"内部错误"});
                return
            }
            var htmlVal = data1.toString();
            for (var i in defaultJson[type]) {
                var re = new RegExp('#{' + i + '}%','g');
                htmlVal = htmlVal.replace(re,defaultJson[type][i]);
            }
            file.writeFile1(`${newPath}/index.html`,htmlVal,function (status) {
                if (!status) {
                    res.status(200).json({"code":0,"message":"内部错误"});
                    return
                }
                var url = `${path[type].onlineUrl}/${nowTime}/index.html`;
                res.status(200).json({"code":20000,"data":defaultJson[type],"url":url});
                db.insertData("novel",{"id":null,"name":"'默认落地页'","path":`'${newPath}'`,"url":`'${url}'`});
            })
        });
    });
});
//修改小说地址的参数配置
router.post('/novel/edit',multipartMiddleware,function (req,res) {
    var jwtValue = jwtTest(req,res);
    if (!jwtValue) {
        return
    }
    var newJson = req.body;
    var url = req.query.url;
    var type = req.query.type;
    var CDNUrl = url;
    if (!url.match(`${proUrl}/${type}`)) {
        res.status(200).json({"code":0,"message":"非法地址"});
        return
    }
    db.selectAll("select * from novel where url = " + `'${url}'`,(e,r) => {
        if (e) {
            res.status(200).json({"code":0,"message":"服务器错误"});
            return
        }
        let tt = r.length;
        if (tt == 0) {
            res.status(200).json({"code":0,"message":"地址不存在,请新建地址"});
        } else {
            var relPath = r[0].path;
            var jsonPath = relPath + "/data.json";
            var imgPath = relPath + "/img/";
            var timestamp = new Date().getTime();
            for (let k in req.files) {
                var fileType = req.files[k].type.split("/")[1];
                var filePath = req.files[k].path;
                var fileName = k + timestamp + "." + fileType;
                var fileNewPath = imgPath + fileName;
                file.move(filePath,fileNewPath);
                if (k == "mainPic") {
                    if (type == "pc") {newJson.value2 = fileName} else {newJson.value4 = fileName}
                }
            }
            file.getFile(path[type].templatePath + "/index.html",function (status,data1) {
                if (!status) {
                    res.status(200).json({"code":0,"message":"内部错误"});
                    return
                }
                var htmlVal = data1.toString();
                for (var i in newJson) {
                    var re = new RegExp('#{' + i + '}%','g');
                    htmlVal = htmlVal.replace(re,newJson[i]);
                }
                file.writeFile1(relPath + "/index.html",htmlVal,function (status) {
                    if (!status) {
                        res.status(200).json({"code":0,"message":"内部错误"});
                        return
                    }
                    file.writeJson(jsonPath,JSON.stringify(newJson));
                    CDN.refreshCdn(CDNUrl);
                    res.status(200).json({"code":20000,"data":newJson});
                })
            });
        }
    });
});

router.get('/novel/del',function (req,res) {
    var jwtValue = jwtTest(req,res);
    if (!jwtValue) {
        return
    }
    var Uid = req.query.id;
    db.selectAll("select * from novel where id = " + `'${Uid}'`,(e,r) => {
        if (e) {
            res.status(200).json({"code":0,"message":"服务器错误"});
            return
        }
        file.rmdir(r[0].path);
        db.deleteData('novel',{id:Uid},(e) => {
            if (e) {
                res.status(200).json({"code":0,"message":"服务器错误"});
                return
            }
            res.status(200).json({"code":20000,"message":"删除成功"});
        });
    });

});
module.exports = router;
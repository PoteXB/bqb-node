var express = require('express');
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
var multipartMiddleware = multipart();
var redis = require("redis");
var router = express.Router();
function jwtTest(req,res) {
    var header = req.headers["x-token"];
    var jwtValue = "";
    if (header) {
        jwt.verify(header,'zhaoquano!@#%$#45897',function (err,decoded) {
            if (err) {
                res.status(200).json({"code":50014,"message":"无效请求"});
            } else {
                jwtValue = decoded;
            }
        });
    } else {
        res.status(200).json({"code":50008,"message":"无效请求"});
    }
    return jwtValue
}
router.all('*',function (req,res,next) {
    res.header('Access-Control-Allow-Headers','Content-Type, Content-Length, Authorization, Accept, X-Requested-With , x-token');
    res.header('Access-Control-Allow-Methods','PUT, POST, GET, DELETE, OPTIONS');
    if (req.method == 'OPTIONS') {
        res.end();
    }
    else {
        next();
    }
});
// 登录获取权限信息
router.post('/user/login',function (req,res) {
    let name = JSON.stringify(req.body.username);
    let pwd = req.body.password;
    let errText = '',resultData = '';
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
            },'zhaoquano!@#%$#45897',{expiresIn:'24h'});
            resultData = r[0].token;
            res.status(200).json({"code":20000,"data":{"token":token}});
        }
    });
});
router.get('/user/info',function (req,res) {
    var jwtValue = jwtTest(req,res);
    if (!jwtValue) {
        return
    }
    var r = {
        name:jwtValue.data,
        roles:[jwtValue.role],
        avatar:"https://wpimg.wallstcn.com/f778738c-e4f8-4870-b634-56703b4acafe.gif"
    };
    res.status(200).json({"code":20000,"data":r});
});
router.post('/user/logout',function (req,res) {
    var jwtValue = jwtTest(req,res);
    if (!jwtValue) {
        return
    }
    res.status(200).json({"code":20000,"data":"success"});
});
// 修改开关文件
router.post('/switch',function (req,res) {
    var jwtValue = jwtTest(req,res);
    if (!jwtValue) {
        return
    }
    if (jwtValue.role == 'user') {
        res.end();
        return
    }
    var action = req.body.action,
        type = req.body.type,
        soft_id = req.body.soft_id,
        canal_id = req.body.canal_id,
        retainType = req.body.retainType,
        showTray = req.body.showTray,
        silencePlug = req.body.silencePlug,
        deskIcon = req.body.deskIcon,
        url = '';
    //获取所有开关列表
    if (action == 'getList') {
        db.selectAll("select * from switch where type = " + JSON.stringify(type),(e,r) => {
            if (e) {
                res.status(200).json({"code":0,"message":"服务器错误"});
                return
            }
            res.status(200).json({"code":20000,"data":r});
        });
    }
    //添加渠道
    else if (action == 'add') {
        var addFile = `${file.dataUrl}switch/${type}/${soft_id}/${canal_id}/switch.json`;
        var canal_name = JSON.stringify(req.body.canal_name),
            typeStr = JSON.stringify(type),
            soft_idStr = JSON.stringify(soft_id),
            canal_idStr = JSON.stringify(canal_id);
        var defaultObj = {
            "soft":{
                "showTray":false,
                "retainType":false,
                "silencePlug":false,
                "deskIcon":0
            }
        };
        defaultObj = JSON.stringify(defaultObj);
        db.selectAll("select * from switch where type = " + typeStr + " AND soft_id = " + soft_idStr + " AND canal_id = " + canal_idStr,(e,r) => {
            if (e) {
                res.status(200).json({"code":0,"message":"服务器错误"});
                return
            }
            if (!r.length) {
                db.insertData('switch',{type:typeStr,soft_id:soft_idStr,canal_id:canal_idStr,canal_name:canal_name},(e) => {
                    if (e) {
                        res.status(200).json({"code":0,"message":"服务器错误"});
                        return
                    }
                    file.writeFile(addFile,defaultObj);
                    res.status(200).json({"code":20000,"message":"添加渠道成功"});
                });
            } else {
                res.status(200).json({"code":0,"message":"渠道已经存在"});
            }
        });
    }
    //删除某个渠道
    else if (action == 'del') {
        var delFolder = `${file.dataUrl}switch/${type}/${soft_id}/${canal_id}`;
        db.deleteData('switch',{type:type,soft_id:soft_id,canal_id:canal_id},(e) => {
            if (e) {
                res.status(200).json({"code":0,"message":"服务器错误"});
                return
            }
            file.rmdir(delFolder);
            res.status(200).json({"code":20000,"message":"删除成功"});
        });
    }
    //获取某个渠道json
    else if (action == 'get') {
        url = `${file.dataUrl}switch/${type}/${soft_id}/${canal_id}/switch.json`;
        file.get(url,function (status,data) {
            if (status) {
                res.status(200).json({"code":20000,"data":data});
            } else {
                res.status(200).json({"code":0,"data":data,"message":"获取失败"});
            }
        });
    }
    //修改某个渠道json
    else if (action == 'rev') {
        var obj = {
            "soft":{
                "showTray":showTray,
                "retainType":retainType,
                "silencePlug":silencePlug,
                "deskIcon":deskIcon,
            }
        };
        url = `${file.dataUrl}switch/${type}/${soft_id}/${canal_id}/switch.json`;
        file.revise(url,obj,function (status,data) {
            if (status) {
                res.status(200).json({"code":20000,"message":"保存成功"});
            } else {
                res.status(200).json({"code":0,"data":data,"message":"保存失败"});
            }
        });
    }
});
// 更新软件插件版本
router.post('/update',function (req,res) {
    var jwtValue = jwtTest(req,res);
    if (!jwtValue) {
        return
    }
    if (jwtValue.role == 'user') {
        res.end();
        return
    }
    var action = req.body.action,
        type = req.body.type,
        soft_id = req.body.soft_id,
        canal_id = req.body.canal_id;
    //获取所有开关列表
    if (action == 'getList') {
        db.selectAll("select * from update_ver where type = " + JSON.stringify(type),(e,r) => {
            if (e) {
                res.status(200).json({"code":0,"message":"服务器错误"});
                return
            }
            res.status(200).json({"code":20000,"data":r});
        });
    }
    //删除某个渠道
    else if (action == 'del') {
        var jsonUrl = `${file.dataUrl}update/${type}/${soft_id}/${canal_id}`;
        var fileUrl = `${file.fileUrl}${type}/update/${soft_id}/${canal_id}`;
        db.deleteData('update_ver',{soft_id:soft_id,canal_id:canal_id},(e) => {
            if (e) {
                res.status(200).json({"code":0,"message":"服务器错误"});
                return
            }
            file.rmdir(jsonUrl);
            file.rmdir(fileUrl);
            res.status(200).json({"code":20000,"message":"删除成功"});
        });
    }
    //获取插件版本
    else if (action == 'getPlugVer') {
        var plugVersion = `${file.fileUrl}ver/v.json`;
        file.get(plugVersion,function (status,data) {
            if (status) {
                var version = data;
                var plugJsonVer = `${file.fileUrl}ver/${version}/v.json`;
                file.get(plugJsonVer,function (status,data) {
                    if (status) {
                        res.status(200).json({"code":20000,"data":data,"version":version});
                    } else {
                        res.status(200).json({"code":0,"data":data,"message":"获取失败"});
                    }
                });
            } else {
                res.status(200).json({"code":0,"data":data,"message":"获取失败"});
            }
        });
    }
    //插件热更新提版本
    else if (action == 'revPlugVer') {
        var newVersion = req.body.version;
        var plugVersion1 = `${file.fileUrl}ver/v.json`;
        var newPlugJsonVer = `${file.fileUrl}ver/${newVersion}/v.json`;
        var value = req.body.value;
        file.writeFile(newPlugJsonVer,value);
        file.writeFile(plugVersion1,newVersion);
        res.status(200).json({"code":20000});
    }
});
router.post('/updateFile',multipartMiddleware,function (req,res) {
    var jwtValue = jwtTest(req,res);
    if (!jwtValue) {
        return
    }
    if (jwtValue.role == 'user') {
        res.end();
        return
    }
    var action = req.body.action,
        type = req.body.type,
        soft_id = req.body.soft_id,
        canal_id = req.body.canal_id,
        version = req.body.version,
        canal_name = req.body.canal_name,
        path = req.files.file.path, //上传文件临时路径
        fileName = req.files.file.name, //上传文件的名称
        fileUrl = `file.zhaoquano.com/${type}/update/${soft_id}/${canal_id}/${version}/${fileName}`;//上传文件的存放地址
    var canal_nameStr = JSON.stringify(canal_name),
        typeStr = JSON.stringify(type),
        soft_idStr = JSON.stringify(soft_id),
        canal_idStr = JSON.stringify(canal_id),
        versionStr = JSON.stringify(version),
        fileUrlStr = JSON.stringify(fileUrl);
    var defaultObj = {
        "soft":{
            "version":version,
            "downUrl":fileUrl
        }
    };
    defaultObj = JSON.stringify(defaultObj);
    var jsonUrl = `${file.dataUrl}update/${type}/${soft_id}/${canal_id}/config.json`;
    var newPath = `${file.fileUrl}${type}/update/${soft_id}/${canal_id}/${version}/${fileName}`;
    //添加软件版本控制
    if (action == 'add') {
        db.selectAll("select * from update_ver where type = " + typeStr + " AND soft_id = " + soft_idStr + " AND canal_id = " + canal_idStr,(e,r) => {
            if (e) {
                file.rmdir(path);
                res.status(200).json({"code":0,"message":"服务器错误"});
                return
            }
            if (!r.length) {
                db.insertData('update_ver',{type:typeStr,soft_id:soft_idStr,canal_id:canal_idStr,canal_name:canal_nameStr,version:versionStr,file_url:fileUrlStr},(e) => {
                    if (e) {
                        file.rmdir(path);
                        res.status(200).json({"code":0,"message":"服务器错误"});
                        return
                    }
                    file.writeFile(jsonUrl,defaultObj);
                    file.move(path,newPath);
                    res.status(200).json({"code":20000,"message":"添加版本更新成功"});
                });
            } else {
                file.rmdir(path);
                res.status(200).json({"code":0,"message":"渠道已经存在"});
            }
        });
    }
    //提升版本
    else if (action == 'rev') {
        db.selectAll("select * from update_ver where type = " + typeStr + " AND soft_id = " + soft_idStr + " AND canal_id = " + canal_idStr,(e,r) => {
            if (e) {
                file.rmdir(path);
                res.status(200).json({"code":0,"message":"服务器错误"});
                return
            }
            if (version != r[0].version) {
                db.updateData('update_ver',{version:versionStr,file_url:fileUrlStr},{type:typeStr,soft_id:soft_idStr,canal_id:canal_idStr},(e) => {
                    if (e) {
                        file.rmdir(path);
                        res.status(200).json({"code":0,"message":"服务器错误"});
                        return
                    }
                    file.writeFile(jsonUrl,defaultObj);
                    file.move(path,newPath);
                    res.status(200).json({"code":20000,"message":"版本更新设置成功"});
                })
            } else {
                file.rmdir(path);
                res.status(200).json({"code":0,"message":"版本号不能一样 , 且大于当前版本"});
            }
        });
    }
});
// 修改插件图文弹窗广告
router.post('/adEdit',function (req,res) {
    var jwtValue = jwtTest(req,res);
    if (!jwtValue) {
        return
    }
    if (jwtValue.role == 'user') {
        res.end();
        return
    }
    var action = req.body.action,
        type = req.body.type,
        plug_id = req.body.plug_id,
        url = '';
    //获取所有广告列表
    if (action == 'getList') {
        url = `${file.dataUrl}alertAd/${type}/${plug_id}/config.json`;
        file.get(url,function (status,data) {
            if (status) {
                res.status(200).json({"code":20000,"data":data});
            } else {
                res.status(200).json({"code":0,"data":data,"message":"获取失败"});
            }
        });
    }
    //修改广告文件
    else if (action == 'rev') {
        var value = JSON.parse(req.body.value);
        url = `${file.dataUrl}alertAd/${type}/${plug_id}/config.json`;
        file.revise(url,value,function (status,data) {
            if (status) {
                res.status(200).json({"code":20000,"message":"保存成功"});
            } else {
                res.status(200).json({"code":0,"data":data,"message":"保存失败"});
            }
        });
    }
});
// 软件日活安装卸载统计
router.post('/count',function (req,res) {
    var jwtValue = jwtTest(req,res);
    if (!jwtValue) {
        return
    }
    var todayData = [];
    var soft_id = req.body.soft_id;
    var canal_id = req.body.canal_id;
    if (jwtValue.data.replace(/[^0-9]/ig,'') !== canal_id) {
        res.end();
        return
    }
    var time = req.body.time ? req.body.time : moment().format('YYYYMMDD');
    var todayTime = moment().format('YYYYMMDD');
    if (time == todayTime) {
        var client = redis.createClient();
        client.on("error",function (err) {
        });
        var hashKey = '';
        if (canal_id) {
            hashKey = `hour_${soft_id}_${canal_id}_${time}`;
        } else {
            hashKey = `hour_${soft_id}*${time}`;
        }
        client.KEYS(hashKey,function (err,e) {
            var start = 0;
            var arrLength = e.length;
            if (arrLength == 0) {
                client.quit();
                res.status(200).json({"code":20000,"data":todayData});
                return
            }
            for (var i = 0,item; item = e[i++];) {
                !function () {
                    var name = item;
                    var soft_id = item.split("_")[1];
                    var canal_id = item.split("_")[2];
                    var time = item.split("_")[3];
                    client.HGETALL(name,function (err1,data) {
                        var uninstall_num = 0,install_num = 0,active_num = 0,newActive_num = 0;
                        for (var j in data) {
                            if (j.split('_')[1] == 'active') {
                                active_num += data[j] * 1;
                            } else if (j.split('_')[1] == 'install') {
                                install_num += data[j] * 1;
                            } else if (j.split('_')[1] == 'uninstall') {
                                uninstall_num += data[j] * 1;
                            } else if (j.split('_')[1] == 'newActive') {
                                newActive_num += data[j] * 1;
                            }
                        }
                        todayData.push({soft_id:soft_id,canal_id:canal_id,time:time,active:active_num,install:install_num,uninstall:uninstall_num,newActive:newActive_num});
                        start++;
                        if (start == arrLength) {
                            client.quit();
                            res.status(200).json({"code":20000,"data":todayData});
                        }
                    });
                }();
            }
        });
    } else {
        var sqlKey = '';
        if (canal_id) {
            sqlKey = `select * from soft_active where soft_id = ${JSON.stringify(soft_id)} AND hour_time = ${time} AND canal_id = ${JSON.stringify(canal_id)}`
        } else {
            sqlKey = `select * from soft_active where soft_id = ${JSON.stringify(soft_id)} AND hour_time = ${time}`;
        }
        db.selectAll(sqlKey,(e,r) => {
            if (r.length) {
                for (var i = 0,item; item = r[i++];) {
                    todayData.push({soft_id:item.soft_id,canal_id:item.canal_id,time:item.hour_time,active:item.active_num,install:item.install_num,uninstall:item.uninstall_num,newActive:item.newUse_num})
                }
            }
            res.status(200).json({"code":20000,"data":todayData});
        });
    }
});
module.exports = router;
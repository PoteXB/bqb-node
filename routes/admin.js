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
router.post('/user/loginU',function (req,res) {
    let name = JSON.stringify(req.body.username);
    let pwd = req.body.password;
    let errText = '',resultData = '';
    db.selectAll("select * from user1 where uname = " + name,(e,r) => {
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
        url = `${file.fileUrl}alertAd/${type}/${plug_id}/config.json`;
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
        url = `${file.fileUrl}alertAd/${type}/${plug_id}/config.json`;
        file.revise(url,value,function (status,data) {
            if (status) {
                res.status(200).json({"code":20000,"message":"保存成功"});
            } else {
                res.status(200).json({"code":0,"data":data,"message":"保存失败"});
            }
        });
    }
    //刷新CDN
    else if (action == 'fresh') {
        console.log(1);
    }
});
// 软件日活安装卸载统计
function chuliNum(num,zhekou) {
    var relNum = "";
    if (zhekou == 1) {
        relNum = num;
        return relNum
    }
    if (num < 100) {
        relNum = num
    } else if (num >= 100 && num < Math.ceil(100 / zhekou)) {
        relNum = 100
    } else if (num >= Math.ceil(100 / zhekou)) {
        relNum = Math.ceil(num * zhekou)
    }
    return relNum
}
router.post('/count',function (req,res) {
    var jwtValue = jwtTest(req,res);
    if (!jwtValue) {
        return
    }
    var todayData = [];
    var soft_id = req.body.soft_id;
    var canal_id = req.body.canal_id;
    var zhekou = 1;
    if (jwtValue.role == "user" && (jwtValue.data.replace(/[^0-9]/ig,'') !== canal_id)) {
        res.end();
        return
    }
    var time = req.body.time ? req.body.time : moment().format('YYYYMMDD');
    var todayTime = moment().format('YYYYMMDD');
    if (jwtValue.role == "user") {
        file.get("/alidata/api.zhaoquano.com/myapp/rule.json",function (status,data) {
            if (status) {
                var rule = data[canal_id];
                var switch1 = 1;
                for (var i = 0; i < rule.length; i++) {
                    if (time >= rule[i].time) {
                        zhekou = rule[i].z;
                        switch1 = 0;
                        break;
                    }
                }
                if (switch1) {
                    zhekou = 1;
                }
            } else {
                res.end();
            }
        });
    }
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
                        todayData.push({
                            soft_id:soft_id,
                            canal_id:canal_id,
                            time:time,
                            active:chuliNum(active_num,zhekou),
                            install:chuliNum(install_num,zhekou),
                            uninstall:chuliNum(uninstall_num,zhekou),
                            newActive:chuliNum(newActive_num,zhekou)
                        });
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
                    todayData.push({
                        soft_id:item.soft_id,
                        canal_id:item.canal_id,
                        time:item.hour_time,
                        active:chuliNum(item.active_num,zhekou),
                        install:chuliNum(item.install_num,zhekou),
                        uninstall:chuliNum(item.uninstall_num,zhekou),
                        newActive:chuliNum(item.newUse_num,zhekou)
                    })
                }
            }
            res.status(200).json({"code":20000,"data":todayData});
        });
    }
});
/////////////////
//新建地址默认模板
var defaultJson = {
    "modify1":"show",
    "modify2":"这个是标题",
    "modify3":"官方快讯：该文章已被微信阅读官方收录。",
    "modify4":"show",
    "modify5":"default-main.png",
    "modify6":"<p>你是否见过一个奇怪的老板，把顾客剁成肉酱，蒸成一笼笼大包子出售？</p><p>你是否见过一个奇怪的医生，把情敌整容成猪，囚禁在养殖场中？</p><p>你是否见过一个奇怪的孤儿，从小被蝙蝠养大，以吸人血为生？</p><p>我都见过</p>",
    "modify6_1":"show",
    "modify7":"<p>林奇最近发现一件怪事。</p><p>他的眼睛，能穿透物体的外在，看清楚事物的本质。</p><p>例如现在……</p><p>站在他面前的是金海医院的院长江若晴，高挑的身材足有一米七五，五官精致，黑发如瀑，而无形中更有一股冰冷高贵的气质，仿佛拒人千里，但并不妨碍她成为金海医院男牲口心目中的女神。</p><p>但在林奇的眼中，这位女神的衣服，完全消失了。</p><p>或者说林奇的视线，穿透了江若晴的外衣，能清楚看到羊脂白玉般的肌肤。</p><p>“等等，冰山女神江若晴，居然穿得这么火辣。”</p><p>林奇眉头一挑，但同时眼睛一阵刺痛传来，随后眼前模糊不清了。</p><p>这个奇怪的能力，最多只能维持三秒，就必须要休息。</p><p>似乎注意到林奇的目光，江若晴有种被看光的感觉，他敲了敲桌子寒声道：“林奇，你的医学报告，准备好了吗？”</p><p>“准，准备好了。”林奇猛然惊醒，揉了揉眼睛，周围恢复了正常。</p><p>他正坐在会议室，周围还有好十几名医生，每个人都已经交了医学报告。</p><p>林奇只不过是个实习医生，虽然把医学报告赶忙递给了江若晴，但难免给人坏印象。</p><p>“你的医学报告，是你自己写的？”江若晴只是扫了一眼，便放下了林奇的报告。</p><p>“是的，我昨天熬夜赶出来的。”林奇自信的说道，他是中医世家，小小的医学报告自然不在话下。</p><p>“为什么，你跟刘医生的报告一样？”江若晴脸色一寒，娇喝道：“老实交代，你是不是抄袭刘医生的？”</p><p>“怎么可能，这份报告是我亲手写的，在办公室熬了一夜，许多值班护士都看到了。”</p><p>林奇大声喊冤，同时看了侧面的刘江伟一眼。</p><p>刘江伟跟林奇是一个科室，刚到金海医院不过几个月，就已经转正，据说他是靠关系进来的。</p><p>“江院长，你也别怪他，我昨天写完报告就丢抽屉里面了，说不定被风吹出来了呢。”刘江伟嘴角勾起一抹冷笑，暗带指责。</p><p>“不可能，你的抽屉每次都上锁，怎么会被吹出来？”</p><p>林奇突然想起来，昨天熬夜写完后，在桌子上小睡了一会，醒来后发现他写的报告，有被人动过的痕迹。</p><p>现在，刘江伟的医学报告和他的一样，分明就是被他复制了。</p><p>“别吵了，你们两个的医学报告，我都看过了，上面的内容观点很全面，甚至很独到，有点像是经验丰富的老医生写的。”</p><p>说道这里，江若晴瞟了林奇一眼：“我觉得，一个实习医生，不可能写出这样的医学报告！”</p><p>“江院长，这真的是我写的，我敢发誓。”林奇冤枉极了，这份报告他花费了极大心血，但现在却被指控为抄袭。</p><p>两人的医学报告就摆在会议桌上，隔得近的几个医生瞄了一眼，不禁大为奇怪。</p><p>“这份报告，上面有很多观点，看了有种醍醐灌顶的感觉，是出自名医之手吧。”</p><p>“没错，特别是这种思路，一定绝非等闲之辈，的确不像是实习医生能写出来的。”</p><p>“抄袭就抄袭，人家刘医生是海归高材生，能有写出这样的报告，不足为奇。”</p><p>这些话就像是一道雷劈中了林奇，让他两眼发晕，居然没有一个人相信是他写的。</p><p>“林奇，从今天开始，你去门口当保安，没有反省过来，不允许给任何人看病！”江若晴指着门口，毫不留情。</p><p>林奇握紧了拳头，他很想大骂刘江伟卑鄙，但他现在没有证据，如果顶撞江若晴，反倒会被有心人借题发挥，到时候连实习的机会都没有。</p><p>林奇忍住，艰难的说道：“好，我现在就去。”</p><p>“呵呵，这种人怎么还有脸待在这里，要是我，早就滚出金海医院大门了！”刘江伟阴笑道。</p><p>其他医生不禁嘲讽道：“这人是不是傻啊？”</p><p>“是啊，你看他的样子，像条狗一样。”</p><p>“……”</p><p>林奇不知道怎么走出会议室的，那些议论声，让他窝火到了极点。</p><p>凭什么别人认为，他写不出那样优秀的医学报告？</p><p>难道就因为他是一个实习医生吗？</p><p>只是林奇没有背景关系，如果连实习机会都丢掉了话，不仅没有饭吃，还会因为这事，以后连工作都很难找到，生活不易，有些时候不是没骨气，而是被逼无奈。</p><p>好在，林奇想起外公话，心中突然释然了。</p><p>回到宿舍舒服的洗了个澡，林奇将一本厚厚的古书拿了出来。</p><p>上面有一行外公的字迹：医者，当胸怀博大，容天下，医治天下！</p><p>林奇自幼跟外公学习医术，后来因为异地上学，便是将这本家传古书交给了他。</p><p>翻开古书，上面全都是古文，至少有几百年历史，但奇怪的是上面的字迹依旧很清晰。</p><p>而这上面的东西无比奥妙，林奇至今只还没看完第一页，虽然很多不懂，但书读百遍其义自见，他的刻苦从中领悟了不少东西。</p><p>到了安静的凉亭，林奇借着灯光细细品读。</p><p>刚看了没一会，林奇的面前出现了一个俏生生的女孩，抬头一看，正是他的女朋友李婉云。</p><p>“婉云，你怎么有空过来？”林奇满心欢喜，上前想要拥抱。</p><p>只是李婉云向后退了一步，脸上有些厌恶之色，林奇神色一僵，发现她手上多了个金手镯。</p><p>“这个金镯子，是周少送给我的。”李婉云抬起手，那金镯子无比闪亮。</p><p>林奇只感觉分外的刺眼：“婉云，你不是很讨厌周少吗？”</p><p>“以前和你都出生农村，是我没见过世面，现在长大了，我才知道某些东西的价值，你知道这个金镯子值多少钱吗？有可能，你一辈子都赚不到！”</p><p>“婉云，你什么意思？这些东西，我也可以通过努力买到。”林奇咬紧牙关。</p><p>“别说这些笑话了！你要钱没钱，要关系没关系，你不管怎么努力，都只是个医生，永远不可能理解有钱人的生活……”</p><p>冷漠的声音，让林奇如坠冰窖。</p><p>“婉云，给个机会，我会证明自己的。”林奇几乎大吼道。</p><p>“证明？呵呵，证明你在医院当保安？我的意思，你还不明白吗？”李婉云脸上浮起一抹冷笑，说道：“我们分手吧！林奇，我们是不可能的。”</p><p>“就这样，周少就在外面等我，再见，不，不用再见了。”李婉云说完就转身走到大门口，上了一辆红色的法拉利跑车。</p><p>跑车上坐着一个年轻男子，他似乎等的有些不耐烦：“婉云，怎么用了这么久，一个连父母都不知道是谁的野种，有什么好说的？”</p><p>“周少，走吧，我把他所有联系方式都删了，你就放心啦，一个野种能有什么前途？”</p><p>林奇如遭雷击，愣在原地，看着女友在男子怀中撒娇，然后依偎着驱车离去，他的大脑嗡嗡作响，一片空白。</p><p>他家在农村，自幼便被父母狠心抛弃，甚至都不知道他们叫什么名字。</p><p>好在外公抚养他长大的，只是年事渐高，他便是一边打工一边上学，偶尔攒下来的钱，还能寄回去给外公零用。</p><p>李婉云和他在一个村长大，青梅竹马，彼此自然不会隐瞒，只是没想到来到金海省城，一切都变了，就连这些东西，都成为了对方分手的理由。</p><p>“为什么，这到底是为什么……”林奇气愤的仰天长啸，一拳狠狠砸下。</p><p>他的拳头，正好落到古书尖锐的书角。</p><p>噗嗤一下擦破了皮，鲜红的血顺着拳头汩汩溢出，缓缓流到古书之上，随后奇怪的事情发生了。</p><p>那古书像是突然醒了，竟然一张一合像是开始呼吸，自主的吸收林奇鲜血，源源不断。</p><p>林奇顿时吓了一跳，恍惚间他感觉这本古书，像是要把他全身血液全部抽干。</p><p>只是失血的虚弱，让他意识逐渐模糊，林奇张开嘴却是叫不出半点声音，眼睁睁的看着那本古书吸血，变的越来越鲜红。</p><p>最后他眼前一黑，直接晕了过去。</p><p>恍惚间，脑海里隐隐有一个声音吟唱：林家血，启传承，神瞳现，济世人！</p><p></p><p>迷迷糊糊……</p><p>林奇感觉眼见一花，竟然来到了一个未知的空间，四周无比黑暗，苍茫一片。</p><p>随后，他的眼前突然出现了那本古书。</p><p>古书自动翻开，第一页之上，突然蹦出一个黑袍道士的虚影。</p><p>“我是林家魂，自创鬼医门，今日传承启，绝学只送你，鬼门十三针，你且看好！”</p><p>只见那道士手中有几根银针，如穿花蝴蝶般飞舞，玄妙无比。</p><p>林奇瞬间如醍醐灌顶，只感觉原本第一页上无法理解的医学知识，霎那间融会贯通。</p><p>原来这本古书，竟然需要鲜血启动传承！</p><p>林奇似乎明白了什么，眼前一动，随后第二页主动翻开，又蹦出来一个身披袈裟和尚的虚影。</p><p>“我是林家魂，毕生渡众人，今日传承启，佛医只传你，回阳九针，你且学全！”</p><p>那和尚如同信手拈来，手中针竟然能逆天还阳，真叫人拍案叫绝。</p><p>林奇虽感觉极其生涩，但这些东西不由分说，只往脑海里钻去。</p><p>第三页，蹦出来一个邋遢无比的教派人士。</p><p>“我是林家魂，驱尽鬼邪神，今日传承启，神魔要怕你，五行摄魂阵，你莫眨眼！”</p><p>教派人士，手中闪现出一个神奇的五芒星阵法，驱百邪治恶物。</p><p>第四页，一个高深的神棍。</p><p>“我是林家魂，算懂天下人，今日传承启，乾坤全归你，占星卜月术，你要认真！”</p><p>第五页……</p><p>“我是林家魂……”</p><p>……这本古书，总共有一百零八页，每页都有一个人蹦出来教导林奇。</p><p>有医道占卜，修行道诀，天地鬼邪，风水玄术，针灸之法……</p><p>纷杂的东西又包罗万象，林奇见所未见，只觉每一样都是无比玄妙。</p><p>而这些庞大的信息，汹涌的冲进了林奇的脑中，让他感觉脑袋根本装不下，最终意识模糊的晕了过去。</p><p>也不知道过了多久，林奇终于醒来，急忙看了一下手，伤口竟然已经愈合。</p><p>他揉了揉眼睛，再拿过血色古书一翻，这时，古书竟然无火自燃起来，缓缓飘向空中，火光腾腾。</p><p>与此同时，一百零八个声音齐声道：“生是林家人，死是林家魂，如果林家小辈，满十八岁之后，有幸觉醒林家血脉中千年难见的神瞳，能看常人不能见到的东西，那就说明你是林家唯一的传承者！”</p><p>“得吾传承，悬壶济世，渡尽众生，医治天下，功德无量，天佑后人！”</p><p>随着最后一声落下，那古书燃烧成了灰烬，风一吹就散了。</p><p>林奇揉了揉发晕的脑袋，回想了方才的发生的一切。</p><p>那些传承，包含的东西很多，林奇只感觉整个人突然充实无比，而那奇妙的玄学法术又让人十分惊奇。</p><p>愣了半响，林奇不禁怀疑，是不是在做梦，这些东西真的存在吗？</p><p>可看到那古书的灰烬，这一切又是那么的真实，那些画面和声音，仿佛就像是烙印般刻在他的脑海里。</p><p>记忆中，有一位传承人教导了混元真气诀，林奇照此法打坐呼吸，没过一会，他的身体竟然有一丝真气涌动。</p><p>“果然是真的。”林奇收功吐出一口浊气，只感觉神清气爽，全身畅通。</p><p>不觉间，天色已经大亮，可林奇没有半点疲乏，反而精神奕奕，什么不悦都抛诸脑后。</p><p>林奇翻出一个电话，满脸释然，他给李婉云发出了一个信息：“公园小树林，我想找你拿点东西。”</p><p>他有几本医书被李婉云拿去了，现在既然没有关系，那便是拿回来，而公园小树林的位子两个人都比较熟悉。</p><p>不过对方没有马上回信息，林奇随意的洗了把脸，赶忙走到了保安室上班。</p><p>保安的工作无趣至极，看着人来人往，守着几米平的地方，几个保安也没有交流，林奇觉得很憋屈，在这里好像一身功夫都施展不出来。</p><p>就在这时，手机“嗡嗡”响了两声，林奇拿起手机，想看看对方到底什么态度。</p><p>可是，当林奇打开手机的时候，他整个人彻底愣住。</p><p>“老天，用不着这样玩我吧！”林奇真想扇自己两下，这条信息发错了，他当时一不小心，竟然把这条信息发给了江若晴江院长！</p><p>而且，最关键的是江若晴还回了一条信息：“你想约我打野战？”</p><p>林奇懵了。</p><p>江若晴是出名的冷面美人，管理毒辣，行事专横，开除一个人从来不讲情面。</p><p>这条短信突然发过去，肯定是被她想成那种搔扰信息了。</p><p>这该怎么回啊？</p><p>林奇深吸了一口气，很快发现了一点关键，江若晴根本没有他的电话！</p><p>基本上医生都有江若晴电话，但林奇没有跟她联系过，只是存着以备不时之需，所以她不知道是林奇。</p><p>想到这里，林奇胆子大了起来，昨天这女人清白不分，单凭个人观点，就认为那报告不是他写的，这让林奇心有怨气。</p><p>反正她不知道我是谁！</p><p>林奇直接发了一条短信：“就想跟你好，咋地？”</p><p>刚发过去，江若晴就回了，还发了一个羞羞的表情：“你好坏，好讨厌！”</p><p>说真的，林奇当时彻底懵了，这还是那个高高在上的冰山美女江若晴吗？</p><p>平时不是挺冷傲的吗？现在怎么这样了？难道是春心萌动了？</p><p>林奇一时想不明白，便回道：“你有没有男朋友？”</p><p>“没有，我从来没有谈过男朋友，只是想跟一个陌生人随便聊聊。”</p><p>“那你是不是寂寞，想人了？”林奇越发大胆了起来。</p><p>“说实话，我是一个正常的女人，晚上的时候，嗯，我承认是有点寂寞空虚冷，想要那个，可是我又害怕……对了，你照片发来我看看，我不想聊天对象是个邋遢的老男人。”</p><p>看到江若晴的话，林奇心脏怦怦直跳，没想到她的思想如此火辣，还想要那个！</p><p>“要发照片也行，你先发几张我看看。”林奇心脏忽上忽下，谁能想到，这个平时冷傲无比的上司，竟然跟他发着如此露|骨的短信。</p><p>果然，没过半分钟，一条彩信发了过来，林奇一看鼻血都差点喷了出来。</p><p>江若晴一共发了五六张照片，那叫一个火辣，有穿短裤的，也有穿睡衣的，还有穿在高跟鞋的，那小蛮腰的曲线和腿形，绝对是极品。</p><p>回想起她高高在上，怒斥林奇的样子，以及现在的巨大反差。</p><p>林奇心中，突然涌出了股爽快感，脑子热血一冲，最后发了条短信：“没穿衣服的照片，发一张！”</p><p>发完这条，林奇感觉他太猥琐了。</p><p>但这也不能全怪林奇，只能说江若晴这个女人，对男人诱或太大。</p><p>平时那副冰山寒面的模样，高傲无比，谁见了都要退避三舍，可现居然被林奇掀开了高冷外衣，发现她最火辣的一面。</p><p>“不行，那种照片不可以，再说我现在也发不了。”</p><p>江若晴的回复，林奇感觉有些失望，只是现在她应该在办公室上班，肯定发不了。</p><p>林奇刚准备回条短信，医院门口响起了马达的轰鸣声，咯吱一声急刹，停下了一辆宾利。</p><p>一个穿着西装的中年男子急匆匆下了车，将后门打开，小心翼翼的抱起了一位面色苍白的女孩。</p><p>那女孩浑身软绵无力，仿佛就断气了一般，林奇目光一凝，神瞳开启扫去，却发现女孩全身正常，没有一点生病的现象，只能说有点虚弱。</p><p>他得到传承之后，便了解这眼睛变化，是林家血脉中千年难见的神瞳觉醒，不仅能透视，别人有没有病，基本一看便知一二。</p><p>那穿西装的中年男子走到保安室，一看到有人，急声道：“保安，你快拿担架过来，抬我们小姐进去看病，她快不行了。”</p><p>“她没病。”林奇摇头道。</p><p>“怎么可能，我家小姐昏迷了三天三夜，怎么可能没病。”中年男子大喝道：“你又不是医生，赶紧叫医生过来。”</p><p>“我百分百敢肯定，她是没病装病。”林奇认真道。</p><p>话音刚落，他身后便是有一个不屑的声音传了过来：“这是哪里来的神医，看一眼，就知道人家有病没病？”</p><p>林奇回头一看，只见刘江伟正走了过来，似笑非笑的表情。</p><p>林奇冷哼了一声，最后还是让开了，他现在就是一保安，哪里轮的到他看病坐诊，更何况这个女孩根本没病。</p><p>“你就是医生？”中年男子看了一刘江伟，爆喝道：“还愣在那里干什么，赶快送我家小姐进去看病，要是有什么闪失，你就等着承受苏天磊的怒火吧！”</p><p>“苏天磊？你说的是苏氏集团的老总？”刘江伟迟疑道。</p><p>“在金海，还有第二个苏天磊吗？这个就是苏家大小姐，苏明月！”中年男子喝道。</p><p>刘江伟顿时脸色大变，打了个冷颤，赶忙道：“你放心，我马上联系急诊室，林奇，你站着干嘛，赶快拿担架来抬苏小姐进去！”</p><p>苏氏是金海市排名前三的大集团，旗下资产十几亿，这所医院就是他们投资建立的。</p><p>刘江伟紧张的不行，这要是出了什么闪失，他就不用在这干了。</p><p>“我说她没病！”林奇声音提高了八度。</p><p>“谁说她没病？你难道看不出来，苏小姐面无血色吗？要是没病，会成这幅样子？”刘江伟大吼道。</p><p>“保安，不管她有病没病，你抬进去检查一下，难道不可以吗？”中年男子瞪了林奇一眼。</p><p>刘江伟大喝道：“林奇，作为医院的保安，抬病人进去检查，是你的职责！”</p><p>医院的保安，的确和其他地方有区别，平常有重症的病人，必须要搭把手抬着，所以保安室里也有准备担架。</p><p>“行，你们非要检查，就让你们检查好了。”林奇哼了一声，拿出担架将苏明月抬到了二楼急诊室。</p><p>只是检查完了之后，刘江伟拿着诊断结果，突然愣住了。</p><p>苏明月的身体一切正常，如果非要说的话，那就是血糖有点低，通俗点讲，就是两三天没吃饭，肚子饿，身子虚。</p><p>“这还真没病啊。”刘江伟不禁嘀咕道：“林奇这小子是怎么知道了？”</p><p>“医生，苏小姐怎么样了？”中年男子大汗淋漓的问道。</p><p>“她……她，没病！”刘江伟艰难道。</p><p>“狗屁不通，你这个庸医，苏小姐昏迷了三天三夜，怎么可能没病？”</p><p>中年男子大喝道，他是苏家的管家，三天前清楚看到苏明月还活蹦乱跳的，可就第二天，她就躺床上，怎么也叫不醒了。</p><p>“我在检查一下吧。”刘江伟怕检查出了错，只是连续检查了三遍，结果都是一样。</p><p>这个时候，林奇实在忍不住了，冷哼着说道：“其实，让苏小姐醒过来很简单。”</p><p>“你只是一个保安，这里没你说话的地方。”刘江伟不禁恼火道。</p><p>“那你倒是治啊，你是医生，你倒是现在把人家弄醒啊！废物！”</p><p>林奇几乎大吼道，他实在是受够了。</p><p>“你，你竟然骂我废物？”刘江伟脸色青紫，几乎要暴走。</p><p>中年男子一把将刘江伟推开，怒然道：“吵什么！你既然治不好病，就滚一边去！”</p><p>随后，他又对着林奇，无比恭敬道：“这位保安，你真的有办法，让苏小姐醒来？</p><p>其实，中年男子也是病急乱投医，现在苏明月就是醒不过来，让这个保安试试也行啊。</p><p>“嗯，你去找一只猫，还有一杯牛奶。”林奇早就想好了。</p><p>“猫和牛奶？”中年男子愣住道：“这真的能治病吗？”</p><p>就在这时，一阵脚步声传来，随后出现一个穿着白大褂的白胡子老人。</p><p>这位便是金海医院的首席医生，人称龙老。</p><p>据说十岁学医，中医造诣达到巅峰，没有他看不好的病。</p><p>“龙老，你来的正好，这小子居然要用猫和牛奶治病！”刘江伟指着林奇，立刻就告状。</p><p>“他是谁？”龙老淡淡的看了一眼林奇，似乎没怎么见过。</p><p>“他是个实习医生，结果犯了错误，被江院长发配去当保安。”</p><p>“实习医生？保安？”龙老顿时脸色一变，诉斥道：“胡闹！你能看什么病，一边去！”</p><p>龙老狠狠瞪了林奇一眼，便是走到了苏明月的身边，替她把脉。</p><p>刘江伟不屑哼了一声，腰杆顿时挺得笔直。</p><p>其实在金海医院都知道，刘江伟正是龙老的外甥，他正是靠着龙老的关系，从实习医生转正。</p><p>只是这龙老刚把脉，脸上便露出一抹疑惑之色，随后伸手到苏明月脖子上，又是一阵奇怪，最后他沉默了半响，站起来摇头道：“这病，我看不了，你们去别的医院吧。”</p>",
    "modify8":"default-code.png",
    "modify12":"show",
    "modify13":"default-right.png",
    "modify14":"cnzz"
};
//计数命名文件路径
var numPath = "/alidata/novel.zhaoquano.com/pc/num.json";
//项目根路径
var rootPath = '/alidata/novel.zhaoquano.com';
//模板项目路径
var templatePath = "/alidata/novel.zhaoquano.com/pc/template";
//页面路径
var htmlPath = "/alidata/novel.zhaoquano.com/pc/";
//线上地址
var onlineUrl = "http://novel.zhaoquano.com/pc/";
//获取小说地址的参数配置
router.post('/articleGet',function (req,res) {
    var jwtValue = jwtTest(req,res);
    if (!jwtValue) {
        return
    }
    if (jwtValue.role == 'user') {
        res.end();
        return
    }
    var url = req.body.url;
    if (!url.match("novel.zhaoquano.com/pc")) {
        res.status(200).json({"code":0,"message":"非法地址"});
        return
    }
    try {
        url = url.split("//");
        var start = url[1].indexOf("/");
        url = url[1].substring(start);
        var lastName = url.split("/")[url.split("/").length - 1];
        if (lastName.match(".html")) {
            url = url.split(lastName)[0]
        }
    } catch (err) {
        res.status(200).json({"code":0,"message":"非法地址"});
        return
    }
    //  url通过地址获取路径大概为  /pc/1/
    url = rootPath + url + "data.json";
    file.getPath(url,function (status,data) {
        if (!status) {
            res.status(200).json({"code":0,"message":"内部错误"});
            return
        }
        if (!data) {
            res.status(200).json({"code":20000,"message":"不存在当前地址"});
            return
        }
        file.get(url,function (status,data) {
            if (!status) {
                res.status(200).json({"code":0,"message":"内部错误"});
                return
            }
            res.status(200).json({"code":20000,"data":data});
        });
    });
});
//新建小说地址
router.post('/articleNew',function (req,res) {
    var jwtValue = jwtTest(req,res);
    if (!jwtValue) {
        return
    }
    if (jwtValue.role == 'user') {
        res.end();
        return
    }
    file.get(numPath,function (status,data) {
        if (!status) {
            res.status(200).json({"code":0,"message":"内部错误"});
            return
        }
        file.copy(templatePath,htmlPath + data,function (status) {
            if (!status) {
                res.status(200).json({"code":0,"message":"内部错误"});
                return
            }
            file.writeJson(numPath,data + 1);
            file.getFile(htmlPath + data + "/index.html",function (status,data1) {
                if (!status) {
                    res.status(200).json({"code":0,"message":"内部错误"});
                    return
                }
                var htmlVal = data1.toString();
                for (var i in defaultJson) {
                    var re = new RegExp('#{' + i + '}%','g');
                    htmlVal = htmlVal.replace(re,defaultJson[i]);
                }
                file.writeFile1(htmlPath + data + "/index.html",htmlVal,function (status) {
                    if (!status) {
                        res.status(200).json({"code":0,"message":"内部错误"});
                        return
                    }
                    var url = onlineUrl + data + "/index.html";
                    res.status(200).json({"code":20000,"data":defaultJson,"url":url});
                })
            });
        });
    });
});
//修改小说地址的参数配置
router.post('/articlePost',multipartMiddleware,function (req,res) {
    var jwtValue = jwtTest(req,res);
    if (!jwtValue) {
        return
    }
    if (jwtValue.role == 'user') {
        res.end();
        return
    }
    var newJson = req.body;
    var url = req.query.url;
    var CDNUrl = url;
    try {
        url = url.split("//");
        var start = url[1].indexOf("/");
        url = url[1].substring(start);
        var lastName = url.split("/")[url.split("/").length - 1];
        if (lastName.match(".html")) {
            url = url.split(lastName)[0]
        }
    } catch (err) {
        res.status(200).json({"code":0,"message":"非法地址"});
        return
    }
    //  url通过地址获取路径大概为  /pc/1/
    var path = rootPath + url;
    var jsonPath = path + "data.json";
    var imgPath = path + "img/";
    var timestamp = new Date().getTime();
    for (let k in req.files) {
        var fileType = req.files[k].type.split("/")[1];
        var filePath = req.files[k].path;
        var fileName = k + timestamp + "." + fileType;
        var fileNewPath = imgPath + fileName;
        file.move(filePath,fileNewPath);
        if (k == "imgMain") {
            newJson.modify5 = fileName
        } else if (k == "imgCode") {
            newJson.modify8 = fileName
        } else if (k == "imgBottom") {
            newJson.modify10 = fileName
        } else if (k == "imgRight") {
            newJson.modify13 = fileName
        }
    }
    file.getFile(templatePath + "/index.html",function (status,data1) {
        if (!status) {
            res.status(200).json({"code":0,"message":"内部错误"});
            return
        }
        var htmlVal = data1.toString();
        for (var i in newJson) {
            var re = new RegExp('#{' + i + '}%','g');
            htmlVal = htmlVal.replace(re,newJson[i]);
        }
        file.writeFile1(path + "/index.html",htmlVal,function (status) {
            if (!status) {
                res.status(200).json({"code":0,"message":"内部错误"});
                return
            }
            file.writeJson(jsonPath,JSON.stringify(newJson));
            res.status(200).json({"code":20000,"data":newJson});
        })
    });
});
module.exports = router;
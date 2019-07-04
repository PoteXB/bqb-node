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
var tokenKey = "qili!@#%$#45897"; //登录秘钥
var wxCloud = {
    env:'test-39qs6',  //云环境ID
    invokeCloudFunctionUrl:'https://api.weixin.qq.com/tcb/invokecloudfunction',  //触发微信云服务接口地址
    dbEmoteGroupName:'emoteGroup',                                               //微信云数据库表情包库名字
    dbEmoteName:'emote',                                                         //微信云数据库表情库名字
    dataBaseQueryUrl:'https://api.weixin.qq.com/tcb/databasequery',              //微信云数据库查询接口地址
    dataBaseAddUrl:'https://api.weixin.qq.com/tcb/databaseadd',                  //微信云数据库添加接口地址
    dataBaseDeleteUrl:'https://api.weixin.qq.com/tcb/databasedelete',            //微信云数据库删除接口地址
    dataBaseUpdateUrl:'https://api.weixin.qq.com/tcb/databaseupdate',            //微信云数据库修改接口地址
    dataBaseCountUrl:'https://api.weixin.qq.com/tcb/databasecount',              //微信云数据库统计记录数接口地址
};
var lock = 0;         //微信token失效锁
var access_token = "23_xSf0NX1blpPwwIVa2_dduYSZFQQ8n4Q-9aH3k0D0N2UKiq-4kWtO7DnlL5wNi1iQYHrMfgC9GxyA1gMErIvEu9IYfZoBHLisuIERgNu5FUtnMxpPvTxkhNyVxsCHYAI5lBNOha5Tsqgx7X3LKUEeABATDN";
var processEnv = process.env.NODE_ENV;
//获取最新token值
function getAccessToken() {
    utils.getAccessToken().then((body) => {
        console.log(body.access_token);
        access_token = body.access_token ? body.access_token : ""
    }).finally(() => {
        lock = 0
    });
}
router.all('*',function (req,res,next) {
    res.header('Access-Control-Allow-Headers','Content-Type, Content-Length, Authorization, Accept, X-Requested-With , x-token');
    res.header('Access-Control-Allow-Methods','PUT, POST, GET, DELETE, OPTIONS');
    if (req.method == 'OPTIONS') {
        res.end();
    } else {
        if ('/user/login' == req.path || (processEnv == 'development' && req.path != '/user/info')) {
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
// 添加表情包
router.post('/emoteGroup/add',function (req,res) {
    let {body} = req;
    let {name,icon,state,sort} = body;
    let {env,dbEmoteGroupName,dataBaseAddUrl} = wxCloud;
    if (!name || !icon || !state || !sort) {
        res.status(200).json({"code":0,"message":"参数错误"});
        return;
    }
    let data = {
        "env":env,
        "query":`db.collection("${dbEmoteGroupName}").add({
          data: [
            {
              name: "${name}",
              icon: "${icon}",
              state: ${state},
              num: 0,
              updateTime: new Date(),
              sort: ${sort}
            }
          ]
        })`
    };
    let options = {
        method:'POST',
        url:dataBaseAddUrl,
        qs:{access_token},
        headers:{'content-type':'application/json'},
        body:data,
        json:true
    };
    if (lock) {
        res.status(200).json({"code":20000,"data":{"lock":true}});
        return
    }
    request(options,function (error,response,body) {
        if (error) {
            res.status(200).json({"code":0,"message":"云开发错误"});
            return
        }
        if (body.errcode == 42001 || body.errcode == 41001) {
            lock = 1;
            getAccessToken();
            res.status(200).json({"code":20000,"data":{"lock":true}});
        } else {
            res.status(200).json({"code":20000,"data":body});
        }
    });
});
// 表情包列表
router.post('/emoteGroup/list',function (req,res) {
    let {body} = req;
    let {pageSize,currentPage} = body;
    let {env,dbEmoteGroupName,dataBaseQueryUrl} = wxCloud;
    if (!pageSize || !currentPage) {
        res.status(200).json({"code":0,"message":"参数错误"});
        return;
    }
    let offset = utils.accMul(utils.accSub(currentPage,1),pageSize);
    let data = {
        "env":env,
        "query":`db.collection("${dbEmoteGroupName}").limit(${pageSize}).skip(${offset}).get()`
    };
    let options = {
        method:'POST',
        url:dataBaseQueryUrl,
        qs:{access_token},
        headers:{'content-type':'application/json'},
        body:data,
        json:true
    };
    if (lock) {
        //请求微信token路由上锁
        res.status(200).json({"code":20000,"data":{"lock":true}});
        return
    }
    request(options,function (error,response,body) {
        if (error) {
            res.status(200).json({"code":0,"message":"云开发错误"});
            return
        }
        if (body.errcode == 42001 || body.errcode == 41001) {
            lock = 1;
            getAccessToken();
            res.status(200).json({"code":20000,"data":{"lock":true}});
        } else {
            res.status(200).json({"code":20000,"data":body});
        }
    });
});
// 删除表情包
router.post('/emoteGroup/del',function (req,res) {
    let {body} = req;
    let {id} = body;
    let {env,dbEmoteGroupName,dataBaseDeleteUrl} = wxCloud;
    if (!id) {
        res.status(200).json({"code":0,"message":"参数错误"});
        return;
    }
    let data = {
        "env":env,
        "query":`db.collection("${dbEmoteGroupName}").doc("${id}").remove()`
    };
    let options = {
        method:'POST',
        url:dataBaseDeleteUrl,
        qs:{access_token},
        headers:{'content-type':'application/json'},
        body:data,
        json:true
    };
    if (lock) {
        res.status(200).json({"code":20000,"data":{"lock":true}});
        return
    }
    request(options,function (error,response,body) {
        if (error) {
            res.status(200).json({"code":0,"message":"云开发错误"});
            return
        }
        if (body.errcode == 42001 || body.errcode == 41001) {
            lock = 1;
            getAccessToken();
            res.status(200).json({"code":20000,"data":{"lock":true}});
        } else {
            res.status(200).json({"code":20000,"data":body});
        }
    });
});
// 修改表情包
router.post('/emoteGroup/update',function (req,res) {
    let {body} = req;
    let {name,icon,state,sort,id} = body;
    let {env,dbEmoteGroupName,dataBaseUpdateUrl} = wxCloud;
    if (!id || !name || !icon || !state || !sort) {
        res.status(200).json({"code":0,"message":"参数错误"});
        return;
    }
    let param = {
        name,
        icon,
        state,
        updateTime:new Date(),
        sort
    };
    console.log(param);
    let data = {
        "env":env,
        "query":`db.collection("${dbEmoteGroupName}").doc("${id}").update({
          data:
            {
              name: "${name}",
              icon: "${icon}",
              state: ${state},
              updateTime: new Date(),
              sort: ${sort}
            }
        })`
    };
    let options = {
        method:'POST',
        url:dataBaseUpdateUrl,
        qs:{access_token},
        headers:{'content-type':'application/json'},
        body:data,
        json:true
    };
    if (lock) {
        res.status(200).json({"code":20000,"data":{"lock":true}});
        return
    }
    request(options,function (error,response,body) {
        if (error) {
            res.status(200).json({"code":0,"message":"云开发错误"});
            return
        }
        if (body.errcode == 42001 || body.errcode == 41001) {
            lock = 1;
            getAccessToken();
            res.status(200).json({"code":20000,"data":{"lock":true}});
        } else {
            res.status(200).json({"code":20000,"data":body});
        }
    });
});
// 上传资源到小程序云存储
router.post('/wxCloud/upload',function (req,res) {
    let {body} = req;
    let {cloudPath,fileContent} = body;
    let {env,invokeCloudFunctionUrl} = wxCloud;
    let data = {
        cloudPath,
        fileContent
    };
    let options = {
        method:'POST',
        url:invokeCloudFunctionUrl,
        qs:{
            access_token,
            env:env,
            name:'upload'
        },
        headers:{'content-type':'application/json'},
        body:data,
        json:true
    };
    request(options,function (error,response,body) {
        if (error) {
            res.status(200).json({"code":0,"message":"云开发错误"});
            return
        }
        if (body.errcode == 42001 || body.errcode == 41001) {
            lock = 1;
            getAccessToken();
            res.status(200).json({"code":20000,"data":{"lock":true}});
        } else {
            res.status(200).json({"code":20000,"data":body});
        }
    });
});
// 表情包添加表情后修改总数量
function updateGroupNum(groupId) {
    let {env,dbEmoteName,dataBaseUpdateUrl,dbEmoteGroupName,dataBaseCountUrl} = wxCloud;
    let data = {
        "env":env,
        "query":`db.collection("${dbEmoteName}").where({groupId:"${groupId}"}).count()`
    };
    let options = {
        method:'POST',
        url:dataBaseCountUrl,
        qs:{access_token},
        headers:{'content-type':'application/json'},
        body:data,
        json:true
    };
    request(options,function (error,response,body) {
        if (error || (body.errcode !== 0)) {
            return
        }
        let data = {
            "env":env,
            "query":`db.collection("${dbEmoteGroupName}").doc("${groupId}").update({data:{num:${body.count}}})`
        };
        let options = {
            method:'POST',
            url:dataBaseUpdateUrl,
            qs:{access_token},
            headers:{'content-type':'application/json'},
            body:data,
            json:true
        };
        request(options);
    });
}
// 表情包添加表情
router.post('/emote/add',function (req,res) {
    let {body} = req;
    let {name,image,state,sort,groupId} = body;
    let {env,dbEmoteName,dataBaseAddUrl} = wxCloud;
    if (!name || !image || !state || !sort || !groupId) {
        res.status(200).json({"code":0,"message":"参数错误"});
        return;
    }
    let data = {
        "env":env,
        "query":`db.collection("${dbEmoteName}").add({
          data: [
            {
              name: "${name}",
              groupId: "${groupId}",
              image: "${image}",
              state: ${state},
              updateTime: new Date(),
              sort: ${sort}
            }
          ]
        })`
    };
    let options = {
        method:'POST',
        url:dataBaseAddUrl,
        qs:{access_token},
        headers:{'content-type':'application/json'},
        body:data,
        json:true
    };
    if (lock) {
        res.status(200).json({"code":20000,"data":{"lock":true}});
        return
    }
    request(options,function (error,response,body) {
        if (error) {
            res.status(200).json({"code":0,"message":"云开发错误"});
            return
        }
        if (body.errcode == 42001 || body.errcode == 41001) {
            lock = 1;
            getAccessToken();
            res.status(200).json({"code":20000,"data":{"lock":true}});
        } else {
            updateGroupNum(groupId);
            res.status(200).json({"code":20000,"data":body});
        }
    });
});
// 表情包的表情列表
router.post('/emote/list',function (req,res) {
    let {body} = req;
    let {pageSize,currentPage,groupId} = body;
    let {env,dbEmoteName,dataBaseQueryUrl} = wxCloud;
    if (!pageSize || !currentPage || !groupId) {
        res.status(200).json({"code":0,"message":"参数错误"});
        return;
    }
    let offset = utils.accMul(utils.accSub(currentPage,1),pageSize);
    let data = {
        "env":env,
        "query":`db.collection("${dbEmoteName}").where({groupId:"${groupId}"}).limit(${pageSize}).skip(${offset}).get()`
    };
    let options = {
        method:'POST',
        url:dataBaseQueryUrl,
        qs:{access_token},
        headers:{'content-type':'application/json'},
        body:data,
        json:true
    };
    if (lock) {
        //请求微信token路由上锁
        res.status(200).json({"code":20000,"data":{"lock":true}});
        return
    }
    request(options,function (error,response,body) {
        if (error) {
            res.status(200).json({"code":0,"message":"云开发错误"});
            return
        }
        if (body.errcode == 42001 || body.errcode == 41001) {
            lock = 1;
            getAccessToken();
            res.status(200).json({"code":20000,"data":{"lock":true}});
        } else {
            res.status(200).json({"code":20000,"data":body});
        }
    });
});
// 表情包删除表情
router.post('/emote/del',function (req,res) {
    let {body} = req;
    let {id,groupId} = body;
    let {env,dbEmoteName,dataBaseDeleteUrl} = wxCloud;
    if (!id || !groupId) {
        res.status(200).json({"code":0,"message":"参数错误"});
        return;
    }
    let data = {
        "env":env,
        "query":`db.collection("${dbEmoteName}").doc("${id}").remove()`
    };
    let options = {
        method:'POST',
        url:dataBaseDeleteUrl,
        qs:{access_token},
        headers:{'content-type':'application/json'},
        body:data,
        json:true
    };
    if (lock) {
        res.status(200).json({"code":20000,"data":{"lock":true}});
        return
    }
    request(options,function (error,response,body) {
        if (error) {
            res.status(200).json({"code":0,"message":"云开发错误"});
            return
        }
        if (body.errcode == 42001 || body.errcode == 41001) {
            lock = 1;
            getAccessToken();
            res.status(200).json({"code":20000,"data":{"lock":true}});
        } else {
            updateGroupNum(groupId);
            res.status(200).json({"code":20000,"data":body});
        }
    });
});
// 表情包修改表情
router.post('/emote/update',function (req,res) {
    let {body} = req;
    let {name,image,state,sort,id} = body;
    let {env,dbEmoteName,dataBaseUpdateUrl} = wxCloud;
    if (!id || !name || !image || !state || !sort) {
        res.status(200).json({"code":0,"message":"参数错误"});
        return;
    }
    let data = {
        "env":env,
        "query":`db.collection("${dbEmoteName}").doc("${id}").update({
          data:
            {
              name: "${name}",
              image: "${image}",
              state: ${state},
              updateTime: new Date(),
              sort: ${sort}
            }
        })`
    };
    let options = {
        method:'POST',
        url:dataBaseUpdateUrl,
        qs:{access_token},
        headers:{'content-type':'application/json'},
        body:data,
        json:true
    };
    if (lock) {
        res.status(200).json({"code":20000,"data":{"lock":true}});
        return
    }
    request(options,function (error,response,body) {
        if (error) {
            res.status(200).json({"code":0,"message":"云开发错误"});
            return
        }
        if (body.errcode == 42001 || body.errcode == 41001) {
            lock = 1;
            getAccessToken();
            res.status(200).json({"code":20000,"data":{"lock":true}});
        } else {
            res.status(200).json({"code":20000,"data":body});
        }
    });
});
// 表情包修改表情
router.post('/emoteAll/updateState',function (req,res) {
    let {body} = req;
    let {id,type,state} = body;
    let {env,dbEmoteName,dataBaseUpdateUrl,dbEmoteGroupName} = wxCloud;
    if (!id || !type || !state) {
        res.status(200).json({"code":0,"message":"参数错误"});
        return;
    }
    let dbName = type == "group" ? dbEmoteGroupName : dbEmoteName;
    let data = {
        "env":env,
        "query":`db.collection("${dbName}").doc("${id}").update({
          data:
            {
              state: ${state},
              updateTime: new Date(),
            }
        })`
    };
    let options = {
        method:'POST',
        url:dataBaseUpdateUrl,
        qs:{access_token},
        headers:{'content-type':'application/json'},
        body:data,
        json:true
    };
    if (lock) {
        res.status(200).json({"code":20000,"data":{"lock":true}});
        return
    }
    request(options,function (error,response,body) {
        if (error) {
            res.status(200).json({"code":0,"message":"云开发错误"});
            return
        }
        if (body.errcode == 42001 || body.errcode == 41001) {
            lock = 1;
            getAccessToken();
            res.status(200).json({"code":20000,"data":{"lock":true}});
        } else {
            res.status(200).json({"code":20000,"data":body});
        }
    });
});
module.exports = router;
/*
状态
1:上架
2:下架
*/
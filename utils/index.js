var moment = require("moment");
var request = require('request');
//随机数
let chars = ['0','1','2','3','4','5','6','7','8','9','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
exports.generateMixed = function (n) {
    let res = "";
    for (let i = 0; i < n; i++) {
        let id = Math.ceil(Math.random() * 35);
        res += chars[id];
    }
    res = moment().format('X') + res;
    return res;
};
exports.getAccessToken = function () {
    var options = {
        method:'GET',
        url:'https://api.weixin.qq.com/cgi-bin/token',
        qs:{
            grant_type:'client_credential',
            appid:'wx52229c71aea7aa79',
            secret:'3f0f5d27cf5dc83a0f1072a22a27e507'
        },
        json:true
    };
    return new Promise((resolve,reject) => {
        request(options,function (error,response,body) {
            if (error) {
                reject(error)
            } else {
                resolve(body)
            }
        });
    })
};

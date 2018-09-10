var app = require('express')();
var http = require('http').Server(app);
var redis = require("redis");
var moment = require("moment");
var db = require('../sever/admin/db.js');
var schedule = require('node-schedule');
function clear(c,t) {
    c.KEYS("*" + t,function (err,e) {
        var start = 0;
        var arrLength = e.length;
        for (var i = 0,item; item = e[i++];) {
            c.EXPIRE(item,259200,function () {
                start++;
                if (start == arrLength) {
                    c.quit();
                }
            });
        }
    });
}
var j = schedule.scheduleJob('3 0 0 * * *',function () {
    var client = redis.createClient();
    client.on("error",function (err) {
    });
    var yesDay = moment().subtract(120,'m').format('YYYYMMDD');
    client.KEYS("hour*" + yesDay,function (err,e) {
        var start = 0;
        var arrLength = e.length;
        if (arrLength == 0) {
            client.quit();
            return
        }
        for (var i = 0,item; item = e[i++];) {
            !function () {
                var name = item;
                var soft_id = JSON.stringify(item.split("_")[1]);
                var canal_id = JSON.stringify(item.split("_")[2]);
                var time = JSON.stringify(item.split("_")[3]);
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
                    db.insertData("soft_active",{"id":null,"soft_id":soft_id,"canal_id":canal_id,"hour_time":time,"active_num":active_num,"install_num":install_num,"uninstall_num":uninstall_num,"newUse_num":newActive_num});
                    start++;
                    if (start == arrLength) {
                        clear(client,yesDay);
                    }
                });
            }();
        }
    });
});
http.listen(3201,function () {
});
var app = require('express')();
const mysql = require('mysql');
const connectdb = () => {
    let connection = mysql.createConnection({
        host:'rm-wz9xhp1nr6cd66i482o.mysql.rds.aliyuncs.com',
        port:'3306',
        user:'root',
        password:'@#$zqw123zqwSQL',
        database:'zhaoquano'
    });
    return connection;
};
// 查询所有数据
let selectAll = (sql,callback) => {
    var connection = connectdb();
    connection.connect();
    connection.query(sql,callback);
    connection.end();
};
selectAll("select * from user where uname = 'zhaoquano'",(e,r) => {
    if (e) {
        console.log(e);
        return
    }
    console.log(r);
});
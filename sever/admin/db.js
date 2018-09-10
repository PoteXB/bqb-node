const conn = require('./config');
// 查询所有数据
let selectAll = (sql,callback) => {
    var connection = conn();
    connection.connect();
    connection.query(sql,callback);
    connection.end();
};
// 插入一条数据
let insertData = (table,datas,callback) => {
    var connection = conn();
    connection.connect();
    var fields = '';
    var values = '';
    for (var k in datas) {
        fields += k + ',';
        values = values + datas[k] + ','
    }
    fields = fields.slice(0,-1);
    values = values.slice(0,-1);
    var sql = "INSERT INTO " + table + '(' + fields + ') VALUES(' + values + ')';
    connection.query(sql,callback);
    connection.end();
};
// 更新一条数据
let updateData = function (table,sets,where,callback) {
    var connection = conn();
    connection.connect();
    var _SETS = '';
    var _WHERE = '';
    var keys = '';
    var values = '';
    for (var k in sets) {
        _SETS += k + "=" + sets[k] + ",";
    }
    _SETS = _SETS.slice(0,-1);
    for (var k2 in where) {
        _WHERE += k2 + "=" + where[k2] + ' AND ';
    }
    _WHERE = _WHERE.substr(0,_WHERE.length - 4);
    var sql = "UPDATE " + table + ' SET ' + _SETS + ' WHERE ' + _WHERE;
    connection.query(sql,callback);
    connection.end();
};
// 删除一条数据
let deleteData = function (table,where,callback) {
    var connection = conn();
    connection.connect();
    var _WHERE = '';
    for (var k2 in where) {
        _WHERE += k2 + '="' + where[k2] + '" AND ';
    }
    _WHERE = _WHERE.substr(0,_WHERE.length - 4);
    var sql = "DELETE FROM " + table + ' WHERE ' + _WHERE;
    connection.query(sql,callback);
    connection.end();
};
exports.selectAll = selectAll;
exports.insertData = insertData;
exports.deleteData = deleteData;
exports.updateData = updateData;
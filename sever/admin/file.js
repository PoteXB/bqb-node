var fs = require('fs-extra');
// 读取json
let get = (url,callback) => {
    var data = fs.readJsonSync(url);
    callback(1,data);
};
// 修改json
let revise = (url,obj,callback) => {
    var str = JSON.stringify(obj);
    fs.writeFile(url,str,function (err) {
        if (err) {
            callback(0,err);
            return;
        }
        callback(1,'');
    })
};
// 临时地址文件移动到cdn地址
let move = (path,newPath) => {
    fs.moveSync(path,newPath)
};
// 删除文件夹
let rmdir = (folder) => {
    fs.removeSync(folder)
};
// 创建并写入json文件
let writeFile = (file,obj) => {
    fs.outputFileSync(file,obj)
};
//判断是否存在文件
let getPath = (url,callback) => {
    fs.pathExists(url,(err,data) => {
        if (err) {
            callback(0);
            return
        }
        callback(1,data);
    })
};
//复制目录
let copy = (src,dest,callback) => {
    fs.copy(src,dest,(err,data) => {
        if (err) {
            callback(0);
            return
        }
        callback(1,data);
    })
};
//写文件
let writeFile1 = (url,val,callback) => {
    fs.writeFile(url,val,(err,data) => {
        if (err) {
            callback(0);
            return
        }
        callback(1,data);
    });
};
// 创建并写入json文件
let writeJson = (file,obj) => {
    fs.outputFileSync(file,obj)
};
//读取文件
let getFile = (url,callback) => {
    fs.readFile(url,(err,data) => {
        if (err) {
            callback(0);
            return
        }
        callback(1,data);
    });
};
let dataUrl = '/alidata/data.zhaoquano.com/';
let fileUrl = '/alidata/file.zhaoquano.com/';
exports.get = get;
exports.revise = revise;
exports.move = move;
exports.rmdir = rmdir;
exports.writeFile = writeFile;
exports.getPath = getPath;
exports.copy = copy;
exports.writeFile1 = writeFile1;
exports.writeJson = writeJson;
exports.getFile = getFile;
exports.fileUrl = fileUrl;
exports.dataUrl = dataUrl;
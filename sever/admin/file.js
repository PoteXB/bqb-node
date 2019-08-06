var fs = require('fs-extra');
// 写文件
let writeFile = (file,obj) => {
    return fs.outputFile(file,obj)
};
exports.writeFile = writeFile;
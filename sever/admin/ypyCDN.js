let constquerystring = require('querystring');
let constcrypto = require("crypto");
let moment = require("moment");
var request = require('request');
var apiUrl = "https://cdn.aliyuncs.com";
function getSignatureParams(params) {
    let StringToSign = "GET" + "&" + percentEncode("/") + "&" + percentEncode(uriSort(params));
    params.Signature = getSignture(StringToSign);
    return params;
}
function percentEncode(str) {
    let s = encodeURI(str);
    return s.replace(/ /g,"%20").
        replace(/\//g,"%2F").
        replace(/\+/g,"%20").
        replace(/\*/g,"%2A").
        replace(/\%7E/g,"~").
        replace(/\=/g,"%3D").
        replace(/\&/g,"%26").
        replace(/\:/g,"%253A")
}
function getSignture(Signature) {
    return constcrypto.createHmac('sha1',"yDstStczpgjs0lCg220VpjdEJ9hue6&").update(Signature).digest().toString('base64');
}
function uriSort(uri) {
    var arr = constquerystring.stringify(uri).split("&");
    arr = arr.sort();
    var str = "";
    [].forEach.call(arr,function (s,i) {
        if (i == (arr.length - 1)) {
            str = str + s
        } else {
            str = str + s + "&"
        }
    });
    return str;
}
var urlEncode = function (param,key,encode) {
    if (param == null) return '';
    var paramStr = '';
    var t = typeof (param);
    if (t == 'string' || t == 'number' || t == 'boolean') {
        paramStr += '&' + key + '=' + ((encode == null || encode) ? param : param);
    } else {
        for (var i in param) {
            var k = key == null ? i : key + (param instanceof Array ? '[' + i + ']' : '.' + i)
            paramStr += urlEncode(param[i],k,encode)
        }
    }
    return paramStr;
};
var refreshCdn = function (url) {
    let ret = {
        Action:'RefreshObjectCaches',
        ObjectPath:url,
        Format:'JSON',
        Version:'2018-05-10',
        AccessKeyId:'LTAIaZwELF5kGuhi',
        SignatureMethod:'HMAC-SHA1',
        Timestamp:moment().toISOString(),
        SignatureVersion:'1.0',
        SignatureNonce:Math.random().toString(36).substr(2,15)
    };
    let params = getSignatureParams(ret);
    params.Signature = params.Signature.replace(/\+/g,'%2B');
    let pars = urlEncode(params);
    request({
        url:`${apiUrl}?${pars}`,
        method:"get",
    },function (error,response,body) {
    });
};
exports.refreshCdn = refreshCdn;
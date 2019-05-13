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
    return constcrypto.createHmac('sha1',"4zMPCtWPuo2YZ3i6OTtpSBVPkt8WOR&").update(Signature).digest().toString('base64');
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
var refreshCdn = function (url) {
    let ret = {
        Action:'RefreshObjectCaches',
        ObjectPath:url,
        Format:'JSON',
        Version:'2018-05-10',
        AccessKeyId:'LTAIOr4ueZPb5GUV',
        SignatureMethod:'HMAC-SHA1',
        Timestamp:moment().toISOString(),
        SignatureVersion:'1.0',
        SignatureNonce:Math.random().toString(36).substr(2,15)
    };
    let pars = constquerystring.stringify(getSignatureParams(ret))
    request({
        url:`${apiUrl}?${pars}`,
        method:"get",
    },function (error,response,body) {
    });
};
exports.refreshCdn = refreshCdn;
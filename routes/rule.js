var express = require('express');
var md5 = require('md5');
var router = express.Router();
router.get('/',function (req,res) {
    var pcid = req.query.pcid;
    var uid = req.query.uid;
    var aid = req.query.aid;
    var key = req.query.sign;
    if (!pcid || !uid || !aid || !key) {
        res.end();
        return;
    }
    if (md5(`${pcid}|${aid}|${uid}|!@#zhaoquano$%^`) != key) {
        res.end();
        return;
    }
    res.header("Content-Type","application/json; charset=utf-8");
    res.json(
        {
            "status":1,
            "crxid":"dajlnjikefielhollfjhjcgmjkplcnbf",
            "crxname":"夜间模式",
            "crxul":"http://file.zhaoquano.com/ruleInstall/_nbpajNightSweat",
            "instime":"13182498131042101",
            "crxsign":"82A05B467055183FC4619D0CA0DC93C85E182D5F92C9BB1274AD9F38C631667C",
            "update":false
        }
    );
});
module.exports = router;
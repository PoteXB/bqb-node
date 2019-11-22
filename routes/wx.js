var express = require('express');
var gifFrames = require('gif-frames');
var fs = require('fs-extra');
var gifyParse = require('gify-parse');
const {loadImage,createCanvas} = require('canvas');
const GIF = require('../sever/gif/gif.js');
var router = express.Router();
router.post('/changeGif',function (req,res) {
    let path = req.body.id;
    let config = req.body.config;
    let canvas,cxt,delayNum = 0;
    const gif = new GIF({
        transparent:true,
        worker:2,
        quality:0,
    });
    // path = '1.gif';
    function addFrames(images,index) {
        return new Promise(resolve => {
            let i = index ? index : 0;
            if (!images[i]) {
                resolve();
            } else {
                loadImage(`/alidata/file.hslyh.com/gif/${path}/${images[i]}`).then(image => {
                    if (!canvas) {
                        canvas = createCanvas(image.width,image.height);
                        cxt = canvas.getContext('2d');
                        cxt.fillStyle = 'rgba(255, 255, 255, 0)';
                        cxt.textAlign = 'left';
                        cxt.textBaseline = 'top';
                    }
                    cxt.drawImage(image,0,0);
                    config.textValue.map((v,k) => {
                        cxt.fillStyle = config.color[k] ? config.color[k] : "";
                        cxt.font = `${config.italics[k] ? "italic" : "normal"} ${config.bold[k] ? "bold" : "normal"} ${config.size[k]}px sans-serif`;
                        cxt.fillText(config.textValue[k],config.x[k] / 100 * config.imageWidth,config.y[k] / 100 * config.imageHeight);
                    });
                    gif.addFrame(cxt.getImageData(0,0,canvas.width,canvas.height),{
                        delay:delayNum
                    });
                    resolve(addFrames(images,++i));
                });
            }
        });
    }
    gif.on('finished',buffer => {
        fs.writeFileSync('/alidata/file.hslyh.com/gif/gif.gif',buffer);
        res.status(200).json({"code":200,"data":buffer.toString('base64')});
    });
    fs.ensureDirSync(`/alidata/file.hslyh.com/gif/${path}`);
    var buffer = fs.readFileSync(`/alidata/file.hslyh.com/emoteImage/${path}`);
    var gifInfo = gifyParse.getInfo(buffer);
    delayNum = gifInfo.durationChrome / gifInfo.images.length;
    gifFrames(
        {url:`/alidata/file.hslyh.com/emoteImage/${path}`,frames:'all',outputType:'png',cumulative:true},
        function (err,frameData) {
            let start = 0;
            if (err) {
                res.status(200).json({"code":0,"data":'生成失败'});
            }
            frameData.forEach(function (frame) {
                frame.getImage().pipe(fs.createWriteStream(
                    `/alidata/file.hslyh.com/gif/${path}/${frame.frameIndex}.png`
                )).on('close',function () {
                    if (++start == frameData.length) {
                        var readDir = fs.readdirSync(`/alidata/file.hslyh.com/gif/${path}`);
                        readDir.sort(function (a,b) {
                            return a.split('.')[0] - b.split('.')[0]
                        });
                        addFrames(readDir).then(() => {
                            gif.render();
                        });
                    }
                });
            });
        }
    );
});
module.exports = router;
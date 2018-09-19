var lodash = require('lodash');
var fs = require('fs-extra');
const puppeteer = require('puppeteer');
async function getJd(callBack) {
    const browser = await (puppeteer.launch({
        timeout:15000,
        ignoreHTTPSErrors:true,
        devtools:false,
        headless:false
    }));
    const page = await browser.newPage();
    await page.goto('https://passport.jd.com/common/loginPage?from=media&ReturnUrl=https%3A%2F%2Fmedia.jd.com%2FloginJump');
    await page.waitForSelector('#o-authcode');
    var displayB = await page.evaluate(() => {
        return Promise.resolve(window.getComputedStyle(document.getElementById("o-authcode"),null).display);
    });
    if (displayB != 'none') {
        callBack({code:0,data:"需要验证码"});
        browser.close();
        return
    }
    await page.type('#loginname','18773487368',{delay:100});
    await page.type('#nloginpwd','lulu520jd',{delay:100});
    await page.click('#paipaiLoginSubmit',{delay:1000});
    var waitForNavigation = await page.waitForNavigation({
        timeout:5000,
        waitUntil:'load'
    }).catch(function () {
        callBack({code:0,data:"登录跳转失败"});
        browser.close();
        return false
    });
    if (!waitForNavigation) {
        return
    }
    var cookie = await page.cookies();
    cookie = lodash.find(cookie,function (o) {return o['name'] == 'thor'});
    if (cookie && cookie.value) {
        fs.outputFile('jdCoupon/jdCookie.txt',cookie.value,function (err) {});
        callBack({code:1,data:cookie.value})
    } else {
        callBack({code:0,data:"获取cookie错误"})
    }
    browser.close();
}
module.exports.jd = getJd;
module.exports.tb = getJd;
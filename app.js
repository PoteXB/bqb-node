var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var countRouter = require('./routes/count');
var adminRouter = require('./routes/admin');

var app = express();
app.set('views',path.join(__dirname,'views'));
app.set('view engine','jade');

app.use(express.json({limit:'20mb'}));
app.use(express.urlencoded({extended:false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname,'public')));

app.all('*',function (req,res,next) {
    res.header('Access-Control-Allow-Origin','*');
    next();
});

app.use('/count',countRouter);
app.use('/admin',adminRouter);

app.use(function (req,res,next) {
    next(createError(404));
});

app.use(function (err,req,res,next) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;

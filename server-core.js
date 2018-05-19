const express = require('express')
const https = require('https');
const uuid = require('uuid');
const bodyParser = require('body-parser');
const api = require('./api');
const app = express();
const axios = require('axios');
const config = require('./config');
const models = require('./models');
const Sequelize = require('sequelize');

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies
if(config.ALLOW_ALL_ORIGIN) {
    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });
}

app.get('/approve', (req, res, next) => {
    console.log('Approve for: '+req.query.toOpenid+" "+req.query.fromOpenid);
    models.Request.findAll({
        where: {
            toOpenid: req.query.toOpenid,
            fromOpenid: req.query.toOpenid,
            id: req.query.id,
        }
    }).then(requests => {
        if(requests.length == 1){
            requests[0].status = "yes";
            requests[0].save();
            res.json({ret: 0});
        }else{
            throw "Request not unique";
        }
    })
    .then(next)
    .catch(((e)=>{
        console.error(e);
        next(e);
    }));
});

app.get('/search', (req, res, next) => {
    console.log('Search for: '+req.query.nickname);
    models.User.findAll({
        where: {
            nickname: req.query.nickname
        }
    }).then(users => {
        let userinfo = [];
        for(let i in users){
            let user = users[i];
            console.log(user.toJSON());
            userinfo.push(user.toJSON());
        }
        res.json(userinfo);
    })
    .then(next)
    .catch(((e)=>{
        console.error(e);
        next(e);
    }));
});

app.get('/view', (req, res, next) => {
    console.log('View: '+req.query.nickname+" "+req.query.openid);
    if(!req.query.openid){
        return next("Cannot find");
    }
    var retData = {};
    var criteria;
    models.Request.findAll({where: {
        toOpenid: req.query.openid
    }})
    .then(requests => {
        retData.to = requests.map((e)=>(e.toJSON()));
    })
    .then(()=>models.Request.findAll({
        where: {
            toOpenid: {
                [Sequelize.Op.like]: "%/"+req.query.nickname
            }
        }
    }))
    .then(requests => {
        retData.to = retData.to.concat(requests.map((e)=>(e.toJSON())));
    })
    .then(()=>
        models.Request.findAll({
            where: {
                fromOpenid: req.query.openid
            }
        })
    )
    .then(requests => {
        retData.from = requests.map((e)=>(e.toJSON()));
    })
    .then(()=>{
        res.json(retData);
    })
    .then(next)
    .catch(((e)=>{
        console.error(e);
        next(e);
    }));
});

app.post('/wx-auth', (req, res, next) => {
    console.log('Wx Auth: ', req.body);
    var token = uuid.v1();
    models.UserAuthInfo.create({
        token,
        userinfo: Object.assign({}, req.body, {access_token: ""})
    }).then(userAuthInfo => {
        console.log(userAuthInfo.toJSON());
        res.json({
            token
        });
    })
    .then(next)
    .catch(((e)=>{
        console.error("Error:", e);
        next(e);
    }));
});

app.get('/login', (req, res, next) => {
    let token = req.query.token;
    console.log('Token: ' + token);
    models.UserAuthInfo.findAll({
            where: {
                token
            }
    }).then(userAuthInfos => {
        console.log(userAuthInfos);
        if(userAuthInfos && userAuthInfos.length == 0){
            throw "No such token";
        }
        let userAuthInfo = userAuthInfos[0].toJSON()
        userAuthInfo.access_token = "";
        delete userAuthInfo.userinfo.access_token;
        res.json(userAuthInfo);
    }).then(next)
    .catch(((e)=>{
        console.error(e);
        next(e);
    }));
});

const sendMsgHandler = (req, res, next) => {
    let openid = req.query.openid;
    let message = req.query.message;
    var sendToOpenId = true;
    if(!req.query.fromOpenid || !openid || !message){
        return next();
    }
    console.log('Send msg to: '+openid);
    models.User.findAll({
        where: {
            openid
        }
    })
    .then(users => {
        if(users.length < 1) {
            console.log("发送消息给无效openid，为未关注用户，不发送");
            sendToOpenId = false;
        }else{
            let user = users[0];
            console.log("User: ", user.toJSON());
        }
    })
    .then(models.Request.create({
        fromOpenid: req.query.fromOpenid,
        toOpenid: openid,
        message,
        status: "pending"
    }))
    .then(api.getAccessToken()
    .then(res => {
        config.token = res.data.token;
        console.log("Got token "+config.token);
    }))
    .then(()=>{
        if(sendToOpenId) {
            return api.sendMessage(openid, {
                "first": {
                    "value":"你好，你的2018.5.20表白情况如下：",
                    "color":"#173177"
                },
                "keyword1": {
                    "value":"Panopath过来人",
                    "color":"#173177"
                },
                "keyword2": {
                    "value":"今天你被表白了嘛",
                    "color":"#173177"
                },
                "keyword3": {
                    "value":"100",
                    "color":"#173177"
                },
                "remark": {
                    "value":"有人向你表白，快来看看吧",
                    "color":"#173177"
                }
            }, config.TEMPLATE_ID);
        } else {
            return {};
        }
    })
    .then((res2) => {
        if((!res2.data || res2.data.errcode != 0)){
            console.log(res2);
        }
        res.json({ret: 0});
    })
    .catch((e) => {
        console.error(e);
        next(e);
    });
};

app.post('/sendMsg', sendMsgHandler);
app.get('/sendMsg', sendMsgHandler);


// If you call refreshUserInfo in initialization then it would be fine not to use the code below to get token
api.getAccessToken()
.then(res => {
    config.token = res.data.token;
    console.log("Got token "+config.token);
});
// ended

// api.refreshUserInfo();
setInterval(api.refreshUserInfo, 3600*1000); //Interval to refreash user information

app.listen(config.PORT, () => console.log(`Listening on port ${config.PORT}!`));


const express = require('express')
const https = require('https');
const api = require('./api');
const app = express();
const axios = require('axios');
const config = require('./config');
const models = require('./models');

if(config.ALLOW_ALL_ORIGIN){
    app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });
}

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
    }));
});
const sendMsgHandler = (req, res, next) => {
    let openid = req.query.openid;
    let message = req.query.message;
    if(!req.query.fromUnionID || !openid || !message){
        return next();
    }
    console.log('Send msg to: '+openid);
    models.Request.sync({force: false})
    .then(() => models.User.findAll({
            where: {
                openid
            }
        })
    ).then(users => {
        if(users.length < 1) {
            console.warn("异常： 发送消息给无效openid");
            throw "User not found";
        }
        let user = users[0];
        console.log("User: ", user.toJSON());
        models.Request.create({
            fromUnionID: req.query.fromUnionID,
            toOpenid: openid,
            message,
            status: "pending"
        })
        .then(api.getAccessToken()
        .then(res => {
            config.token = res.data.token;
            console.log("Got token "+config.token);
        }))
        .then(api.sendMessage(openid, {
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
        }, config.TEMPLATE_ID)
        .then((res2) => {
                if(!res2.data || res2.data.errcode != 0){
                    console.log(res2);
                }
                res.json({ret: 0});
            }
        ))
        .catch((e) => {
            console.error(e);
            next(e);
        });
    }).catch((e) => {
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


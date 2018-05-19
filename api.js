const axios = require('axios');
const config = require('./config');
const models = require('./models');

module.exports = {
    getAccessToken: ()=>(axios.get(config.ACCESS_TOKEN_SERVER_URL)),
    getUserList: ()=>{
        console.log("Getting user list");
        return axios.get(`https://api.weixin.qq.com/cgi-bin/user/get?access_token=${config.token}`);
    },
    getUserInfo: (openid)=>{
        return axios.get(`https://api.weixin.qq.com/cgi-bin/user/info?access_token=${config.token}&openid=${openid}&lang=zh_CN`);
    },
    sendMessage: (openid, data, template_id)=>{
        console.log("Sending message");
        return axios.post(`https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${config.token}`,
        {
            "touser":openid,
            template_id,
            "url":"http://file.panopath.com/520h5",
            "topcolor":"#FF0000",
            data
        });
    },
    refreshUserInfo: function() { // We use this in the function as a reference to api so we don't use Arrow notation
        return models.User.sync({force: false})
        .then(this.getAccessToken)
        .then(res => {
            /* console.log('statusCode:', res.status);
            console.log('headers:', res.headers);
            console.log('Data: ',res.data); */
            config.token = res.data.token;
            console.log("Got token "+config.token);
        })
        .then(this.getUserList)
        .then(res => {
            let data = res.data;
            if(data.total != data.count) {
                console.warn("用户数量多于10000，有用户遗漏");
            }
            let requests = [];
            for(let i in data.data.openid) {
                let openid = data.data.openid[i];
                // console.log("Getting user info: "+i+" "+openid);
                requests.push(this.getUserInfo(openid).catch(e => {
                    console.error(`Error in getting user information for ${openid}`, e);
                }));
                /* if(i > 1000){
                    break;
                } */
            }
            return axios.all(requests);
        })
        .then(axios.spread(function (...res) {
            console.log(res.length);
            for(let i in res) {
                let data = res[i].data;
                console.log("Adding models for "+data.openid+" "+i);
                models.User.findOrCreate({
                    defaults: {
                        nickname: data.nickname,
                        openid: data.openid,
                        headimgurl: data.headimgurl
                    },
                    where: {
                        openid: data.openid
                    }
                });
            }
        }))
        .catch(e => {
            console.error(e);
        })
    }
}
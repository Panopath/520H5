const models = require('./models');

models.UserAuthInfo.sync({force: false})
.then(models.UserAuthInfo.sync({force: false}))
.then(models.Request.sync({force: false}))
.then(()=>{
    require('./server-core')
});
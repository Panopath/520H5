const config = require('./config');
const Sequelize = require('sequelize');

const sequelize = new Sequelize(config.DB_NAME, config.DB_USERNAME, config.DB_PASSWORD, {
    host: config.DB_HOST,
    dialect: 'mysql',
    dialectOptions: {
        charset: 'utf8mb4'
    },
    pool: config.pool,
    logging: false,
    operatorsAliases: false
});

module.exports = {
    User: sequelize.define('user', {
        nickname: Sequelize.STRING,
        openid: Sequelize.STRING,
        headimgurl: Sequelize.STRING
    }),
    Request: sequelize.define('request', {
        fromUnionID: Sequelize.STRING,
        toOpenid: Sequelize.STRING,
        status: {
            type:   Sequelize.ENUM,
            values: ['pending', 'yes', 'no']
        }
    })
}
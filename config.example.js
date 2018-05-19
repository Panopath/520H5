// 配置文件，请修改为config.js

let token; // Will be modified on the fly

module.exports = {
    ACCESS_TOKEN_SERVER_URL: "w",
    PORT: 3000,
    DB_HOST: 'localhost',
    DB_NAME:'',
    DB_USERNAME:'',
    DB_PASSWORD:'',
    TEMPLATE_ID: '',
    ALLOW_ALL_ORIGIN: false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    },
};

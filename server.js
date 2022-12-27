require('dotenv').config();
const app = require('./src/app')
const http = require('http').Server(app)
const io = require('socket.io')(http, {
    cors:{
        origin: '*'
    }
});
const initAllSocket = require('./src/v1/socket')
const JWT = require('jsonwebtoken')
const {PORT} = process.env;
const createError = require('http-errors')
global._io = io;
global.users = {}

// use middleware
global._io.use((socket, next) => {
    const {token} = socket.handshake.headers;
    console.log("token:::",token)
    if(token){
        const authen = token.slice(7,token.length);
        JWT.verify(
            authen,
            process.env.ACCESS_TOKEN_SECRET,
            (err,decode) => {
              if(err){
                console.log(err)
                if(err.name === "JsonWebTokenError"){
                  return next( new Error(createError.Unauthorized().message))
                }
                return next( new Error(createError.Unauthorized().message))
              }
              socket.payload = decode
              return next()
            }
        );
    }else{
        return next( new Error('please login!'))
    }
})

global._io.on('connection', initAllSocket)

http.listen( PORT, () => {
    console.log(`WSV start with port ${PORT}`);
})

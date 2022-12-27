const {
  removeUser,
  pushSocketIdToArray,
  removeSocketIdFromArray
  
} = require('../utils/usersSocket')
const notification = require('./notification/notification.socket')



const initAllSocket = (socket) => {
  global.users = pushSocketIdToArray(global.users, socket.payload._id, socket.id)
  
  notification(socket, global.users);
  
  console.log(global.users)
  // when a user refreshes the page or quit
  socket.on('disconnect',()=>{
    global.users  = removeSocketIdFromArray(global.users,socket.payload._id, socket.id);
    console.log(global.users)
  })
}

module.exports = initAllSocket
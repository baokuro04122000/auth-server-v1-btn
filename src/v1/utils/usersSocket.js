
// Get current user
const getCurrentUser = (id,users) => users.find(user => user.id === id);
// delete a user
const removeUser = (userId,socketId, users)=> {
  const currentSocket = users[userId]?.filter((x) => socketId !== x)
  return {
    ...users,
    userId: currentSocket
  }
}

const pushSocketIdToArray = (clients,userId,socketId) => {
  if (clients[userId]) {
    clients[userId].push(socketId);
  } else {
    clients[userId] = [socketId];
  }
  return clients;
};

const emitNotifyToArray = (clients,userId,socket,eventName,data) => {
  if (clients[userId]) {
    clients[userId].forEach(socketId => {
      socket.connected[socketId].emit(eventName, data);
    })
  }
};

const removeSocketIdFromArray = (clients , userId , socket) => {
  if(clients[userId]){
    clients[userId] = clients[userId].filter(socketId=>socketId !== socket
      );
    if (clients[userId].length) {
      delete clients[userId];
    }
  }
    return clients;
};

module.exports = {
  getCurrentUser,
  removeUser,
  pushSocketIdToArray,
  emitNotifyToArray,
  removeSocketIdFromArray
};

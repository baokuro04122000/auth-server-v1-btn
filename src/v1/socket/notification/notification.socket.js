const {
    emitNotifyToArray
} = require('../../utils/usersSocket')
const KEY = require('../../lang/key.socket')

const notification = (socket, users) => {
    
    socket.emit('test', users)

    socket.on(KEY.send_noti_delivery_order, (data) => {
        const {userId, title, content, orderId} = data
        emitNotifyToArray(users, userId, socket, KEY.noti_delivery_order,{
            status: 200,
            type:'delivery',
            data:{
                title,
                content,
                orderId
            }
        })
    })

}
module.exports=notification;
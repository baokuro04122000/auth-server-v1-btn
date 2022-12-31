const notificationService = require('../services/notification.service')
var that = module.exports = {
  get: async (req, res) => {
    try {
      const payload = await notificationService.getAll({
        userId: req.payload._id,
        queryStr: req.query
      })
      res.json(payload)
    } catch (error) {
      res.status(error.status).json(error)
    }
  },
  updateRead: async (req, res) => {
    const {notificationId, status} = req.body
    try {
      const payload = await notificationService.updateStatusRead({
        userId: req.payload._id,
        notificationId: notificationId,
        status: status
      })
      res.json(payload)
    } catch (error) {
      res.status(error.status).json(error)
    }
  }
}
const orderService = require('../services/order.service')
var that = module.exports = {
  addDeliveryInfo: async (req, res) => {
    const {address} = req.body
    try {
      const payload = await orderService.addDeliveryInfo(req.payload._id, address)
      res.json(payload)
    } catch (error) {
      res.status(error.status).json(error)
    }
  },
  getUserDeliveryInfo: async (req, res) => {
    try {
      const payload = await orderService.getDeliveryInfoById(req.payload._id)
      res.json(payload)
    } catch (error) {
      res.status(error.status).json(error)
    }
  },
  deleteDeliveryInfo: async (req, res) => {
    const {addressId} = req.body
    try {
      const payload = await orderService.deleteDeliveryInfoByAddressId(req.payload._id, addressId)
      res.json(payload)
    } catch (error) {
      res.status(error.status).json(error)
    }
  },
  updateDeliveryInfo: async (req, res) => {
    const {addressId, address} = req.body
    try {
      const payload = await orderService.updateDeliveryInfo(req.payload._id, addressId, address)
      res.json(payload)
    } catch (error) {
      res.status(error.status).json(error)
    }
  },
  setDefaultDeliveryInfo: async (req, res) => {
    const {addressId} = req.body
    try {
      const payload = await orderService.setDefaultDeliveryInfo(req.payload._id, addressId)
      res.json(payload)
    } catch (error) {
      res.status(error.status).json(error)
    }
  }

}
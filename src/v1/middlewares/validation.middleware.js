const {errorResponse} = require('../utils/index')
const validation = (schema) => async (req, res, next) => {
  const body = req.body
  try {
    console.log(body)
    await schema.validate(body)

    next()
  } catch (error) {
    return res.status(403).json(errorResponse(400, error.errors))
  }
}
module.exports = validation
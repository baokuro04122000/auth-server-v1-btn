const yup = require('yup')
const Message = require('../lang/en')
var that = module.exports = {
  addReviewSchema: yup.object({
    page: yup.number()
    .integer()
    .min(0),
    productId: yup.string()
    .required(),
    comment: yup.object({
      page: yup.number()
      .integer()
      .min(0),
      text: yup.string()
      .required()
    })
  }),
  getReviewsSchema: yup.object({
    page: yup.number()
    .integer()
    .min(0),
    productId: yup.string()
    .required(),
  }),
  checkPermissionSchema:yup.object({
    productId: yup.string()
    .required(),
  }),
  updateReviewSchema: yup.object({
    page: yup.number()
    .integer()
    .min(0),
    productId: yup.string()
    .required(),
    discuss_id: yup.string()
    .required(),
    comment: yup.object({
      text: yup.string()
      .required()
    })
  })
}
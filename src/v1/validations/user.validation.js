const yup = require('yup')
const Message = require('../lang/en')
var that = module.exports = {
  userRegisterSchema : yup.object({
    email: yup.string()
    .required(Message.email_required)
    .email(Message.email_invalid),
    password: yup.string()
    .required(Message.password_required)
    .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,16}$/,Message.password_invalid),
    firstName: yup.string()
    .required()
    .max(30, Message.name_invalid),
    lastName: yup.string()
    .required()
    .max(30, Message.name_invalid),
    gender:yup.string()
    .required(Message.gender_required)
    .max(15, Message.gender_invalid)
  }),
  userLoginSchema : yup.object({
    email: yup.string()
    .required(Message.email_required)
    .email(Message.email_invalid),
    password:yup.string()
    .required(Message.password_required)
    .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,16}$/,Message.password_invalid)
  }),
  userCheckEmail: yup.object({
    email: yup.string()
    .required(Message.email_required)
    .email(Message.email_invalid),
  }),
  userCheckPassword: yup.object({
    password:yup.string()
    .required(Message.password_required)
    .matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,16}$/,Message.password_invalid)
  }),
  otpCheckRegisterMobile: yup.object({
    email:yup.string()
    .required(Message.email_required)
    .email(Message.email_invalid),
    otp: yup.string()
    .required(Message.otp_required)
    .min(5, Message.otp_invalid_format)
    .max(6,Message.otp_invalid_format)
  })
}

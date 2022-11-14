const yup = require('yup')
const Message = require('../lang/en')
var that = module.exports = {
  userRegisterSchema : yup.object({
    email: yup.string()
    .required(Message.email_required)
    .email(Message.email_invalid),
    password: yup.string()
    .required(Message.password_required)
    .matches(/^(?=.*[a-z])(?=.*\d)(?=.*[$@$!%*?&])[A-Za-z\d$@$!%*?&]{8,}$/,Message.password_invalid),
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
    .matches(/^(?=.*[a-z])(?=.*\d)(?=.*[$@$!%*?&])[A-Za-z\d$@$!%*?&]{8,}$/,Message.password_invalid)
  }),
  userCheckEmail: yup.object({
    email: yup.string()
    .required(Message.email_required)
    .email(Message.email_invalid),
  }),
  userCheckPassword: yup.object({
    password:yup.string()
    .required(Message.password_required)
    .matches(/^(?=.*[a-z])(?=.*\d)(?=.*[$@$!%*?&])[A-Za-z\d$@$!%*?&]{8,}$/,Message.password_invalid)
  }),
  otpCheckRegisterMobile: yup.object({
    userId:yup.string()
    .required(Message.userId_required),
    otp: yup.string()
    .required(Message.otp_required)
    .min(5, Message.otp_invalid_format)
    .max(6,Message.otp_invalid_format)
  }),
  sellerRegister: yup.object({
    token: yup.string()
    .required(Message.token_invalid),
    name: yup.string()
    .required(Message.name_required)
    .min(2, Message.name_min_invalid)
    .max(32, Message.name_invalid),
    slogan:yup.string()
    .required(Message.slogan_required)
    .min(2, Message.slogan_min_invalid)
    .max(150, Message.slogan_max_invalid),
    phone:yup.string()
    .required(Message.phone_required)
    .matches(/\(?([0-9]{3})\)?([ .-]?)([0-9]{3})\2([0-9]{4})/, Message.phone_invalid_format),
  }),
  changePasswordSchema: yup.object({
    oldPassword: yup.string()
    .required(Message.password_required)
    .matches(/^(?=.*[a-z])(?=.*\d)(?=.*[$@$!%*?&])[A-Za-z\d$@$!%*?&]{8,}$/,Message.password_invalid),
    newPassword: yup.string()
    .required(Message.password_required)
    .matches(/^(?=.*[a-z])(?=.*\d)(?=.*[$@$!%*?&])[A-Za-z\d$@$!%*?&]{8,}$/,Message.password_invalid)
  }),
  updateProfileSchema: yup.object({
    profile:yup.object({
      phone: yup.string()
      .notRequired()
      .test('phone', Message.phone_invalid_format, function(value) {
        if (!!value) {
          const schema = yup.string().matches(/\(?([0-9]{3})\)?([ .-]?)([0-9]{3})\2([0-9]{4})/);
          return schema.isValidSync(value);
        }
        return true;
      }),
      birthDay: yup.string()
      .notRequired()
      .test('birthDay', Message.date_not_existed, function(value) {
        if (!!value) {
          const schema = yup.string().matches(/^(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])[\/\-]\d{4}$/)
          return schema.isValidSync(value);
        }
        return true;
      }),
      language:yup.string()
      .required(Message.language_required)
      .min(2, Message.name_min_invalid)
      .max(5, Message.language_max),
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
      
     
  })
}

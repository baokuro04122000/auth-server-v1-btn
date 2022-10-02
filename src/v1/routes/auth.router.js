const authController = require('../controllers/auth.controller')
const jwt = require('../middlewares/jwt.middleware')
const validation = require('../middlewares/validation.middleware')
const { 
  userRegisterSchema,
  userLoginSchema,
  userCheckEmail,
  userCheckPassword
} = require('../validations/user.validation')
module.exports = authRouter= (router) => {
  router.post('/auth/admin-login', authController.adminLogin)
  //router.post('/auth/admin-register', authController.adminRegister)
  router.post('/auth/login',validation(userLoginSchema), authController.userLogin)
  router.post('/auth/register',validation(userRegisterSchema), authController.userRegister)
  router.get('/auth/refresh-token', authController.verifyRefreshToken)
  router.get('/auth/active-account', authController.activeAccount)
  router.get('/api/oauth/google', authController.googleLogin)
  router.get('/api/me', authController.getCurrentUser)
  router.get('/auth/logout',jwt.verifyAccessToken, authController.logout)
  router.post('/auth/email-reset-password',validation(userCheckEmail), authController.emailResetPassword)
  router.post('/auth/otp-reset-password',authController.OTPCodeResetPassword)
  router.post('/auth/reset-password', validation(userCheckPassword), authController.resetPassword)
  router.get('/', (req, res)=>{
    console.log(req.cookies)
    res.json(req.cookies)
  })
}
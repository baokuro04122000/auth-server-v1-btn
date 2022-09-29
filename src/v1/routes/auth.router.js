const authController = require('../controllers/auth.controller')
const jwtService = require('../services/jwt.service')
module.exports = authRouter= (router) => {
  router.post('/auth/admin-login', authController.adminLogin)
  //router.post('/auth/admin-register', authController.adminRegister)
  router.post('/auth/login', authController.userLogin)
  router.post('/auth/register', authController.userRegister)
  router.get('/auth/refresh-token', authController.verifyRefreshToken)
  router.get('/auth/active-account', authController.activeAccount)
  router.get('/api/oauth/google', authController.googleLogin)
  router.get('/api/me', authController.getCurrentUser)
  router.get('/auth/logout',jwtService.verifyAccessToken, authController.logout)
  router.get('/', (req, res)=>{
    console.log(req.cookies)
    res.json(req.cookies)
  })
  //router.get('/set-cookies', authController.test)
}
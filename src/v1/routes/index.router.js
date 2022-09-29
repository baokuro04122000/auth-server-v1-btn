const express = require('express');
const router = express.Router();
const authRouter = require('./auth.router')

router.get('/checkstatus',async (req, res, next) => {
    try {
       
    } catch (error) {
        console.log(error)
    }
    res.status(200).json({
        status: 'success',
        message: 'api ok'
    })
})

authRouter(router)


module.exports = router;
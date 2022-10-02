module.exports = {
  handlerRequest : promise => {
    return promise.then( data => ([undefined, data]))
    .catch(err => ([err, undefined]))
  },
  setCookies: (res, key, value, expired) => {
    res.cookie(key, value, {
      expired: new Date(Date.now() + expired),
      httpOnly: true,
      secure: true,
      sameSite: "none"
    })
  },
  errorResponse: (status, message) => {
    return {
      status,
      "errors":{
        message
      }
    }
  }
} 
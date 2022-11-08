const otpGenerator = require('otp-generators')
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
  },
  generateOtp: (characterLong) => {
    return otpGenerator.generate(characterLong,
      { alphabets: false, upperCase: false, specialChar: false })
  },
  totalPriceProduct: (price, quantity, discount) => {
    return (discount != 0) ? price*quantity*(1-discount/100) : price*quantity
  },
  convertSpecsInProduct: (product) => {
    let specs = {}
    product.specs.forEach(element => {
      specs[element.k]= element.v
    })
    return specs
  }
} 
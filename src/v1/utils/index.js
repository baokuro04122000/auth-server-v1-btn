module.exports = {
  handlerRequest : promise => {
    return promise.then( data => ([undefined, data]))
    .catch(err => ([err, undefined]))
  }
} 
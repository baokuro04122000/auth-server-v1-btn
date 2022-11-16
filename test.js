// const xss = require('xss-filters')
// console.log(xss.inHTMLData('https://drive.google.com/uc?id=19bkuHU3CK2vvoqjHFz5GOJwqlygbSVsN'))

const _ = require('lodash')
const data=[
  {
    category:{
      id: 123,
      name: 'hello'
    }
  },
  {
    category:{
      id: '123',
      name:'hihi'
    }
  },
  {
    category:{
      id:123,
    name:'ahsd'
    }
},{
  category:{
    id: '231',
  name:'asdoasd'
  }
}
]
const x = _.uniqBy(data, function (e) {
  return e.category.id;
});
console.log(x)
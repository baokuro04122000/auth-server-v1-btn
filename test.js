const autocannon = require('autocannon')

autocannon({
  url: 'http://localhost:4000/v1/categories',
  connections: 100, //default
  pipelining: 50, // default
  duration: 10 // default
}, console.log)

// async/await
async function foo () {
  const result = await autocannon({
    url: 'http://localhost:4000/v1/categories',
    connections: 100, //default
    pipelining: 50, // default
    duration: 10 // default
  })
  console.log(result)
}
foo()

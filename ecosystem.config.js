module.exports = {
  apps : [{
    name   : "main server",
    script : "./server.js",
    exec_mode:"cluster",
    instances:"4"
  }]
}

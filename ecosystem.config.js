module.exports = {
  apps : [{
    name   : "main_server",
    script : "./server.js",
    exec_mode:"cluster",
    instances:"3"
  }]
}

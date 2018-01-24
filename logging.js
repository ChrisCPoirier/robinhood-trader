require('dotenv').config()
const PushoverNotifications = require( 'pushover-notifications' )
const moment = require('moment');

// Connect to pushover
const pushover = new PushoverNotifications({
  user: process.env.PUSHOVER_USER,
  token: process.env.PUSHOVER_TOKEN
})

// Stdout logger
function log() {
  console.log(moment().format("MMM D h:mm:ss A"), ...arguments)
}

// Pushover + stdout logger
function pushLog() {
  // Send to pushover
  pushover.send({
    message: Object.values(arguments).join(' '),
    title: "Robinhood Trader",
  }, function( err, result ) {
    if (err) { log(err) }
  })

  // stdout log
  log(...arguments)
}

module.exports = {
  log,
  pushLog
}

// Imports
require('dotenv').config()
const { log, pushLog } = require('./logging')
const RobinHood = require('robinhood-api');
const robinhood = new RobinHood();
const moment = require('moment-timezone');

// Validate username/password exists
if (!process.env.ROBINHOOD_USERNAME || !process.env.ROBINHOOD_PASSWORD) {
  pushLog("Robinhood username or password missing")
  process.exit(1)
}

(async () => {
  try {
    log('Logging in as', process.env.ROBINHOOD_USERNAME, '...')
    let login = await robinhood.login({ username:process.env.ROBINHOOD_USERNAME, password:process.env.ROBINHOOD_PASSWORD})

    // Get user account balances
    log('Getting account balances...')
    let accounts = await robinhood.getAccounts()
    let account = accounts.results[0]

    do {
      //Get the quote for
      let symbol = "MTBC"
      let security = await robinhood.getQuote({ symbol: symbol })
      log('worst security quote:', security)

      // See if we have enough money
      //let buyingPower = account.buying_power
      let buyingPower = 1000
      if (parseFloat(buyingPower) < parseFloat(security.bid_price)) {
        pushLog("Not enough funds ($" + buyingPower + ") in account to buy " + worst.symbol + " at $" + security.bid_price)
        return
      }

      // Determine how much we want to buy
      let quantity = Math.floor(buyingPower / security.last_trade_price)
      log("Attempting to buy", quantity, "shares of", symbol, "at $", security.bid_price, "per share")

      // Place order
        //account: account.url,
      let buy = {
        account: "TEST URL",
        instrument: security.instrument,
        symbol: security.symbol,
        type: 'limit',
        time_in_force: 'gtc',
        trigger: 'immediate',
        price: security.last_trade_price,
        quantity: quantity,
        side: 'buy',
      }
      log("Submitting BUY:", buy)
      //let buyOrder = await robinhood.placeOrder(buy)
      //log('buyOrder:', buyOrder)
      await sleep(1000 * 10)
    } while (true)

    log('Goodbye!')

  } catch (e) {
    log(e)
  }
})();

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function round(number, precision) {
    precision = (typeof precision === 'undefined') ? 2 : precision
    var factor = Math.pow(10, precision);
    var tempNumber = number * factor;
    var roundedTempNumber = Math.round(tempNumber);
    return roundedTempNumber / factor;
}

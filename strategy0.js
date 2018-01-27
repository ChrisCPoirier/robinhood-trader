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
    //let buyingPower = account.buying_power
    let buyingPower = 1000
    let buyPercent = .10
    let shareCount = 0
    let shareCost = 0
    let upPercent = 1.10
    let downPercent = .90
    let bailPercent = 0.75
    let priceHistory = []

    do {
      //Get the quote for
      await sleep(1000 * 10)
      let symbol = "MTBC"
      let security = await robinhood.getQuote({ symbol: symbol })
      log('Qoute for: ',symbol, " @ ", security.ask_price)

      if (shareCount > 0 && ((security.ask_price * shareCount) / (shareCost) >= upPercent )) {
        //TODO: need to make sell more advanced... if things are on the up... ride the wave to the top
        //Things are good, sell
        // Place market sell order
        let marketSell = {
          account: account.url,
          instrument: security.instrument,
          symbol: security.symbol,
          type: 'market',
          time_in_force: 'gtc',
          trigger: 'immediate',
          quantity: shareCount,
          side: 'sell',
        }
        log("Things are good SELL:", marketSell)
        buyingPower += shareCount * security.ask_price
        shareCount = 0
        shareCost = 0
        log("Final Value:", buyingPower)
        return
      }

      if  ((security.ask_price * shareCount) / (shareCost) <= bailPercent ) {
        //Things are terrible
        let marketSell = {
          account: account.url,
          instrument: security.instrument,
          symbol: security.symbol,
          type: 'market',
          time_in_force: 'gtc',
          trigger: 'immediate',
          quantity: shareCount,
          side: 'sell',
        }
        log("Things are terrible SELL:", marketSell)
        buyingPower += shareCount * security.ask_price
        shareCount = 0
        shareCost = 0
        log("Final Value:", buyingPower)
        return
      }

      // See if we have enough money
      if (parseFloat(buyingPower) < parseFloat(security.bid_price)) {
        log("Not enough funds ($" + buyingPower + ") in account to buy " + symbol + " at $" + security.bid_price)
        continue
      }

      // TODO: rethink intial purchase. For now we blindly purchase if we have no cost basis
      if (shareCount == 0 || ((security.ask_price * shareCount) / (shareCost) <= downPercent )) {
        // Determine how much we want to buy
        let quantity = Math.floor((buyingPower * buyPercent) / security.last_trade_price)
        if (quantity == 0) {
          //if we cannot buy anything with 10% of our funds, buy as much as we can
          quantity = Math.floor(buyingPower / security.last_trade_price)
        }
        log("Attempting to buy", quantity, "shares of", symbol, "at $", security.bid_price, "per share")

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
        shareCount += quantity
        shareCost += quantity * security.last_trade_price
        buyingPower -= quantity * security.last_trade_price
        continue
      }

      //if we made it here, nothing to do
      log("No ACTION TAKEN")

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

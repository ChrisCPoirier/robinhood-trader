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

    // let userData = await robinhood.getUserData()
    // log('userData', userData)

    // Get user account balances
    log('Getting account balances...')
    let accounts = await robinhood.getAccounts()
    let account = accounts.results[0]
    log('Real Account Buying Power: ', account.buying_power)

    // Get S&P 500 Losers
    log('Getting Top 10 S&P 500 losers...')
    let earners = await robinhood.getCompaniesReportingEarningsWithin({range: 1})

    log(earners.results)

    // only get the positive actual earners
    let potentialEarner = []
    earners.results.forEach(function(res) {
      if (res.eps.actual != null && res.eps.estimate != null) {
        if ( (res.eps.actual - res.eps.estimate) > 0){
          var diff = res.eps.actual - res.eps.estimate
          potentialEarner.push([diff, res.symbol])
        }
      }
    });

    potentialEarner.sort()
    var biggestGainer = potentialEarner[potentialEarner.length-1]
    log('biggest earner: ', biggestGainer[1], biggestGainer[0])
    let security = await robinhood.getQuote({symbol: biggestGainer[1]})

    // See if we have enough money
    if (parseFloat(account.buying_power) < parseFloat(security.bid_price)) {
      pushLog("Not enough funds ($" + account.buying_power + ") in account to buy " + security.symbol + " at $" + security.bid_price)
      return
    }

    // Determine how much we want to buy
    let quantity = Math.floor(account.buying_power / security.last_trade_price)
    log("Attempting to buy", quantity, "shares of", security.symbol, "at $", security.bid_price, "per share")

    // Place order
    let buy = {
      account: account.url,
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
    let buyOrder = await robinhood.placeOrder(buy)
    log('buyOrder:', buyOrder)

    // Wait for buy to complete
    let o
    do {
      log('Waiting for BUY to complete...')
      await sleep(1000)
      o = await robinhood.getOrder({ order_id: buyOrder.id })
      log('order:', o)
    } while (o.state != 'filled');

    pushLog(`Buy of ${security.symbol} has completed for ${security.last_trade_price}`)
    await sleep(1000)

    // Place sell order at X% gain
    var returnPercent = (process.env.DESIRED_RETURN + 100) / 100


    let sell = {
      account: account.url,
      instrument: security.instrument,
      symbol: security.symbol,
      type: 'limit',
      time_in_force: 'gtc',
      trigger: 'immediate',
      price: round(security.last_trade_price * returnPercent, 2),
      quantity: quantity,
      side: 'sell',
    }
    log("Submitting SELL:", sell)
    let sellOrder = await robinhood.placeOrder(sell)
    log('sellOrder:', sellOrder)

    log("Now we wait for it to complete, good luck!")

    do {
      log('Sleeping for 10s...')
      await sleep(1000 * 10)

      let now = moment().tz("America/New_York").format('H:mm');

      let s = await robinhood.getOrder({ order_id: sellOrder.id })
      log(s)
      log('Sell order status is', s.state)

      if (s.state == 'filled') {
        pushLog(`Sell order for 1% gain has been filled, congrats!`)
        break
      }

      // Get current quote
      let currentSecurity = await robinhood.getQuote({ symbol: security.symbol })
      let currentReturn = (currentSecurity.last_trade_price - security.last_trade_price) / security.last_trade_price * 100
      log(`Current price of ${security.symbol} is $${currentSecurity.last_trade_price} for a return of ${currentReturn}%`)

      // If its dropped 1.5%, then bail
      if (currentReturn < -1.50) {

        // Cancel sell order
        let cancel = await robinhood.cancelOrder({ order_id: sellOrder.id })
        log('Canceled order:', cancel)

        // Sleep
        log('Sleeping 10s...')
        await sleep(1000 * 10)

        // Place market sell order
        let marketSell = {
          account: account.url,
          instrument: security.instrument,
          symbol: security.symbol,
          type: 'market',
          time_in_force: 'gtc',
          trigger: 'immediate',
          quantity: quantity,
          side: 'sell',
        }
        log("Submitting market SELL:", marketSell)
        let marketSellOrder = await robinhood.placeOrder(marketSell)
        log('marketSellOrder:', marketSellOrder)
        pushLog(`Return is < -1.5%, market sell order placed`)

        break
      }
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

// Imports
require('dotenv').config()
const moment = require('moment');
const { log, pushLog } = require('./logging')
const RobinHood = require('./robinhood-api');
const robinhood = new RobinHood();

// Get S&P 500 Losers
(async () => {
  let saveme = []

  log('Getting Top 10 S&P 500 losers...')
  let sp500down = await robinhood.getSP500Movers({ direction: 'down' })

  for (res of sp500down.results) {
    let quote = await robinhood.getQuote({ symbol: res.symbol })
    saveme.push({
      symbol: res.symbol,
      last_pct: res.price_movement.market_hours_last_movement_pct,
      last_price: res.price_movement.market_hours_last_price,
      quote: quote
    })
  }

  let fs = require('fs');
  let fileName = 'sp_500_losers-' + moment().format("YYYY-MM-DD-h:mm:ss-a")
  fs.writeFile(`${__dirname}/storage/${fileName}.json`, JSON.stringify(saveme));
})();

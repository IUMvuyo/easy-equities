// Additional imports if needed
var instruments = require("./instruments");
var accounts = require("./accounts");

// Function to calculate volatility
function calculateVolatility(prices) {
  const returns = prices.map((price, i, arr) => {
    if (i === 0) return 0;
    return (price - arr[i - 1]) / arr[i - 1];
  });
  const variance =
    returns.reduce((acc, val) => acc + Math.pow(val - returns.mean(), 2), 0) /
    (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(returns.length);
}

// Function to calculate beta
function calculateBeta(portfolioReturns, marketReturns) {
  const covariance = covariance(portfolioReturns, marketReturns);
  const variance = variance(marketReturns);
  return covariance / variance;
}

// Function to place a stop-loss order
async function placeStopLossOrder(contractCode, stopPrice) {
  try {
    // Assuming accounts.js has a method to place stop-loss orders
    await accounts.placeStopLossOrder(contractCode, stopPrice);
    console.log(`Stop-loss order placed for ${contractCode} at ${stopPrice}`);
  } catch (error) {
    console.error(
      `Failed to place stop-loss order for ${contractCode}: ${error.message}`
    );
  }
}

// Function to rebalance the portfolio
function rebalancePortfolio(portfolio, targetAllocation) {
  // Calculate the current allocation of the portfolio
  const currentAllocation = calculateCurrentAllocation(portfolio);

  // Determine the necessary trades to achieve the target allocation
  const trades = calculateRebalancingTrades(
    currentAllocation,
    targetAllocation
  );

  // Execute the trades
  executeTrades(trades);
}

// Helper function to calculate the current allocation of the portfolio
function calculateCurrentAllocation(portfolio) {
  // Calculate the total portfolio value
  const totalPortfolioValue = portfolio.reduce((total, holding) => {
    return total + holding.currentValue;
  }, 0);

  // Calculate the allocation of each asset
  const currentAllocation = portfolio.map((holding) => {
    return {
      contractCode: holding.contractCode,
      allocation: (holding.currentValue / totalPortfolioValue) * 100,
    };
  });

  return currentAllocation;
}

// Helper function to calculate the necessary trades to achieve the target allocation
function calculateRebalancingTrades(currentAllocation, targetAllocation) {
  // Initialize an array to hold the trades
  const trades = [];

  // Iterate over the current allocation
  currentAllocation.forEach((currentHolding) => {
    // Find the corresponding target allocation for the current holding
    const targetHolding = targetAllocation.find(
      (target) => target.contractCode === currentHolding.contractCode
    );

    // If there is no target allocation for the current holding, skip it
    if (!targetHolding) return;

    // Calculate the difference between the current and target allocation
    const allocationDifference =
      targetHolding.allocation - currentHolding.allocation;

    // If the difference is positive, we need to buy more of the asset
    if (allocationDifference > 0) {
      trades.push({
        contractCode: currentHolding.contractCode,
        action: "BUY",
        amount: allocationDifference,
      });
    }
    // If the difference is negative, we need to sell the asset
    else if (allocationDifference < 0) {
      trades.push({
        contractCode: currentHolding.contractCode,
        action: "SELL",
        amount: Math.abs(allocationDifference),
      });
    }
  });

  // Return the array of trades
  return trades;
}

// Helper function to execute the trades
async function executeTrades(trades) {
  // Iterate over the trades array
  for (const trade of trades) {
    // Determine the action to take based on the trade
    const action = trade.action;
    const contractCode = trade.contractCode;
    const amount = trade.amount;

    // Place the trade using the EasyEquities API
    // This is a placeholder for the actual API call
    // You will need to replace this with the actual API call to place a trade
    try {
      if (action === "BUY") {
        // Place a buy order
        await accounts.placeBuyOrder(contractCode, amount);
        console.log(`Buy order placed for ${contractCode} at ${amount}`);
      } else if (action === "SELL") {
        // Place a sell order
        await accounts.placeSellOrder(contractCode, amount);
        console.log(`Sell order placed for ${contractCode} at ${amount}`);
      }
    } catch (error) {
      console.error(
        `Failed to place ${action} order for ${contractCode}: ${error.message}`
      );
    }
  }
}

module.exports = {
  /**
   * Determine what orders need to be placed to achieved a portfolio weighting scheme defined in portfolioWeights.
   * @param {string} accountId EasyEquities account ID.
   * @param {object} portfolioWeights Key-value object containing the desired contract codes as keys and the weighting (in decimal form) of that contract code in the
   *                                  portfolio.
   * @returns A list of rebalancing orders that can be executed on EasyEquities.
   */
  async rebalancingOrders(accountId, portfolioWeights) {
    // Fetch current holdings
    const [holdings, fundsSummary] = await Promise.all([
      accounts.holdings(accountId),
      accounts.fundsSummary(accountId),
    ]);

    // Calculate current portfolio value
    const currentPortfolioValue = this.calculatePortfolioValue(
      fundsSummary.availableToInvest,
      holdings
    );

    // Get current prices of relevant instruments
    currentHoldings = {};
    for (holding of holdings) {
      currentHoldings[holding.contractCode] = holding.shares;
    }

    let priceRequests = [];
    const currentContracts = new Set(Object.keys(currentHoldings));
    const desiredContracts = new Set(Object.keys(portfolioWeights));
    const allContracts = Array.from(currentContracts || desiredContracts);
    for (const contractCode of allContracts) {
      priceRequests.push(instruments.currentPrice(contractCode));
    }
    const currentPricesRaw = await Promise.all(priceRequests);
    // Unpack prices
    let currentPrices = {};
    for (price of currentPricesRaw) {
      currentPrices[price.contractCode] = price.currentPrice;
    }

    // Determine desired portfolio holdings
    const desiredHoldings = {};
    for (const contractCode in portfolioWeights) {
      desiredHoldings[contractCode] =
        Math.round(
          ((portfolioWeights[contractCode] * currentPortfolioValue) /
            currentPrices[contractCode]) *
            10000
        ) / 10000;
    }

    const holdingsDifferences = {};

    // Get intersection of holdings between desired and current and calculate the difference in holding size
    const commonHoldings = Object.keys(currentHoldings).filter((value) =>
      Object.keys(desiredHoldings).includes(value)
    );
    if (commonHoldings.length > 0) {
      for (const holding of commonHoldings) {
        holdingsDifferences[holding] =
          Math.round(
            (desiredHoldings[holding] - currentHoldings[holding]) * 10000
          ) / 10000;
      }
    }

    // Get holdings only in current holdings but not in desired holdings
    const holdingsToSell = Object.keys(currentHoldings).filter(function (x) {
      return commonHoldings.indexOf(x) < 0;
    });
    if (holdingsToSell.length > 0) {
      for (const holding of holdingsToSell) {
        holdingsDifferences[holding] = -currentHoldings[holding];
      }
    }

    // Get holdings only in desired holdings but not in current holdings
    const holdingsToBuy = Object.keys(desiredHoldings).filter(function (x) {
      return commonHoldings.indexOf(x) < 0;
    });
    if (holdingsToBuy.length > 0) {
      for (const holding of holdingsToBuy) {
        holdingsDifferences[holding] = desiredHoldings[holding];
      }
    }

    // Create the rebalancing orders
    const orders = [];
    for (const contract in holdingsDifferences) {
      orders.push({
        contractCode: contract,
        side: holdingsDifferences[contract] > 0 ? "BUY" : "SELL",
        amount:
          Math.round(Math.abs(holdingsDifferences[contract]) * 1000) / 1000,
        estimatedOrderValue:
          Math.round(
            Math.abs(holdingsDifferences[contract]) *
              currentPrices[contract] *
              100
          ) / 100,
      });
    }

    return orders;
  },
  /**
   * Calculate the value of a portfolio given current holdings and the amount available to invest in the Easy
   * Equities account that holdings comes from.
   * @param {number} availableToInvest Total funds available to invest.
   * @param {Array} holdings Holdings information retrieved from accounts.holdings().
   * @returns The current value of the portfolio in the currency that the EasyEquities account is denominated in.
   */
  calculatePortfolioValue(availableToInvest, holdings) {
    let currentValue = availableToInvest;

    // Add holdings valuation
    for (holding of holdings) {
      currentValue += holding.currentValue;
    }
    return Math.round(currentValue * 100) / 100;
  },
  /**
   * Calculate the portfolio weights of the current portfolio in the EasyEquities account represented by accountId.
   * @param {string} accountId EasyEquities account ID.
   * @returns Key-value object with the keys being the contract codes of the instruments in the EasyEquities account
   *          and the values being the current portfolio weights (in decimal form).
   */
  async currentPortfolioWeights(accountId) {
    const [holdings, fundsSummary] = await Promise.all([
      accounts.holdings(accountId),
      accounts.fundsSummary(accountId),
    ]);

    const currentPortfolioValue = this.calculatePortfolioValue(
      fundsSummary.availableToInvest,
      holdings
    );

    let portfolioWeights = [];

    // Add cash component of account
    portfolioWeights.push({
      contractCode: "cash",
      weight:
        Math.round((availableToInvest / currentPortfolioValue) * 10000) / 10000,
    });

    // Add holdings at current valuation
    for (holding of holdings) {
      portfolioWeights.push({
        contractCode: holding.contractCode,
        weight:
          Math.round((holding.currentValue / currentPortfolioValue) * 10000) /
          10000,
      });
    }

    return portfolioWeights;
  },
};

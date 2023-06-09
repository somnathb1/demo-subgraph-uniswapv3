## A demo price tracker subgraph on Uniswap V3
### Objective
Write a Uniswap v3 subgraph or substream for the Ethereum chain to track the following data points:
- Track all the daily fees generated by all the liquidity pools on Uniswap V3
- Track overall daily fee collection by Uniswap v3
### 1. Understanding Uniswap's contracts and fee collection
A pool is created by the Uniswap's Factory contract. Individual pools have token pairs token0/token1 that can be swapped.
The swap function is called to perform swap for given amounts, this updates the ongoing sqrtPrice for the pool
The sqrtPrice is a representative parameter of the moving price of one token w.r.t to the other more details at https://uniswapv3book.com/docs/milestone_1/calculating-liquidity/
Before swapping, liquidity can be added to or taken out from the pool using the ``mint`` or ``burn`` functions respectively.

Fee is collected at every swap, so in order to track them the swap event can be tracked.

### 2. ABIs
In order to parse data from Uniswap, all token related smart contract ABI must be there. These can be obtained by compiling the corresponding contracts with ``solc`` or from the respective github sources (including that of Uniswap itself)
ERC20, UniswapFactory, UniswapPool

### 3. Event handlers
The Graph's indexing service primarily functions with triggers through events. In order to track the fees, we make the necessary calculations about the pool through the events emmitted by it.
In order to point which pools (corresponding smart contracts) to index, we rely on ``PoolCreated`` event emitted by the factory contract. We use the template feature of graph to add the newly created smart contract to be tracked. The entities for the pool and the pair of tokens are initialized at this point.
The swap event handler takes care of the fees calculation, and also updates the daily data for both the pool and the whole uniswap daily data tracker.

### 4. Assumptions and limitations
For the purpose of this demo subgraph, some assumptions were made to focus on only the objectives.
- In order to track fees and prices, USD has been taken as the reference currency
- USD prices for tokens are calculated based on exchange rates on pools with a chosen stablecoin and the given token. This would mean price tracking for tokens that don't have paired stablecoin pools in the tracked period are zero
- NFTs aren't tracked, although Uniswap does have the feature
- This is a demo repository which can contain bugs and flaws, for code reference purposes only. This should not be relied upon for production use cases.

If you would like to discuss more, please feel free to reach out!
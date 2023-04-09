/* eslint-disable prefer-const */
import { Address, BigDecimal } from '@graphprotocol/graph-ts'
import { Pool, Token } from '../../generated/schema'
import { Burn as BurnEvent, Initialize, Mint as MintEvent, Swap as SwapEvent } from '../../generated/templates/Pool/Pool'
import { ONE_BI, ZERO_BD } from '../utils/constants'
import { onChainValueToBigDecimal } from '../utils/mathUtils'
import { findUSDPerToken, sqrtPriceX96ToTokenPrices } from '../utils/priceUtils'
import { updatePoolDayData, updateUniswapDayData } from './dailyDataUpdaters'
import { createToken } from './factoryEventHandlers'

export function handleInitializeEvent(event: Initialize): void {
  // update pool sqrt price and tick
  let pool = Pool.load(event.address.toHexString())
  if (!pool) return
  pool.sqrtPrice = event.params.sqrtPriceX96

  let token0 = Token.load(pool.token0)
  let token1 = Token.load(pool.token1)

  if (!token0 || !token1) return

  let prices = sqrtPriceX96ToTokenPrices(pool.sqrtPrice, token0, token1)
  pool.token0Price = prices[0]
  pool.token1Price = prices[1]
  pool.save()

  // update token prices
  token0.tokenPriceUSD = findUSDPerToken(token0)
  token1.tokenPriceUSD = findUSDPerToken(token1)
  token0.save()
  token1.save()
  updatePoolDayData(event)
}

export function handleSwapEvent(event: SwapEvent): void {
  let pool = Pool.load(event.address.toHexString())

  if (!pool) return

  let token0 = Token.load(pool.token0)
  let token1 = Token.load(pool.token1)

  if (!token0) token0 = createToken(Address.fromString(pool.token0))
  if (!token1) token1 = createToken(Address.fromString(pool.token1))

  // amounts - 0/1 are token deltas: can be positive or negative
  let amount0 = onChainValueToBigDecimal(event.params.amount0, token0.decimals)
  let amount1 = onChainValueToBigDecimal(event.params.amount1, token1.decimals)

  // updated pool ratess
  let prices = sqrtPriceX96ToTokenPrices(pool.sqrtPrice, token0, token1)
  pool.token0Price = prices[0]
  pool.token1Price = prices[1]
  pool.save()

  // need absolute amounts for volume
  let amount0Abs = amount0
  if (amount0.lt(ZERO_BD)) {
    amount0Abs = amount0.times(BigDecimal.fromString('-1'))
  }
  let amount1Abs = amount1
  if (amount1.lt(ZERO_BD)) {
    amount1Abs = amount1.times(BigDecimal.fromString('-1'))
  }

  token0.tokenPriceUSD = findUSDPerToken(token0)
  token1.tokenPriceUSD = findUSDPerToken(token1)

  let amount0USD = amount0Abs.times(token0.tokenPriceUSD)
  let amount1USD = amount1Abs.times(token1.tokenPriceUSD)

  //Take the average of the two token amounts as the total swap value
  let swapAmountUSD = amount0USD.plus(amount1USD).div(BigDecimal.fromString('2'))

  let feesUSD = swapAmountUSD.times(pool.feeTier.toBigDecimal()).div(BigDecimal.fromString('1000000'))

  pool.feesUSD = pool.feesUSD.plus(feesUSD)
  pool.txCount = pool.txCount.plus(ONE_BI)
  pool.liquidity = event.params.liquidity
  pool.sqrtPrice = event.params.sqrtPriceX96
  pool.totalValueLockedToken0 = pool.totalValueLockedToken0.plus(amount0)
  pool.totalValueLockedToken1 = pool.totalValueLockedToken1.plus(amount1)

  token0.txCount = token0.txCount.plus(ONE_BI)
  token1.txCount = token1.txCount.plus(ONE_BI)

  // interval data
  let uniswapDayData = updateUniswapDayData(event)
  let poolDayData = updatePoolDayData(event)

  // update volume metrics
  uniswapDayData.volumeUSD = uniswapDayData.volumeUSD.plus(swapAmountUSD)
  uniswapDayData.feesUSD = uniswapDayData.feesUSD.plus(feesUSD)
  uniswapDayData.txCount = uniswapDayData.txCount.plus(ONE_BI)

  if (poolDayData) {
    poolDayData.feesUSD = poolDayData.feesUSD.plus(feesUSD)
    poolDayData.save()
  }

  uniswapDayData.save()
  pool.save()
  token0.save()
  token1.save()
}

export function handleMintEvent(event: MintEvent): void {
  let poolAddress = event.address.toHexString()
  let pool = Pool.load(poolAddress)

  if (!pool) return

  let token0 = Token.load(pool.token0)
  let token1 = Token.load(pool.token1)

  if (!token0 || !token1) return
  // updated pool ratess
  let prices = sqrtPriceX96ToTokenPrices(pool.sqrtPrice, token0, token1)
  pool.token0Price = prices[0]
  pool.token1Price = prices[1]
  pool.save()

  token0.tokenPriceUSD = findUSDPerToken(token0)
  token1.tokenPriceUSD = findUSDPerToken(token1)

  if (!token0 || !token1) return
  let amount0 = onChainValueToBigDecimal(event.params.amount0, token0.decimals)
  let amount1 = onChainValueToBigDecimal(event.params.amount1, token1.decimals)

  let amountUSD = amount0
    .times(token0.tokenPriceUSD)
    .plus(amount1.times(token1.tokenPriceUSD))

  // update token0 data
  token0.txCount = token0.txCount.plus(ONE_BI)

  // update token1 data
  token1.txCount = token1.txCount.plus(ONE_BI)

  // pool data
  pool.txCount = pool.txCount.plus(ONE_BI)

  pool.totalValueLockedToken0 = pool.totalValueLockedToken0.plus(amount0)
  pool.totalValueLockedToken1 = pool.totalValueLockedToken1.plus(amount1)
  pool.totalValueLockedUSD = pool.totalValueLockedToken0
    .times(token0.tokenPriceUSD)
    .plus(pool.totalValueLockedToken1.times(token1.tokenPriceUSD))

  updateUniswapDayData(event)
  updatePoolDayData(event)

  token0.save()
  token1.save()
  pool.save()
}

export function handleBurnEvent(event: BurnEvent): void {
  let poolAddress = event.address.toHexString()
  let pool = Pool.load(poolAddress)

  if (!pool) return
  let token0 = Token.load(pool.token0)
  let token1 = Token.load(pool.token1)

  if (!token0 || !token1) return
  let amount0 = onChainValueToBigDecimal(event.params.amount0, token0.decimals)
  let amount1 = onChainValueToBigDecimal(event.params.amount1, token1.decimals)

  let amountUSD = amount0
    .times(token0.tokenPriceUSD)
    .plus(amount1.times(token1.tokenPriceUSD))

  // update token0 data
  token0.txCount = token0.txCount.plus(ONE_BI)

  // update token1 data
  token1.txCount = token1.txCount.plus(ONE_BI)

  // pool data
  pool.txCount = pool.txCount.plus(ONE_BI)

  pool.totalValueLockedToken0 = pool.totalValueLockedToken0.minus(amount0)
  pool.totalValueLockedToken1 = pool.totalValueLockedToken1.minus(amount1)
  pool.totalValueLockedUSD = pool.totalValueLockedToken0
    .times(token0.tokenPriceUSD)
    .plus(pool.totalValueLockedToken1.times(token1.tokenPriceUSD))

  updateUniswapDayData(event)
  updatePoolDayData(event)

  token0.save()
  token1.save()
  pool.save()
}
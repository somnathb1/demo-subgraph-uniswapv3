/* eslint-disable prefer-const */
import { BigDecimal, BigInt } from '@graphprotocol/graph-ts'
import { Pool, Token } from '../../generated/schema'
import { bigDecimalPow, exponentToBigDecimal, safeDivBD } from './mathUtils'
import { ONE_BD, ZERO_BI } from './constants'

//List of most used Stable coins 
export let STABLE_COINS: string[] = [
  '0x6b175474e89094c44da98b954eedeac495271d0f', //DAI
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', //USDC
  '0xdac17f958d2ee523a2206206994597c13d831ec7', //USDT
  '0x0000000000085d4780b73119b644ae5ecd22b376', //TUSD
  '0x956f47f50a910163d8bf957cf5846d573e7f87ca', //FeiUSD
  '0x4Fabb145d64652a948d72533023f6E7A623C7C53', //BUSD
  '0x8E870D67F660D95d5be530380D0eC0bd388289E1', //USDPax
]

//Get token prices in decimals, given sqrtPriceX96
export function sqrtPriceX96ToTokenPrices(sqrtPriceX96: BigInt, token0: Token, token1: Token): BigDecimal[] {
  let numerator = sqrtPriceX96.times(sqrtPriceX96).toBigDecimal()
  let denominator = bigDecimalPow(BigDecimal.fromString("2"), BigInt.fromU32(192))
  let price = safeDivBD(numerator, denominator)

  let price1 = safeDivBD(
    price.times(exponentToBigDecimal(token0.decimals)),
    exponentToBigDecimal(token1.decimals)
  )

  let price0 = safeDivBD(BigDecimal.fromString('1'), price1)
  return [price0, price1]
}

/**
 * Search through graph to find derived USD per token.
 **/
export function findUSDPerToken(token: Token): BigDecimal {
  if (STABLE_COINS.includes(token.id)) {
    return ONE_BD
  }
  let stableCoinPools = token.stableCoinPools
  let largestLiquidity = ZERO_BI

  let priceSoFar = BigDecimal.fromString("0.0")
  for (let i = 0; i < stableCoinPools.length; ++i) {
    let poolAddress = stableCoinPools[i]
    let pool = Pool.load(poolAddress)
    if (!pool) continue
    if (pool.liquidity.gt(ZERO_BI) && pool.liquidity.gt(largestLiquidity)) {
      if (pool.token0 == token.id) {
        // stable coin is token1
        let token1 = Token.load(pool.token1)
        if (!token1) continue
        largestLiquidity = pool.liquidity
        priceSoFar = pool.token0Price
      }
      if (pool.token1 == token.id) {
        // stable coin is token2
        let token0 = Token.load(pool.token0)
        if (!token0) continue
          largestLiquidity = pool.liquidity
          priceSoFar = pool.token1Price
      }
    }
  }

  return priceSoFar // nothing was found return 0
}

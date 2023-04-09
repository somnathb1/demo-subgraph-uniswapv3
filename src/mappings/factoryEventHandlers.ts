import { Address, BigInt } from '@graphprotocol/graph-ts'
import { Pool, Token } from '../../generated/schema'
import { Pool as PoolTemplate } from '../../generated/templates'
import { PoolCreated } from '../../generated/templates/Pool/Factory'
import { ZERO_BD, ZERO_BI } from '../utils/constants'
import { fetchTokenDecimals, fetchTokenName, fetchTokenSymbol, fetchTokenTotalSupply } from '../utils/fetchTokenData'
import { STABLE_COINS } from '../utils/priceUtils'

//Event handler that's called for Pool created event
export function handlePoolCreatedEvent(event: PoolCreated): void {
  let poolEntity = new Pool(event.params.pool.toHexString())
  let token0 = Token.load(event.params.token0.toHexString())
  let token1 = Token.load(event.params.token1.toHexString())

  // fetch info if null
  if (token0 === null) {
    token0 = createToken(event.params.token0)
  }

  if (token1 === null) {
    token1 = createToken(event.params.token1)
  }

  //if one of the token is a stable coin, add that to the other's list of stable pools
  if (STABLE_COINS.includes(token0.id)) {
    let newPools = token1.stableCoinPools
    newPools.push(poolEntity.id)
    token1.stableCoinPools = newPools
  }
  if (STABLE_COINS.includes(token1.id)) {
    let newPools = token0.stableCoinPools
    newPools.push(poolEntity.id)
    token0.stableCoinPools = newPools
  }

  //Add initial Pool values for entity
  poolEntity.createdAtTimestamp = event.block.timestamp
  poolEntity.createdAtBlockNumber = event.block.number
  poolEntity.token0 = token0.id
  poolEntity.token1 = token1.id
  poolEntity.feeTier = BigInt.fromI32(event.params.fee)
  poolEntity.liquidity = ZERO_BI
  poolEntity.sqrtPrice = ZERO_BI
  poolEntity.token0Price = ZERO_BD
  poolEntity.token1Price = ZERO_BD
  poolEntity.feesUSD = ZERO_BD
  poolEntity.txCount = ZERO_BI
  poolEntity.totalValueLockedToken0 = ZERO_BD
  poolEntity.totalValueLockedToken1 = ZERO_BD
  poolEntity.totalValueLockedUSD = ZERO_BD
  poolEntity.save()

  // add the contract address for tracking in Graph as PoolTemplate
  PoolTemplate.create(event.params.pool)
  token0.save()
  token1.save()
}

//Function to create a token entity by fetching details from its contract
export function createToken(id: Address): Token {
  let token = new Token(id.toHexString())
  token.symbol = fetchTokenSymbol(id)
  token.name = fetchTokenName(id)
  let decimals = fetchTokenDecimals(id)
  if (decimals === null || decimals.equals(BigInt.fromU32(0))) decimals = BigInt.fromI32(18)
  token.decimals = decimals
  token.totalSupply = fetchTokenTotalSupply(id)
  token.txCount = ZERO_BI
  token.poolCount = ZERO_BI
  token.tokenPriceUSD = ZERO_BD
  token.stableCoinPools = []
  token.save()
  return token
}


// Function to store a pool entity to the database by reading values from pool contract
// export function createPoolEntityFromAddress(onChainPoolAddr: Address): Pool {
//   let poolEntity = new Pool(onChainPoolAddr.toHexString())
//   let poolContract = PoolContract.bind(onChainPoolAddr)
//   let token0Addr = poolContract.token0()
//   let token1Addr = poolContract.token1()
//   let token0Contract = ERC20.bind(token0Addr)
//   let token1Contract = ERC20.bind(token1Addr)
//   let slotRes = poolContract.try_slot0()
//   if (!slotRes.reverted) {
//     poolEntity.sqrtPrice = slotRes.value.getSqrtPriceX96()
//   }
//   else {
//     poolEntity.sqrtPrice = BigInt.fromU32(40)
//   }

//   let token0Entity = Token.load(token0Addr.toHexString())
//   let token1Entity = Token.load(token1Addr.toHexString())

//   if (!token0Entity) token0Entity = createToken(token0Addr)
//   if (!token1Entity) token1Entity = createToken(token1Addr)
//   poolEntity.token0 = token0Entity.id
//   poolEntity.token1 = token1Entity.id
//   let feeResult = poolContract.fee()
//   poolEntity.feeTier = BigInt.fromI32(feeResult)
//   poolEntity.liquidity = poolContract.liquidity()
//   poolEntity.txCount = ZERO_BI
//   poolEntity.token0Price = ZERO_BD
//   poolEntity.token1Price = ZERO_BD
//   poolEntity.totalValueLockedToken0 = onChainValueToBigDecimal(token0Contract.balanceOf(onChainPoolAddr), token0Entity.decimals)
//   poolEntity.totalValueLockedToken1 = onChainValueToBigDecimal(token1Contract.balanceOf(onChainPoolAddr), token1Entity.decimals)
//   poolEntity.feesUSD = ZERO_BD
//   poolEntity.save()
//   return poolEntity
// }
import { ZERO_BD, ZERO_BI } from '../utils/constants'
/* eslint-disable prefer-const */
import { ethereum } from '@graphprotocol/graph-ts'
import {
  DayAccount,
  Pool,
  PoolDayData,
  UniswapDayData,
} from '../../generated/schema'

/**
 * Update daily data for whole factory/uniswap
 * @param event
 */
export function updateUniswapDayData(event: ethereum.Event): UniswapDayData {
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400 // rounded
  let dayStartTimestamp = dayID * 86400
  let uniswapDayData = UniswapDayData.load(dayID.toString())
  if (uniswapDayData === null) {
    //Create a new entity for the day
    uniswapDayData = new UniswapDayData(dayID.toString())
    uniswapDayData.date = dayStartTimestamp
    uniswapDayData.volumeUSD = ZERO_BD
    uniswapDayData.feesUSD = ZERO_BD
    uniswapDayData.txCount = ZERO_BI
    uniswapDayData.uniqueUsersCount = 0
  }
  
  uniswapDayData.save()

  let walletAddr = event.transaction.from
  
  //check if such a data point exists
  let todayAccountKey = dayID.toString()
  .concat("-")
  .concat(walletAddr.toHexString())
  
  let todayWallet = DayAccount.load(
    todayAccountKey
  )

  if(!todayWallet){
    todayWallet = new DayAccount(todayAccountKey)
  }
  if(todayWallet.count === 0){
    uniswapDayData.uniqueUsersCount++
  }
  todayWallet.count += 1
  todayWallet.dayId = dayID.toString()
  todayWallet.addr = walletAddr.toHexString()
  todayWallet.save()

  return uniswapDayData as UniswapDayData
}

/**
 * Update daily data for a given pool
 * @param event 
 * @returns 
 */
export function updatePoolDayData(event: ethereum.Event): PoolDayData {
  let timestamp = event.block.timestamp.toI32()
  let dayID = timestamp / 86400
  let dayStartTimestamp = dayID * 86400
  let dayPoolID = event.address
    .toHexString()
    .concat('-')
    .concat(dayID.toString())
  let pool = Pool.load(event.address.toHexString())
  //Create a new entity for the day
  if(!pool) pool = new Pool(event.address.toHexString())
  let poolDayData = PoolDayData.load(dayPoolID)
  if (poolDayData === null) {
    poolDayData = new PoolDayData(dayPoolID)
    poolDayData.date = dayStartTimestamp
    poolDayData.pool = pool.id
    poolDayData.feesUSD = ZERO_BD
  }
  poolDayData.save()
  return poolDayData as PoolDayData
}
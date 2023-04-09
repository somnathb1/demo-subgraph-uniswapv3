import { newMockEvent, newMockCall, newTypedMockEventWithParams, describe, test } from "matchstick-as"
import { ethereum, Address, Bytes } from "@graphprotocol/graph-ts"
import { PoolCreated, PoolCreated__Params } from "../generated/templates/Pool/Factory"

export function createPoolCreatedEvent(): PoolCreated {
  let mockEvent = newMockEvent()
  let poolCreatedEvent = new PoolCreated(
    mockEvent.address,
    mockEvent.logIndex,
    mockEvent.transactionLogIndex,
    mockEvent.logType,
    mockEvent.block,
    mockEvent.transaction,
    mockEvent.parameters,
    null
  )
  poolCreatedEvent.parameters = new Array()
    let token0 = new ethereum.EventParam('token0', ethereum.Value.fromAddress(Address.fromString("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48")))
    let token1 = new ethereum.EventParam('token1', ethereum.Value.fromAddress(Address.fromString("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2")))
    let fee = new ethereum.EventParam('fee', ethereum.Value.fromI32(10))
    let tickSpacing = new ethereum.EventParam('tickSpacing', ethereum.Value.fromI32(2))
    let pool = new ethereum.EventParam('pool', ethereum.Value.fromAddress(Address.fromString("0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8")))
    poolCreatedEvent.parameters.push(token0)
    poolCreatedEvent.parameters.push(token1)
    poolCreatedEvent.parameters.push(fee)
    poolCreatedEvent.parameters.push(tickSpacing)
    poolCreatedEvent.parameters.push(pool)
    return poolCreatedEvent
  }

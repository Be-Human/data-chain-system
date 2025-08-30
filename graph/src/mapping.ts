import { DataStored, TransactionLogged } from "../generated/DataLogger/DataLogger"
import { DataRecord, TransactionRecord } from "../generated/schema"

export function handleDataStored(event: DataStored): void {
  let record = new DataRecord(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  )
  
  record.recordId = event.params.recordId
  record.sender = event.params.sender.toHexString()
  record.category = event.params.category.toHexString() // indexed string 变成 hex
  record.data = event.params.data
  record.timestamp = event.params.timestamp
  record.blockNumber = event.block.number
  
  record.save()
}

export function handleTransactionLogged(event: TransactionLogged): void {
  let record = new TransactionRecord(
    event.transaction.hash.toHexString() + "-" + event.logIndex.toString()
  )
  
  record.recordId = event.params.recordId
  record.from = event.params.from.toHexString()
  record.to = event.params.to.toHexString()
  record.amount = event.params.amount
  record.memo = event.params.memo
  record.timestamp = event.params.timestamp
  record.blockNumber = event.block.number
  
  record.save()
}

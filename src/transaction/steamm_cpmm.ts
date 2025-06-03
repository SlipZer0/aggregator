import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, CLOCK_ADDRESS, Dex, Env, getAggregatorV2Extend2PublishedAt, Path } from ".."

export class SteammCPMM implements Dex {
  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("Steamm only supported on mainnet")
    }
  }

  async swap(
    client: AggregatorClient,
    txb: Transaction,
    path: Path,
    inputCoin: TransactionObjectArgument,
    packages?: Map<string, string>
  ): Promise<TransactionObjectArgument> {
    const { direction, from, target } = path

    const [func, coinAType, coinBType] = direction
      ? ["swap_a2b_v2", from, target]
      : ["swap_b2a_v2", target, from]

    if (path.extendedDetails == null) {
      throw new Error("Extended details not supported")
    } else {
      if (path.extendedDetails.steammBankA == null) {
        throw new Error("Steamm bank a type not supported")
      }
      if (path.extendedDetails.steammBankB == null) {
        throw new Error("Steamm bank b type not supported")
      }
      if (path.extendedDetails.steammLendingMarket == null) {
        throw new Error("Steamm lending market not supported")
      }
      if (path.extendedDetails.steammLendingMarketType == null) {
        throw new Error("Steamm lending market type not supported")
      }
      if (path.extendedDetails.steammBCoinAType == null) {
        throw new Error("Steamm b coin a type not supported")
      }
      if (path.extendedDetails.steammBCoinBType == null) {
        throw new Error("Steamm b coin b type not supported")
      }
      if (path.extendedDetails.steammLPToken == null) {
        throw new Error("Steamm lp token not supported")
      }
    }

    const args = [
      txb.object(path.id),
      txb.object(path.extendedDetails.steammBankA),
      txb.object(path.extendedDetails.steammBankB),
      txb.object(path.extendedDetails.steammLendingMarket),
      inputCoin,
      txb.object(CLOCK_ADDRESS),
    ]
    const publishedAt = getAggregatorV2Extend2PublishedAt(client.publishedAtV2Extend2(), packages)
    const res = txb.moveCall({
      target: `${publishedAt}::steamm_cpmm::${func}`,
      typeArguments: [
        path.extendedDetails.steammLendingMarketType,
        coinAType, 
        coinBType,
        path.extendedDetails.steammBCoinAType,
        path.extendedDetails.steammBCoinBType,
        path.extendedDetails.steammLPToken,
      ],
      arguments: args,
    }) as TransactionObjectArgument

    return res
  }
}

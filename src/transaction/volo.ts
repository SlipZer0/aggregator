import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, Dex, Env, getAggregatorV2Extend2PublishedAt, Path } from ".."

export class Volo implements Dex {
  private stakePool: string
  private metadata: string

  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("Volo only supported on mainnet")
    }

    this.stakePool =
      "0x2d914e23d82fedef1b5f56a32d5c64bdcc3087ccfea2b4d6ea51a71f587840e5"
    this.metadata =
      "0x680cd26af32b2bde8d3361e804c53ec1d1cfe24c7f039eb7f549e8dfde389a60"
  }

  async swap(
    client: AggregatorClient,
    txb: Transaction,
    path: Path,
    inputCoin: TransactionObjectArgument,
    packages?: Map<string, string>
  ): Promise<TransactionObjectArgument> {
    const { direction } = path

    const func = direction ? "swap_a2b" : "swap_b2a"

    const args = [
      txb.object(this.stakePool),
      txb.object(this.metadata),
      txb.object("0x5"),
      inputCoin,
    ]

    const publishedAt = getAggregatorV2Extend2PublishedAt(client.publishedAtV2Extend2(), packages)
    const res = txb.moveCall({
      target: `${publishedAt}::volo::${func}`,
      typeArguments: [],
      arguments: args,
    }) as TransactionObjectArgument

    return res
  }
}

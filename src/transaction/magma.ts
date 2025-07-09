import {
  Transaction,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import { AggregatorClient, CLOCK_ADDRESS, Dex, Env, getAggregatorV2Extend2PublishedAt, Path } from ".."

export class Magma implements Dex {
  private globalConfig: string

  constructor(env: Env) {
    if (env !== Env.Mainnet) {
      throw new Error("Magma CLMM only supported on mainnet")
    }

    this.globalConfig =
      "0x4c4e1402401f72c7d8533d0ed8d5f8949da363c7a3319ccef261ffe153d32f8a"
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
      ? ["swap_a2b", from, target]
      : ["swap_b2a", target, from]

    const args = [
      txb.object(this.globalConfig),
      txb.object(path.id),
      inputCoin,
      txb.object(CLOCK_ADDRESS),
    ]

    const publishedAt = getAggregatorV2Extend2PublishedAt(client.publishedAtV2Extend2(), packages)
    const res = txb.moveCall({
      target: `${publishedAt}::magma::${func}`,
      typeArguments: [coinAType, coinBType],
      arguments: args,
    }) as TransactionObjectArgument

    return res
  }
}

import {
  Transaction,
  TransactionArgument,
  TransactionObjectArgument,
} from "@mysten/sui/transactions"
import {
  AggregatorClient,
  CLOCK_ADDRESS,
  Dex,
  Env,
  getAggregatorV2Extend2PublishedAt,
  Path,
} from ".."

export class Sevenk implements Dex {
  private pythPriceIDs: Map<string, string>
  private oraclePublishedAt: string

  constructor(env: Env, pythPriceIDs: Map<string, string>) {
    if (env === Env.Testnet) {
      throw new Error("Sevenk is not supported on testnet")
    }
    this.pythPriceIDs = pythPriceIDs
    this.oraclePublishedAt = "0x8c36ea167c5e6da8c3d60b4fc897416105dcb986471bd81cfbfd38720a4487c0"
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

    let coinAPriceSeed: string
    let coinBPriceSeed: string
    let coinAOracleId: string
    let coinBOracleId: string
    let lpCapType: string

    if (path.extendedDetails == null) {
      throw new Error("Extended details not supported haedal pmm")
    } else {
      if (
        !path.extendedDetails.sevenkCoinAPriceSeed ||
        !path.extendedDetails.sevenkCoinBPriceSeed ||
        !path.extendedDetails.sevenkCoinAOracleId ||
        !path.extendedDetails.sevenkCoinBOracleId ||
        !path.extendedDetails.sevenkLPCapType
      ) {
        throw new Error("Base price seed or quote price seed not supported")
      }
      coinAPriceSeed = path.extendedDetails.sevenkCoinAPriceSeed
      coinBPriceSeed = path.extendedDetails.sevenkCoinBPriceSeed
      coinAOracleId = path.extendedDetails.sevenkCoinAOracleId
      coinBOracleId = path.extendedDetails.sevenkCoinBOracleId
      lpCapType = path.extendedDetails.sevenkLPCapType
    }

    const coinAPriceInfoObjectId = this.pythPriceIDs.get(coinAPriceSeed)
    const coinBPriceInfoObjectId = this.pythPriceIDs.get(coinBPriceSeed)

    if (!coinAPriceInfoObjectId || !coinBPriceInfoObjectId) {
      throw new Error(
        "Base price info object id or quote price info object id not found"
      )
    }

    const holder = txb.moveCall({
      target: `${this.oraclePublishedAt}::oracle::new_holder`,
      typeArguments: [],
      arguments: [],
    }) as TransactionArgument

    txb.moveCall({
      target: `${this.oraclePublishedAt}::pyth::get_price`,
      typeArguments: [],
      arguments: [
        txb.object(coinAOracleId),
        holder,
        txb.object(coinAPriceInfoObjectId),
        txb.object(CLOCK_ADDRESS),
      ],
    }) as TransactionArgument

    txb.moveCall({
      target: `${this.oraclePublishedAt}::pyth::get_price`,
      typeArguments: [],
      arguments: [
        txb.object(coinBOracleId),
        holder,
        txb.object(coinBPriceInfoObjectId),
        txb.object(CLOCK_ADDRESS),
      ],
    }) as TransactionArgument

    const args = [
      txb.object(path.id),
      holder,
      inputCoin,
    ]
    const publishedAt = getAggregatorV2Extend2PublishedAt(
      client.publishedAtV2Extend2(),
      packages
    )
    const res = txb.moveCall({
      target: `${publishedAt}::sevenk::${func}`,
      typeArguments: [coinAType, coinBType, lpCapType],
      arguments: args,
    }) as TransactionArgument
    return res
  }
}

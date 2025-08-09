
import BN from "bn.js"
import Decimal from "decimal.js"
import JSONbig from "json-bigint"
import { completionCoin } from "~/utils/coin"
import { ZERO } from "./const"
import {
  AggregatorServerErrorCode,
  getAggregatorServerErrorMessage,
} from "./errors"

// Keep SDK version up-to-date; bump as appropriate in CI/release pipeline.
const SDK_VERSION = 1001402

/** ---------------------------
 * Types (kept local for clarity)
 * ---------------------------- */

export interface CustomRoutingOptions {
  forcePost?: boolean
  preferredDexes?: string[]
  avoidDexes?: string[]
  customWeighting?: {
    priceWeight?: number
    liquidityWeight?: number
    gasWeight?: number
  }
}

export interface FindRouterParams {
  from: string
  target: string
  amount: BN
  byAmountIn: boolean
  depth?: number
  splitAlgorithm?: string
  splitFactor?: number
  splitCount?: number
  providers?: string[]
  liquidityChanges?: PreSwapLpChangeParams[]
}

export interface CustomFindRouterParams extends FindRouterParams {
  maxPriceImpact?: number
  preferredDexes?: string[]
  avoidDexes?: string[]
  customWeighting?: {
    priceWeight: number
    liquidityWeight: number
    gasWeight: number
  }
  forcePost?: boolean
  custom_routing_strategy?: string
  max_hops_per_path?: number
  preferred_liquidity_threshold?: number
}

export interface PreSwapLpChangeParams {
  poolID: string
  ticklower: number
  tickUpper: number
  deltaLiquidity: number
}

export type ExtendedDetails = {
  aftermathPoolFlatness?: number
  aftermathLpSupplyType?: string
  turbosFeeType?: string
  afterSqrtPrice?: string
  deepbookv3DeepFee?: number
  scallopScoinTreasury?: string
  haedalPmmBasePriceSeed?: string
  haedalPmmQuotePriceSeed?: string
  steammBankA?: string
  steammBankB?: string
  steammLendingMarket?: string
  steammLendingMarketType?: string
  steammBCoinAType?: string
  steammBCoinBType?: string
  steammLPToken?: string
  steammOracleRegistryId?: string
  steammOraclePythPriceSeedA?: string
  steammOraclePythPriceSeedB?: string
  steammOracleIndexA?: number
  steammOracleIndexB?: number
  metastablePriceSeed?: string
  metastableETHPriceSeed?: string
  metastableWhitelistedAppId?: string
  metastableCreateCapPkgId?: string
  metastableCreateCapModule?: string
  metastableCreateCapAllTypeParams?: boolean
  metastableRegistryId?: string
  obricCoinAPriceSeed?: string
  obricCoinBPriceSeed?: string
  obricCoinAPriceId?: string
  obricCoinBPriceId?: string
  sevenkCoinAPriceSeed?: string
  sevenkCoinBPriceSeed?: string
  sevenkCoinAOracleId?: string
  sevenkCoinBOracleId?: string
  sevenkLPCapType?: string
}

export type Path = {
  id: string
  direction: boolean
  provider: string
  from: string
  target: string
  feeRate: number
  amountIn: string
  amountOut: string
  version?: string
  extendedDetails?: ExtendedDetails
}

export type Router = {
  path: Path[]
  amountIn: BN
  amountOut: BN
  initialPrice: Decimal
}

export type RouterError = {
  code: number
  msg: string
}

export type RouterData = {
  amountIn: BN
  amountOut: BN
  byAmountIn: boolean
  routes: Router[]
  insufficientLiquidity: boolean
  deviationRatio?: number
  packages?: Map<string, string>
  totalDeepFee?: number
  error?: RouterError
  overlayFee?: number
}

export type AggregatorResponse = {
  code: number
  msg: string
  data: RouterData
}

/** ---------------------------
 * getRouterResult - public function used by SDK
 * ---------------------------- */
export async function getRouterResult(
  endpoint: string,
  apiKey: string,
  params: FindRouterParams,
  overlayFee: number,
  overlayFeeReceiver: string
): Promise<RouterData | null> {
  let response
  if (params.liquidityChanges && params.liquidityChanges.length > 0) {
    response = await postRouterWithLiquidityChanges(endpoint, params)
  } else {
    response = await getRouter(endpoint, apiKey, params)
  }

  if (!response) {
    return null
  }

  if (!response.ok) {
    let errorCode = AggregatorServerErrorCode.NumberTooLarge
    if (response.status === 429) {
      errorCode = AggregatorServerErrorCode.RateLimitExceeded
    }

    return {
      amountIn: ZERO,
      amountOut: ZERO,
      routes: [],
      byAmountIn: params.byAmountIn,
      insufficientLiquidity: false,
      deviationRatio: 0,
      error: {
        code: errorCode,
        msg: getAggregatorServerErrorMessage(errorCode),
      },
    }
  }

  // Use response.text() then JSONbig.parse to preserve bigints if present
  const text = await response.text()
  const data = JSONbig.parse(text)
  const insufficientLiquidity = data.msg === "liquidity is not enough"

  if (data.msg && data.msg.indexOf("HoneyPot scam") > -1) {
    return {
      amountIn: ZERO,
      amountOut: ZERO,
      routes: [],
      byAmountIn: params.byAmountIn,
      insufficientLiquidity,
      deviationRatio: 0,
      error: {
        code: AggregatorServerErrorCode.HoneyPot,
        msg: getAggregatorServerErrorMessage(AggregatorServerErrorCode.HoneyPot),
      },
    }
  }

  if (data.data != null) {
    // Use local parser to avoid cross-file dependency
    const res = parseRouterResponseLocal(data.data, params.byAmountIn)
    if (overlayFee > 0 && overlayFeeReceiver !== "0x0") {
      if (params.byAmountIn) {
        const overlayFeeAmount = res.amountOut.mul(new BN(overlayFee)).div(new BN(1000000))
        res.overlayFee = Number(overlayFeeAmount.toString())
        res.amountOut = res.amountOut.sub(overlayFeeAmount)
      } else {
        const overlayFeeAmount = res.amountIn.mul(new BN(overlayFee)).div(new BN(1000000))
        res.overlayFee = Number(overlayFeeAmount.toString())
        res.amountIn = res.amountIn.add(overlayFeeAmount)
      }
    }
    return res
  }

  return {
    amountIn: ZERO,
    amountOut: ZERO,
    routes: [],
    insufficientLiquidity,
    byAmountIn: params.byAmountIn,
    deviationRatio: 0,
    error: {
      code: AggregatorServerErrorCode.InsufficientLiquidity,
      msg: getAggregatorServerErrorMessage(AggregatorServerErrorCode.InsufficientLiquidity),
    },
  }
}

/** ---------------------------
 * httpRequestWithRetry - small retry helper
 * ---------------------------- */
async function httpRequestWithRetry(url: string, opts: RequestInit = {}, retries = 3): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await fetch(url, opts)
      if (!resp.ok) {
        const errText = await resp.text().catch(() => resp.statusText)
        throw new Error(`HTTP ${resp.status} ${resp.statusText} - ${errText}`)
      }
      const raw = await resp.text()
      try {
        return JSONbig.parse(raw)
      } catch {
        return JSON.parse(raw)
      }
    } catch (err) {
      if (attempt === retries) throw err
      const backoffMs = 150 * Math.pow(2, attempt)
      await new Promise((r) => setTimeout(r, backoffMs))
    }
  }
  throw new Error("httpRequestWithRetry: unexpected flow")
}

/** ---------------------------
 * callRoutingService - unified GET/POST caller
 * ---------------------------- */
async function callRoutingService(
  endpoint: string,
  apiKey: string | undefined,
  baseParams: FindRouterParams,
  customOptions?: CustomRoutingOptions
): Promise<any> {
  const mergedParams: any = {
    ...baseParams,
  }

  if (customOptions?.preferredDexes?.length) mergedParams.preferred_dexes = customOptions.preferredDexes
  if (customOptions?.avoidDexes?.length) mergedParams.avoid_dexes = customOptions.avoidDexes
  if (customOptions?.customWeighting) mergedParams.custom_weighting = customOptions.customWeighting

  const forcePost = Boolean(customOptions?.forcePost || (baseParams.liquidityChanges && baseParams.liquidityChanges.length))

  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (apiKey && apiKey.length > 0) headers["x-api-key"] = apiKey

  if (forcePost) {
    const url = `${endpoint.replace(/\/$/, "")}/find_routes`
    const bodyPayload = {
      ...mergedParams,
      v: SDK_VERSION,
      timestamp: Date.now(),
    }
    return await httpRequestWithRetry(url, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyPayload),
    })
  } else {
    const q = new URLSearchParams()
    q.set("from", completionCoin(baseParams.from))
    q.set("target", completionCoin(baseParams.target))
    q.set("amount", baseParams.amount.toString())
    q.set("by_amount_in", String(baseParams.byAmountIn))
    q.set("v", String(SDK_VERSION))

    if (baseParams.depth != null) q.set("depth", String(baseParams.depth))
    if (baseParams.splitAlgorithm) q.set("split_algorithm", baseParams.splitAlgorithm)
    if (baseParams.splitFactor != null) q.set("split_factor", String(baseParams.splitFactor))
    if (baseParams.splitCount != null) q.set("split_count", String(baseParams.splitCount))
    if (baseParams.providers && baseParams.providers.length) q.set("providers", baseParams.providers.join(","))
    if (mergedParams.preferred_dexes) q.set("preferred_dexes", mergedParams.preferred_dexes.join(","))
    if (mergedParams.avoid_dexes) q.set("avoid_dexes", mergedParams.avoid_dexes.join(","))
    if (mergedParams.custom_weighting) q.set("custom_weighting", JSON.stringify(mergedParams.custom_weighting))

    const url = `${endpoint.replace(/\/$/, "")}/find_routes?${q.toString()}`
    return await httpRequestWithRetry(url, {
      method: "GET",
      headers,
    })
  }
}

/** ---------------------------
 * getRouter - wrapper that returns a Response-like object for compatibility
 * ---------------------------- */
async function getRouter(endpoint: string, apiKey: string, params: FindRouterParams) {
  try {
    const parsed = await callRoutingService(endpoint, apiKey, params, {})
    return {
      ok: true,
      text: async () => JSON.stringify(parsed),
      status: 200,
    } as any
  } catch (error) {
    console.error("getRouter error:", error)
    return null
  }
}

/** ---------------------------
 * postRouterWithLiquidityChanges - POST variant that returns Response-like
 * ---------------------------- */
async function postRouterWithLiquidityChanges(endpoint: string, params: FindRouterParams) {
  const {
    from,
    target,
    amount,
    byAmountIn,
    depth,
    splitAlgorithm,
    splitFactor,
    splitCount,
    providers,
    liquidityChanges,
  } = params

  const fromCoin = completionCoin(from)
  const targetCoin = completionCoin(target)
  const url = `${endpoint.replace(/\/$/, "")}/find_routes`
  const providersStr = providers?.join(",")
  const requestData: any = {
    from: fromCoin,
    target: targetCoin,
    amount: Number(amount.toString()),
    by_amount_in: byAmountIn,
    depth,
    split_algorithm: splitAlgorithm,
    split_factor: splitFactor,
    split_count: splitCount,
    providers: providersStr,
    liquidity_changes:
      liquidityChanges?.map((change) => ({
        pool: change.poolID,
        tick_lower: change.ticklower,
        tick_upper: change.tickUpper,
        delta_liquidity: change.deltaLiquidity,
      })) ?? [],
    v: SDK_VERSION,
  }

  try {
    const parsed = await httpRequestWithRetry(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestData),
    })
    return {
      ok: true,
      text: async () => JSON.stringify(parsed),
      status: 200,
    } as any
  } catch (error) {
    console.error("postRouterWithLiquidityChanges Error:", error)
    return null
  }
}

/** ---------------------------
 * getDeepbookV3Config - unchanged semantics
 * ---------------------------- */
export type DeepbookV3Config = {
  id: string
  is_alternative_payment: boolean
  alternative_payment_amount: number
  trade_cap: string
  balance_manager: string
  deep_fee_vault: number
  whitelist: number
  package_version: 0
  last_updated_time: number
  whitelist_pools: string[]
}

export type DeepbookV3ConfigResponse = {
  code: number
  msg: string
  data: DeepbookV3Config
}

export async function getDeepbookV3Config(endpoint: string): Promise<DeepbookV3ConfigResponse | null> {
  const url = `${endpoint.replace(/\/$/, "")}/deepbookv3_config`
  try {
    const resp = await httpRequestWithRetry(url, { method: "GET" })
    return resp as DeepbookV3ConfigResponse
  } catch (error) {
    console.error("getDeepbookV3Config Error:", error)
    return null
  }
}

/** ---------------------------
 * parseRouterResponseLocal
 * - Local parser that normalizes server `data` into RouterData.
 * - Kept compact and defensive to avoid external dependency on client.ts export.
 * ---------------------------- */
function parseRouterResponseLocal(serverData: any, byAmountIn: boolean): RouterData {
  const toBN = (v: any): BN => {
    try {
      if (BN.isBN(v)) return v
      return new BN(String(v ?? "0"))
    } catch {
      return new BN(0)
    }
  }

  const normalizePath = (p: any): Path => ({
    id: String(p.id ?? ""),
    direction: Boolean(p.direction ?? false),
    provider: String(p.provider ?? ""),
    from: String(p.from ?? ""),
    target: String(p.target ?? ""),
    feeRate: Number(p.feeRate ?? 0),
    amountIn: String(p.amountIn ?? p.amount_in ?? "0"),
    amountOut: String(p.amountOut ?? p.amount_out ?? "0"),
    version: p.version,
    extendedDetails: p.extendedDetails ?? undefined,
  })

  const routes: Router[] = (serverData.routes ?? []).map((r: any) => {
    const path = Array.isArray(r.path) ? r.path.map(normalizePath) : []
    return {
      path,
      amountIn: toBN(r.amount_in ?? r.amountIn ?? "0"),
      amountOut: toBN(r.amount_out ?? r.amountOut ?? "0"),
      initialPrice: new Decimal(r.initial_price ?? r.initialPrice ?? 0),
    }
  })

  const routerData: RouterData = {
    amountIn: toBN(serverData.amount_in ?? serverData.amountIn ?? (byAmountIn ? serverData.amount : 0)),
    amountOut: toBN(serverData.amount_out ?? serverData.amountOut ?? (!byAmountIn ? serverData.amount : 0)),
    byAmountIn,
    routes,
    insufficientLiquidity: Boolean(serverData.insufficient_liquidity ?? false),
    deviationRatio: Number(serverData.deviation_ratio ?? serverData.deviationRatio ?? 0),
    packages: serverData.packages ? new Map(Object.entries(serverData.packages)) : undefined,
    totalDeepFee: serverData.total_deep_fee ?? serverData.totalDeepFee,
  }

  return routerData
}

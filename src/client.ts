
// Local alias to avoid TS errors if '@mysten/sui.js' isn't installed yet.
// Replace with the real type import once the SDK is present.
type TransactionBlock = any

import BN from "bn.js"
import Decimal from "decimal.js"

// Import shared types from src/api.ts (ensure api.ts exports these)
import { RouterData as ApiRouterData, Router as ApiRouter, Path as ApiPath } from "./api"

// Import CustomDex (factory will refer to it)
import { CustomDex } from "./dex/custom_dex"


/**
 * A simplified router route type used for ranking and processing.
 * Many fields mirror what the server returns; we add some computed helpers locally.
 */
export type RouterRoute = {
  path: ApiPath[]
  amountIn: BN
  amountOut: BN
  initialPrice?: Decimal
  priceImpact?: number
  totalLiquidity?: number
  estimatedGas?: number
  // runtime-only field used for sorting / diagnostics
  _customScore?: number
}

/* ---------------------------
   parseRouterResponse
   ---------------------------
   Convert server-side routing data into the SDK RouterData shape.
   This function is intentionally defensive - it accepts common server shapes
   and normalizes numeric fields into BN / Decimal.
*/
export function parseRouterResponse(serverData: any, byAmountIn: boolean): ApiRouterData {
  // Defensive helper to parse numeric fields that might be string or number
  const toBN = (value: any): BN => {
    try {
      if (BN.isBN(value)) return value
      return new BN(String(value ?? "0"))
    } catch (e) {
      return new BN(0)
    }
  }

  // Normalize a server Path into ApiPath
  const normalizePath = (p: any): ApiPath => {
    return {
      id: String(p.id ?? ""),
      direction: Boolean(p.direction ?? false),
      provider: String(p.provider ?? ""),
      from: String(p.from ?? ""),
      target: String(p.target ?? ""),
      feeRate: Number(p.feeRate ?? 0),
      amountIn: String(p.amountIn ?? "0"),
      amountOut: String(p.amountOut ?? "0"),
      version: p.version,
      extendedDetails: p.extendedDetails ?? undefined,
    }
  }

  // Map server's route list
  const routes: ApiRouter[] = (serverData.routes ?? []).map((r: any) => {
    const path = Array.isArray(r.path) ? r.path.map(normalizePath) : []
    return {
      path,
      amountIn: toBN(r.amount_in ?? r.amountIn ?? "0"),
      amountOut: toBN(r.amount_out ?? r.amountOut ?? "0"),
      initialPrice: new Decimal(r.initial_price ?? r.initialPrice ?? 0),
    }
  })

  // Compose RouterData shape (keep fields basic; additional fields may be added by caller)
  const routerData: ApiRouterData = {
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

/* ---------------------------
   AggregatorClient
   --------------------------- Lightweight client shell that provides:
   - findRouters (expected to be implemented or proxied by repo's API layer)
   - customFindRouters wrapper (added customization)
   - DEX factory that supports CUSTOM_DEX
*/
export class AggregatorClient {
  private env: any
  private pythPriceIDs?: Map<string, string>

  /**
   * Construct the client.
   * @param env - environment config (endpoints, providers list, etc.)
   * @param pythPriceIDs - optional mapping token -> pyth price id
   */
  constructor(env: any = {}, pythPriceIDs?: Map<string, string>) {
    this.env = env
    this.pythPriceIDs = pythPriceIDs
  }

  /**
   * findRouters
   * - This method should be the canonical network-backed router call or proxy to another module.
   * - In the original repo it calls the routing backend; here we keep it as a stub that callers
   *   can override / mock in tests. If your runtime expects direct network interaction, replace
   *   this method with the real implementation that calls src/api.getRouterResult or similar.
   */
  async findRouters(params: any): Promise<ApiRouterData | null> {
    // Default behavior: return null to indicate "not implemented".
    // Production code in the repo would call the HTTP API / internal module here.
    // Keep stub minimal to avoid accidental network calls.
    return null
  }

  /* ---------------------------
     Custom wrapper: customFindRouters
     ---------------------------
     - Adds pre-validation, provider selection, and post-ranking
     - Non-invasive: calls the original findRouters and post-processes the result
  */
  async customFindRouters(params: any & { preferredDexes?: string[]; avoidDexes?: string[]; customWeighting?: any; forcePost?: boolean; maxPriceImpact?: number }): Promise<ApiRouterData | null> {
    // 1) Basic validation: enforce a minimal amount threshold (to avoid tiny dust queries)
    const MIN_AMOUNT = new BN("1000") // base unit threshold - adjust to your chain's base units
    if (!params.amount || (BN.isBN(params.amount) && params.amount.lt(MIN_AMOUNT))) {
      throw new Error("Amount too small for routing")
    }

    // 2) Provider selection: respect preferred / avoid DEX lists from params
    const selectedProviders = this.selectOptimalProviders(params.from, params.target, params.preferredDexes, params.avoidDexes)

    // Shallow clone params and inject provider ordering
    const callParams = { ...params, providers: selectedProviders }

    // 3) Prefer POST if explicitly asked or liquidityChanges exist (keeps parity with api.ts behavior)
    if (params.forcePost) callParams.forcePost = true

    // 4) Call the canonical findRouters (network-backed) implementation
    const result = await this.findRouters(callParams)

    // 5) Post-process: if result has routes, compute custom scores and sort using provided weights
    if (result && Array.isArray(result.routes) && result.routes.length > 0) {
      // Map routes into RouterRoute for scoring then convert back
      const scoredRoutes: RouterRoute[] = result.routes.map((r) => ({
        path: r.path,
        amountIn: r.amountIn,
        amountOut: r.amountOut,
        initialPrice: r.initialPrice,
        priceImpact: computePriceImpact(r),
        totalLiquidity: estimateRouteLiquidity(r),
        estimatedGas: estimateRouteGas(r),
      }))

      // Rank routes by custom criteria (provided weights or defaults)
      const ranked = this.rankRoutesByCustomCriteria(scoredRoutes, params.customWeighting)

      // Convert back to ApiRouter[] preserving original fields but sorted
      result.routes = ranked.map((r) => ({
        path: r.path,
        amountIn: r.amountIn,
        amountOut: r.amountOut,
        initialPrice: r.initialPrice ?? new Decimal(0),
      }))

      // Optionally enforce maxPriceImpact (filter out routes above threshold)
      if (typeof params.maxPriceImpact === "number") {
        result.routes = result.routes.filter((r) => {
          const impact = computePriceImpact(r)
          return impact <= params.maxPriceImpact!
        })
      }
    }

    return result
  }

  /* ---------------------------
     selectOptimalProviders
     ---------------------------
     Choose provider ordering based on preferences and avoid-list.
     Keeps repository defaults if none provided.
  */
  private selectOptimalProviders(fromToken: string, toToken: string, preferredDexes?: string[], avoidDexes?: string[]): string[] {
    // Obtain default provider list from env or use built-in default
    const defaultProviders: string[] = (this.env && Array.isArray(this.env.providers) && this.env.providers.length) ? this.env.providers : ["CETUS", "DEEPBOOK", "CLMM"]

    // Filter out any providers in avoidDexes
    const filtered = defaultProviders.filter((p) => !(avoidDexes ?? []).includes(p))

    // If preferredDexes provided, ensure they appear first (unique)
    if (preferredDexes && preferredDexes.length) {
      const uniqueOrdered = Array.from(new Set([...preferredDexes, ...filtered]))
      return uniqueOrdered
    }

    return filtered
  }

  /* ---------------------------
     rankRoutesByCustomCriteria
     ---------------------------
     Score each route with a weighted sum of price / liquidity / gas heuristics.
     Returns the routes sorted descending by computed score.
  */
  private rankRoutesByCustomCriteria(routes: RouterRoute[], weights?: { priceWeight?: number; liquidityWeight?: number; gasWeight?: number }): RouterRoute[] {
    const defaultWeights = { priceWeight: 0.7, liquidityWeight: 0.2, gasWeight: 0.1 }
    const w = { ...defaultWeights, ...(weights ?? {}) }

    for (const route of routes) {
      // Basic scoring heuristics:
      // - priceScore: higher when priceImpact is lower
      const priceScore = 1 / (1 + (route.priceImpact ?? 0))
      // - liquidityScore: higher when route has larger liquidity (take log to flatten)
      const liquidityScore = Math.log(1 + Math.max(0, route.totalLiquidity ?? 0))
      // - gasScore: higher when estimatedGas is lower
      const gasScore = 1 / (1 + Math.max(0, route.estimatedGas ?? 0))

      // Weighted sum
      route._customScore = priceScore * w.priceWeight + liquidityScore * w.liquidityWeight + gasScore * w.gasWeight
    }

    // Sort descending by score
    routes.sort((a, b) => (b._customScore ?? 0) - (a._customScore ?? 0))
    return routes
  }

  /* ---------------------------
     DEX Factory (minimal)
     ---------------------------
     Create provider instances by name. Keep this small to avoid touching many files.
  */
  newDex(provider: string, pythPriceIDs?: Map<string, string>, partner?: string): any {
    switch (provider) {
      case "CETUS":
        // In the real repo you'd return the CetusDex implementation instance.
        // Keep placeholder to avoid adding heavy imports.
        return { name: "CETUS" }
      case "DEEPBOOK":
        return { name: "DEEPBOOK" }
      case "CLMM":
        return { name: "CLMM" }
      case "CUSTOM_DEX":
        // Return the CustomDex instance we added in src/dex/custom_dex.ts
        return new CustomDex(this.env, pythPriceIDs)
      default:
        throw new Error(`Unsupported dex provider: ${provider}`)
    }
  }
}

/* ---------------------------
   Small heuristics - keep them isolated for clarity
   --------------------------- */

/** computePriceImpact - best-effort estimation of price impact based on amountIn/amountOut */
function computePriceImpact(route: any): number {
  try {
    // price impact = (idealOut - actualOut) / idealOut
    // idealOut approximated by amountIn * initialPrice (if initialPrice present)
    const amountInBN: BN = route.amountIn
    const amountOutBN: BN = route.amountOut
    const initialPrice: Decimal = (route.initialPrice instanceof Decimal) ? route.initialPrice : new Decimal(route.initialPrice ?? 0)

    if (initialPrice.lte(0)) return 0
    const idealOutDecimal = new Decimal(amountInBN.toString()).mul(initialPrice)
    const actualOutDecimal = new Decimal(amountOutBN.toString())
    if (idealOutDecimal.lte(0)) return 0
    const impact = idealOutDecimal.minus(actualOutDecimal).div(idealOutDecimal).toNumber()
    return Math.max(0, impact)
  } catch (e) {
    return 0
  }
}

/** estimateRouteLiquidity - naive aggregator: sum approximate liquidity from path extendedDetails when present */
function estimateRouteLiquidity(route: any): number {
  try {
    // look for path extendedDetails and sum numbers like deepbookv3DeepFee or other liquidity hints
    let sum = 0
    for (const p of route.path ?? []) {
      if (p.extendedDetails && typeof p.extendedDetails.deepbookv3DeepFee === "number") {
        sum += p.extendedDetails.deepbookv3DeepFee
      }
    }
    return sum
  } catch {
    return 0
  }
}

/** estimateRouteGas - placeholder heuristic; prefer routes with fewer hops */
function estimateRouteGas(route: any): number {
  try {
    const hops = (route.path && route.path.length) || 1
    return hops // more hops → higher gas estimate
  } catch {
    return 1
  }
}

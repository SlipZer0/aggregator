// tests/custom-routing.test.ts
/**
 * Jest unit test for customFindRouters wrapper.
 *
 * - Mocks AggregatorClient.findRouters to avoid network calls.
 * - Verifies that customFindRouters applies provider selection and ranking.
 */

import BN from "bn.js"
import { AggregatorClient, parseRouterResponse } from "../src/client"

describe("AggregatorClient.customFindRouters", () => {
  test("should call underlying findRouters and return ranked routes", async () => {
    // Create a client with an env that defines default providers (so selectOptimalProviders uses it)
    const env = { providers: ["CETUS", "DEEPBOOK", "CLMM"] }
    const client = new AggregatorClient(env)

    // Prepare a fake server result for two routes with different heuristics
    const fakeRouteA = {
      path: [{ id: "p1", direction: true, provider: "CETUS", from: "A", target: "B", feeRate: 0.003, amountIn: "1000", amountOut: "980" }],
      amountIn: new BN("1000"),
      amountOut: new BN("980"),
      initialPrice: { toString: () => "1" },
    }
    const fakeRouteB = {
      path: [{ id: "p2", direction: true, provider: "DEEPBOOK", from: "A", target: "B", feeRate: 0.001, amountIn: "1000", amountOut: "990" }],
      amountIn: new BN("1000"),
      amountOut: new BN("990"),
      initialPrice: { toString: () => "1" },
    }

    // Spy on client.findRouters and return our fake routes
    const spy = jest.spyOn(client, "findRouters").mockImplementation(async (params) => {
      return {
        amountIn: new BN("1000"),
        amountOut: new BN("990"),
        byAmountIn: true,
        routes: [fakeRouteA, fakeRouteB],
        insufficientLiquidity: false,
      }
    })

    const params = {
      from: "A",
      target: "B",
      amount: new BN("1000"),
      byAmountIn: true,
      preferredDexes: ["DEEPBOOK"], // prefer DEEPBOOK which should place routeB higher
      customWeighting: { priceWeight: 0.8, liquidityWeight: 0.1, gasWeight: 0.1 },
    }

    const result = await (client).customFindRouters(params)
    expect(result).not.toBeNull()
    expect(Array.isArray(result.routes)).toBe(true)
    expect(result.routes.length).toBeGreaterThan(0)

    // Because we preferred DEEPBOOK and routeB has better amountOut (990 vs 980),
    // routeB should appear before routeA after ranking.
    const firstProvider = result.routes[0].path[0].provider
    expect(firstProvider).toBe("DEEPBOOK")

    // restore mock
    spy.mockRestore()
  })
})

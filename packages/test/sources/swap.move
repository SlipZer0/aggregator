#[allow(unused_use, unused_field, unused_variable)]
module test::swap;

use bluefin_spot::config::GlobalConfig as BluefinGlobalConfig;
use bluefin_spot::pool::Pool as BluefinPool;
use cetusclmm::config::GlobalConfig;
use cetusclmm::partner::Partner;
use cetusclmm::pool::{Self, Pool, FlashSwapReceipt};
use cetusclmm::tick_math;
use flowx_clmm::pool_manager::{PoolRegistry, borrow_mut_pool};
use flowx_clmm::versioned::Versioned;
use std::type_name::{Self, TypeName};
use sui::balance;
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event::emit;
use turbos_dex::pool::{Pool as TurbosPool, Versioned as TurbosVersioned};
use turbos_dex::swap_router::{swap_a_b_with_return_, swap_b_a_with_return_};

public fun test_cetus_swap_a2b<CoinA, CoinB>(
    config: &GlobalConfig,
    pool: &mut Pool<CoinA, CoinB>,
    partner: &mut Partner,
    coin_a: Coin<CoinA>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinB> {
    cetus_aggregator_simple::cetus::swap_a2b(config, pool, partner, coin_a, clock, ctx)
}

public fun test_cetus_swap_b2a<CoinA, CoinB>(
    config: &GlobalConfig,
    pool: &mut Pool<CoinA, CoinB>,
    partner: &mut Partner,
    coin_b: Coin<CoinB>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinA> {
    cetus_aggregator_simple::cetus::swap_b2a(config, pool, partner, coin_b, clock, ctx)
}

public fun test_bluefin_swap_a2b<CoinA, CoinB>(
    config: &mut BluefinGlobalConfig,
    pool: &mut BluefinPool<CoinA, CoinB>,
    coin_a: Coin<CoinA>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinB> {
    cetus_aggregator_simple::bluefin::swap_a2b(config, pool, coin_a, clock, ctx)
}

public fun test_bluefin_swap_b2a<CoinA, CoinB>(
    config: &mut BluefinGlobalConfig,
    pool: &mut BluefinPool<CoinA, CoinB>,
    coin_b: Coin<CoinB>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinA> {
    cetus_aggregator_simple::bluefin::swap_b2a(config, pool, coin_b, clock, ctx)
}

public fun test_flowx_clmm_swap_a2b<CoinA, CoinB>(
    pool_register: &mut PoolRegistry,
    fee: u64,
    coin_a: Coin<CoinA>,
    versioned: &Versioned,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinB> {
    cetus_aggregator_simple::flowx_clmm::swap_a2b(pool_register, fee, coin_a, versioned, clock, ctx)
}

public fun test_flowx_clmm_swap_b2a<CoinA, CoinB>(
    pool_register: &mut PoolRegistry,
    fee: u64,
    coin_a: Coin<CoinB>,
    versioned: &Versioned,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinA> {
    cetus_aggregator_simple::flowx_clmm::swap_b2a(pool_register, fee, coin_a, versioned, clock, ctx)
}

public fun test_turbos_swap_a2b<CoinA, CoinB, Fee>(
    pool: &mut TurbosPool<CoinA, CoinB, Fee>,
    coin_a: Coin<CoinA>,
    clock: &Clock,
    versioned: &TurbosVersioned,
    ctx: &mut TxContext,
): Coin<CoinB> {
    cetus_aggregator_simple::turbos::swap_a2b(pool, coin_a, clock, versioned, ctx)
}

public fun test_turbos_swap_b2a<CoinA, CoinB, Fee>(
    pool: &mut TurbosPool<CoinA, CoinB, Fee>,
    coin_b: Coin<CoinB>,
    clock: &Clock,
    versioned: &TurbosVersioned,
    ctx: &mut TxContext,
): Coin<CoinA> {
    cetus_aggregator_simple::turbos::swap_b2a(pool, coin_b, clock, versioned, ctx)
}

public fun test_haedal_pmm_swap_a2b<CoinA, CoinB>(
    pool: &mut Pool<CoinA, CoinB>,
    coin_a: Coin<CoinA>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinB> {
    cetus_aggregator_simple::haedal_pmm::swap_a2b(pool, coin_a, clock, ctx)
}

public fun test_haedal_pmm_swap_b2a<CoinA, CoinB>(
    pool: &mut Pool<CoinA, CoinB>,
    coin_b: Coin<CoinB>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinA> {
    cetus_aggregator_simple::haedal_pmm::swap_b2a(pool, coin_b, clock, ctx)
}

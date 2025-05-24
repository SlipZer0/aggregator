#[allow(unused_use, unused_field, unused_variable)]
module test::cetus;

use cetusclmm::config::GlobalConfig;
use cetusclmm::partner::Partner;
use cetusclmm::pool::{Self, Pool, FlashSwapReceipt};
use cetusclmm::tick_math;
use std::type_name::{Self, TypeName};
use sui::balance;
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event::emit;

public fun swap_a2b<CoinA, CoinB>(
    config: &GlobalConfig,
    pool: &mut Pool<CoinA, CoinB>,
    partner: &mut Partner,
    coin_a: Coin<CoinA>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinB> {
    cetus_aggregator_simple::cetus::swap_a2b(config, pool, partner, coin_a, clock, ctx)
}

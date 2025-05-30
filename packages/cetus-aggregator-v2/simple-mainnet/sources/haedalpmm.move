#[allow(unused_use, unused_field, unused_variable)]
module cetus_aggregator_simple::haedalpmm;

use cetus_aggregator_simple::utils;
use haedal_pmm::oracle_driven_pool::Pool;
use haedal_pmm::trader::{sell_base_coin, sell_quote_coin};
use pyth::price_info::PriceInfoObject;
use std::type_name::{Self, TypeName};
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event::emit;

public struct HaedalPmmSwapEvent has copy, drop, store {
    pool: ID,
    amount_in: u64,
    amount_out: u64,
    a2b: bool,
    by_amount_in: bool,
    coin_a: TypeName,
    coin_b: TypeName,
}

public fun swap_a2b<CoinA, CoinB>(
    pool: &mut Pool<CoinA, CoinB>,
    base_price_pair_obj: &PriceInfoObject,
    quote_price_pair_obj: &PriceInfoObject,
    coin_a: Coin<CoinA>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinB> {
    abort 0
}

public fun swap_b2a<CoinA, CoinB>(
    pool: &mut Pool<CoinA, CoinB>,
    base_price_pair_obj: &PriceInfoObject,
    quote_price_pair_obj: &PriceInfoObject,
    coin_b: Coin<CoinB>,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<CoinA> {
    abort 0
}

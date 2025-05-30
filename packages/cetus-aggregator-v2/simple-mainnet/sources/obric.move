#[allow(unused_use, unused_field, unused_variable)]
module cetus_aggregator_simple::obric;

use obric::v2::{TradingPair, swap_x_to_y, swap_y_to_x};
use pyth::price_info::PriceInfoObject;
use pyth::state::State as PythState;
use std::type_name::{Self, TypeName};
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event::emit;

public struct ObricSwapEvent has copy, drop, store {
    pool_id: ID,
    amount_in: u64,
    amount_out: u64,
    a2b: bool,
    by_amount_in: bool,
    coin_a: TypeName,
    coin_b: TypeName,
}

public fun swap_a2b<COIN_A, COIN_B>(
    pool: &mut TradingPair<COIN_A, COIN_B>,
    coin_a: Coin<COIN_A>,
    pyth_state: &PythState,
    a_price_info_object: &PriceInfoObject,
    b_price_info_object: &PriceInfoObject,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<COIN_B> {
    abort 0
}

public fun swap_b2a<COIN_A, COIN_B>(
    pool: &mut TradingPair<COIN_A, COIN_B>,
    coin_b: Coin<COIN_B>,
    pyth_state: &PythState,
    a_price_info_object: &PriceInfoObject,
    b_price_info_object: &PriceInfoObject,
    clock: &Clock,
    ctx: &mut TxContext,
): Coin<COIN_A> {
    abort 0
}

module cetus_aggregator_simple::bluefin {
    use bluefin_spot::config::GlobalConfig;
    use bluefin_spot::pool::{swap, Pool};
    use cetus_aggregator_simple::utils;
    use cetusclmm::tick_math;
    use std::type_name::{Self, TypeName};
    use sui::balance;
    use sui::clock::Clock;
    use sui::coin::{Self, Coin};
    use sui::event::emit;

    public struct BluefinSwapEvent has copy, drop, store {
        pool: ID,
        amount_in: u64,
        amount_out: u64,
        a2b: bool,
        by_amount_in: bool,
        coin_a: TypeName,
        coin_b: TypeName,
    }

    public fun swap_a2b<CoinA, CoinB>(
        global_config: &mut GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        coin_a: Coin<CoinA>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<CoinB> {
        abort 0
    }

    public fun swap_b2a<CoinA, CoinB>(
        global_config: &mut GlobalConfig,
        pool: &mut Pool<CoinA, CoinB>,
        coin_b: Coin<CoinB>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<CoinA> {
        abort 0
    }
}

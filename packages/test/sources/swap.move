#[allow(unused_use, unused_field, unused_variable)]
module test::cetus {
    use cetus_clmm::config::GlobalConfig;
    use cetus_clmm::partner::Partner;
    use cetus_clmm::pool::{Self, Pool, FlashSwapReceipt};
    use cetus_clmm::tick_math;
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
        cetus_aggregator_v2::cetus::swap_a2b(config, pool, partner, coin_a, clock, ctx)
    }
}

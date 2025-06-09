module cetus_aggregator_simple::deepbookv3 {
    use deepbookv3::pool::Pool;
    use deepbookv3_vaults_v2::global_config::GlobalConfig as GlobalConfigV2;
    use std::type_name::{Self, TypeName};
    use sui::clock::Clock;
    use sui::coin::{Self, Coin};
    use sui::event::emit;
    use token::deep::DEEP;

    public struct DeepbookV3SwapEvent has copy, drop, store {
        pool: ID,
        amount_in: u64,
        amount_out: u64,
        a2b: bool,
        by_amount_in: bool,
        coin_a: TypeName,
        coin_b: TypeName,
    }

    public fun swap_a2b<CoinA, CoinB>(
        config: &mut GlobalConfigV2,
        pool: &mut Pool<CoinA, CoinB>,
        coin_a: Coin<CoinA>,
        coin_deep: Coin<DEEP>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<CoinB> {
        abort 0
    }

    public fun swap_b2a<CoinA, CoinB>(
        config: &mut GlobalConfigV2,
        pool: &mut Pool<CoinA, CoinB>,
        coin_b: Coin<CoinB>,
        coin_deep: Coin<DEEP>,
        clock: &Clock,
        ctx: &mut TxContext,
    ): Coin<CoinA> {
        abort 0
    }

    #[allow(lint(self_transfer))]
    public fun transfer_or_destroy_coin<CoinType>(coin: Coin<CoinType>, ctx: &TxContext) {
        if (coin::value(&coin) > 0) {
            transfer::public_transfer(coin, tx_context::sender(ctx))
        } else {
            coin::destroy_zero(coin)
        }
    }
}

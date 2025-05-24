module flowx_clmm::pool_manager {
    use flowx_clmm::pool::Pool;
    use sui::object::UID;
    use sui::table::Table;

    #[allow(unused_field)]
    public struct PoolRegistry has key, store {
        id: UID,
        fee_amount_tick_spacing: Table<u64, u32>,
        num_pools: u64,
    }

    public fun borrow_mut_pool<T0, T1>(
        _pool_registry: &mut PoolRegistry,
        _fee: u64,
    ): &mut Pool<T0, T1> {
        abort 0
    }
}

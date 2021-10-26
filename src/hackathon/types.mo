module {
    public type Stake = {
        staker_id: Principal;
        public_key: Text;
        amount: Nat;
        expiry_time: Int; // seconds since 1970-01-01
        stake_id: Nat;
        valid: Bool;
    };

    public type Staker = {
        id: Principal;
        public_key: Text;
    };

    public type Secret = {
        secret_id: Nat;
        author_id: Principal;

        // encrypted secret payload, that can be decrypted with the privatekey
        // reconstructed from enough shares
        payload: Text;
        uploader_public_key: Text;
        reward: Nat;

        expiry_time: Int; // seconds since 1970-01-01
        last_heartbeat: Int;
        heartbeat_freq: Int; // every heartbeat_freq a heartbeat has to be sent

        share_holder_ids: [Principal];
        share_holder_stake_ids: [Nat]; // TODO: as of now unused, maybe use for calculating payout

        shares: [Text];
        decrypted_share_shas: [Text];
        revealed: [Bool]; // is true if stake has revealed share or secret expired and reward was paid out
    };

    /*
    * A RelevantSecret only contains information relevant to the staker.
    * E.g. His/Her shares, if they should reveal or not; if they have revealed.
    */
    public type RelevantSecret = {
        secret_id: Nat;
        uploader_public_key: Text;
        expiry_time: Int; // seconds since 1970-01-01
        last_heartbeat: Int;
        relevantShares: [Text];
        shouldReveal: Bool;
        hasPayedout: Bool;
    };

}

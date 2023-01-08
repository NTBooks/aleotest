//
program ipfs_nft.aleo {

// IPFS uses two different CID patterns
// CIDv0 is base58btc encoded and always 44 characters long (https://en.bitcoin.it/wiki/Base58Check_encoding)
// It always starts with 'Qm' (multihashes start with a byte (0x12) which indicates the hashing algorithm, followed by another byte for length (0x20)) 
// so this can be assumed for this version of NFT binary data we need 42 bytes to store one
// if we use u128 we have 48 bytes with 6 possible leftover bytes, if we really want to minimize space we can eliminate those
// I want to use the flags for "total mints" - 4 bytes (max ~4 billion copies of this token)
// I want to use 2 bits for flags (burnable, transferrable) -- both can't be 0 at the same time though, but both can be 1
// The next 6 bits are contract version, in case this spec changes we need a way to read it off the blockchain data, this allows for 64 rev numbers
// The last 1 byte is reserved for future expansion based on rev number (sub rev, additional property, template locking)

// I'm basing this on the token sample:

//test accounts -- 
//BANK:
//    PRIV: APrivateKey1zkp22Lu2R8py88dUHNirhvjHEP1EEaq8v8rdhSAy6KJfmwb
//    VIEW: AViewKey1cqPkYy76XBNwq9WkPYP6Dg2p2k5MoeJMGSrCDvgMJjaQ
//    ADDR: aleo1ssnhgr7y0eh9es42k2qc6aj503dems5cwjr8hxfd498nne6masqq79zarj
//
//ARTIST: 
//    PRIV: APrivateKey1zkpGEHVWQv3BuLoXMAGsqDe5AyZiSowoXhFXj72YQJmGgCQ
//    VIEW: AViewKey1kUBpDFagJ6KCwVPdhw7w7z2aK8NSrgbji5Nf64jRTRRd
//    ADDR: aleo1rs24mqzz5z6gpv5x3fmvddd6887f6vvpkdjghspvvdxplvh89ugs5ckwa0
//
//BUYER1:
//    PRIV: APrivateKey1zkp5qDWoSiGTiAgKpjTKtWqhmDajJHeCZDUzyf12wxGb4JU
//    VIEW: AViewKey1rBubEX5AQkNG8QkB7u4r7KGrAwtGqZqo8N87cRhegRWi
//    ADDR: aleo137tfr88ptvuhth9xkcctgd6xyr6qt4ynrgkxwt55hmxvssjlxv8sy45nn5
//
//BUYER2:
//    PRIV: APrivateKey1zkpHon7LDVT7MyTfLXxBL7UZeP6RYzecyutJmHNXYvqRQYd
//    VIEW: AViewKey1eyuc37VwZeKjcgLaK229CQJVc5t26zvkfcg1pTon5yNp
//    ADDR: aleo1pwuhasu5vgmn7hkz0ml8fmessgzm40pj5j9cyy88r4caed8hdsyqjeg2tp



    record Token {
        owner: address,
        gates: u64, // always 0
        id: u64, // number of tokens minted with this id
        tid: field, // template id
        cid: field, // collection this template belongs to
        bin1: field,
        bin2: field,
        //bin3: u128,
        amount: u8

    }

    // TODO: I think this is how I should be doing it but I can't figure out how to look this up
   mapping tables: 
        field => u64;
   
    // table data:
    // [1] => id counter
    transition main(a: field) -> field {
        let b: field = BHP256::hash(a);

        return b;
    }

    transition mint(owner: address, id:u64, tid: field, cid: field, bin1: field, bin2: field) -> Token {
        // only the bank can mint
        assert_eq (self.caller, aleo1ssnhgr7y0eh9es42k2qc6aj503dems5cwjr8hxfd498nne6masqq79zarj); // ONLY the bank can mint new tokens

        // need to assert total token count somehow
        // token counter and prevent dupes?

        return Token {
            owner: owner,
            gates: 0u64,
            id: id,
            tid: tid,
            cid: cid,
            bin1: bin1,
            bin2: bin2,
          //  bin3: bin3,
            amount: 1u8
        }; // then finalize(1u64);
    }

    // finalize mint(ct: u64){
    //     increment(tables, 1field, ct);
    // }

    transition transfer(token: Token, to: address) -> (Token, Token) {

        assert_eq(token.owner,self.caller);

        // Produce a token record removing ownership
        let remaining: Token = Token {
        owner: token.owner,
        gates: token.gates,
        amount: 0u8,
        id: token.id,
        tid: token.tid,
        cid: token.cid,
          bin1: token.bin1,
            bin2: token.bin2
          //  bin3: token.bin3
        };

        // Produce a token record for the specified receiver.
        let transferred: Token = Token {
        owner: to,
        gates: 0u64,
        amount: 1u8,
        id: token.id,
        tid: token.tid,
        cid: token.cid,
        bin1: token.bin1,
        bin2: token.bin2
       // bin3: token.bin3
        };

        // Output the sender's change record and the receiver's record.
        return (remaining, transferred);
    }



}
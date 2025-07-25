import {
    assert,
    method,
    prop,
    SmartContract,
    FixedArray,
    Addr,
    Sig,
    PubKey,
    hash160,
    Ripemd160
} from 'scrypt-ts'

export const SIGS = 5;
const nec = SIGS - 2;

export class Escrowcontract extends SmartContract {
    @prop()
    readonly addresses: FixedArray<Addr, typeof SIGS>

    @prop()
    readonly matureTime: bigint

    constructor(addresses: FixedArray<Addr, typeof SIGS>, matureTime: bigint) {
        super(...arguments)
        this.addresses = addresses;
        this.matureTime = matureTime;
    }

    @method()
    public pay(signatures: FixedArray<Sig, typeof SIGS>, publicKeys: FixedArray<PubKey, typeof SIGS>) {
        let validAddsCount = 0n;
        let validSignaturesCount = 0n;
        for (let i = 0; i < SIGS; i++) {
            const pubKeyHash: Ripemd160 = hash160(publicKeys[i])
            if (pubKeyHash == this.addresses[i]) {
                console.log(`${pubKeyHash} debería ser igual a ${this.addresses[i]}`)
                validAddsCount++;
            }
            if (this.checkSig(signatures[i], publicKeys[i])) {
                validSignaturesCount++;
            }            
        }
        
        assert(validAddsCount >= nec, 'Addresses mismatch or insufficient signers')
        assert(validSignaturesCount >= nec, 'Not enough valid signatures')

    }

    @method()
    public refundDeadline(signatures: FixedArray<Sig, typeof SIGS>, publicKeys: FixedArray<PubKey, typeof SIGS>) {
        

        const pubKeyHash: Ripemd160 = hash160(publicKeys[1])
        assert(pubKeyHash == this.addresses[1], 'Addresses mismatch')

        let validSignaturesCount = 0n;
        let validAddsCount = 0n;

        for (let i = 0; i < SIGS; i++) {
            const pubKeyHash: Ripemd160 = hash160(publicKeys[i])
            if (pubKeyHash == this.addresses[i]) {
                console.log(`${pubKeyHash} debería ser igual a ${this.addresses[i]}`)
                validAddsCount++;
            }
            if (this.checkSig(signatures[i], publicKeys[i])) {
                validSignaturesCount++;
            }
        }

        assert(validSignaturesCount >= nec, 'Not enough valid signatures')
        assert(validAddsCount >= nec, 'Addresses mismatch or insufficient signers')
        assert(this.timeLock(this.matureTime), 'deadline not yet reached')       

    }
    
}

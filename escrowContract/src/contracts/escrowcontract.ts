import {
    assert,
    method,
    prop,
    SmartContract,
    FixedArray,
    Addr,
    Sig,
    PubKey,
    hash160
} from 'scrypt-ts'

export const SIGS = 4;
const nec = SIGS - 1;

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

        let validSigs = 0n
        for (let i = 0; i < SIGS; i++) {
            // Primero verifica que la public key sea de una dirección autorizada
            if (hash160(publicKeys[i]) == this.addresses[i]) {
                // Luego verifica que la firma sea válida para ESA public key
                if (this.checkSig(signatures[i], publicKeys[i])) {
                    validSigs++
                }
            }
        }
        assert(validSigs >= nec, `not enough valid signatures, only ${validSigs} passed.`)

    }

    @method()
    public refundDeadline(signatures: FixedArray<Sig, typeof SIGS>, publicKeys: FixedArray<PubKey, typeof SIGS>) {

        let validSigs = 0n
        for (let i = 0; i < SIGS; i++) {
            // Primero verifica que la public key sea de una dirección autorizada
            if (hash160(publicKeys[i]) == this.addresses[i]) {
                // Luego verifica que la firma sea válida para ESA public key
                if (this.checkSig(signatures[i], publicKeys[i])) {
                    validSigs++
                }
            }
        }
        assert(validSigs >= nec, `not enough valid signatures, only ${validSigs} passed.`)

        assert(this.timeLock(this.matureTime), 'deadline not yet reached')       

    }
    
}

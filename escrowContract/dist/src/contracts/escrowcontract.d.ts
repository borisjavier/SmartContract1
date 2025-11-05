import { SmartContract, FixedArray, Addr, Sig, PubKey } from 'scrypt-ts';
export declare const SIGS = 4;
export declare class Escrowcontract extends SmartContract {
    readonly addresses: FixedArray<Addr, typeof SIGS>;
    readonly matureTime: bigint;
    constructor(addresses: FixedArray<Addr, typeof SIGS>, matureTime: bigint);
    pay(signatures: FixedArray<Sig, typeof SIGS>, publicKeys: FixedArray<PubKey, typeof SIGS>): void;
    refundDeadline(signatures: FixedArray<Sig, typeof SIGS>, publicKeys: FixedArray<PubKey, typeof SIGS>): void;
}

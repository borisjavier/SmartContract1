import { SmartContract, PubKey, Sig, Addr, ByteString, FixedArray } from 'scrypt-ts';
export type Timestamp = bigint;
export type TxId = ByteString;
export type Payment = {
    timestamp: Timestamp;
    txid: TxId;
};
export declare const N = 24;
export type Payments = FixedArray<Payment, typeof N>;
export declare class PaymentContract extends SmartContract {
    owner: Addr;
    readonly adminPubKey: PubKey;
    addressGN: Addr;
    amountGN: bigint;
    qtyTokens: bigint;
    dataPayments: Payments;
    isValid: boolean;
    isOwner: boolean;
    readonly EMPTY: TxId;
    constructor(owner: Addr, adminPubKey: PubKey, addressGN: Addr, amountGN: bigint, qtyTokens: bigint, datas: FixedArray<Timestamp, typeof N>, txids: FixedArray<ByteString, typeof N>);
    pay(signature: Sig, publicKey: PubKey, currentDate: bigint, txIdPago: ByteString): void;
    updateArr(currentDate: Timestamp, txid: TxId): void;
    filledTxids(dataPayments: Payments): boolean;
    transferOwnership(signature: Sig, publicKey: PubKey, oldOwner: Addr, newOwner: Addr, newAddressGN: Addr): void;
    transferPartial(signature: Sig, publicKey: PubKey, oldOwner: Addr, newAmountGN: bigint, newQtyTokens: bigint): void;
    verifyId(owner: Addr): void;
}

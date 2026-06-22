import { SmartContract, PubKey, Sig, Addr, ByteString } from 'scrypt-ts';
export declare class PaymentContract extends SmartContract {
    owner: Addr;
    readonly adminPubKey: PubKey;
    addressGN: Addr;
    amountGN: bigint;
    qtyTokens: bigint;
    paymentsLedger: ByteString;
    paymentsCount: bigint;
    readonly maxPayments: bigint;
    isValid: boolean;
    isOwner: boolean;
    constructor(owner: Addr, adminPubKey: PubKey, addressGN: Addr, amountGN: bigint, qtyTokens: bigint, maxPayments: bigint, initialLedger: ByteString);
    pay(signature: Sig, publicKey: PubKey, realTimestamp: bigint, txid: ByteString, // Debe ser exactamente de 32 bytes
    qtyPago: bigint): void;
    transferOwnership(signature: Sig, publicKey: PubKey, oldOwner: Addr, newOwner: Addr, newAddressGN: Addr): void;
    transferPartial(signature: Sig, publicKey: PubKey, oldOwner: Addr, newAmountGN: bigint, newQtyTokens: bigint): void;
    verifyId(owner: Addr): void;
}

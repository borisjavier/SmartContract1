export type PayParams = {
    txId: string;
    atOutputIndex: number;
    txidPago: string;
    qtyPago: number;
    ownerPubKey: string;
    purse: string;
};
export type PaymentItem = {
    scheduledDate: string;
    realTimestamp: string;
    txid: string;
    qtyPago: string;
};
export type PayResult = {
    lastStateTxid: string;
    state: string;
    addressGN: string;
    amountGN: string;
    isValid: boolean;
};
export declare function pay(params: PayParams): Promise<PayResult>;
export declare function getContractState(txId: string, atOutputIndex?: number): Promise<PaymentItem[]>;

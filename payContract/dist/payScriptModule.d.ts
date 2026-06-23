export type PayParams = {
    txId: string;
    atOutputIndex: number;
    txidPago: string;
    qtyTokens: number;
    ownerPubKey: string;
    purse: string;
};
export type PayResult = {
    lastStateTxid: string;
    state: string;
    addressGN: string;
    amountGN: string;
    isValid: boolean;
};
export declare function pay(params: PayParams): Promise<PayResult>;

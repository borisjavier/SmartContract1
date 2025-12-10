export type PayParams = {
    txId: string;
    atOutputIndex: number;
    datas: string[];
    txids: string[];
    txidPago: string;
    qtyTokens: number;
    ownerPubKey: string;
    purse: string;
};
export type PaymentItem = {
    timestamp: string;
    txid: string;
};
export type PayResult = {
    lastStateTxid: string;
    state: PaymentItem[];
    addressGN: string;
    amountGN: string;
    isValid: boolean;
};
export declare function pay(params: PayParams): Promise<PayResult>;

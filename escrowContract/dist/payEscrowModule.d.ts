export type PayEscrowParams = {
    txId: string;
    participantKeys: string[];
    atOutputIndex?: number;
};
export type PayEscrowResult = {
    txId: string;
};
export declare function payEscrowContract(params: PayEscrowParams): Promise<PayEscrowResult>;

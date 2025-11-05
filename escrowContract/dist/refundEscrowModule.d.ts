export type RefundEscrowParams = {
    txId: string;
    participantKeys: string[];
    atOutputIndex?: number;
};
export type RefundEscrowResult = {
    txId: string;
};
export declare function refundEscrowContract(params: RefundEscrowParams): Promise<RefundEscrowResult>;

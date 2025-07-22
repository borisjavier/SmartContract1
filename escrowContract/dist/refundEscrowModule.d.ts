export type RefundEscrowParams = {
    txId: string;
    deployerKeyType: 'PRIVATE_KEY' | 'PRIVATE_KEY_2';
    participantKeys: string[];
    atOutputIndex?: number;
};
export type RefundEscrowResult = {
    txId: string;
    usedKeyType: string;
};
export declare function refundEscrowContract(params: RefundEscrowParams): Promise<RefundEscrowResult>;

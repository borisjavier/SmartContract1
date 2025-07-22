export type PayEscrowParams = {
    txId: string;
    deployerKeyType: 'PRIVATE_KEY' | 'PRIVATE_KEY_2';
    participantKeys: string[];
    atOutputIndex?: number;
};
export type PayEscrowResult = {
    txId: string;
    usedKeyType: string;
};
export declare function payEscrowContract(params: PayEscrowParams): Promise<PayEscrowResult>;

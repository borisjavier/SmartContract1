export type EscrowDeployParams = {
    publicKeys: string[];
    lockTimeMin: bigint;
};
export type EscrowDeploymentResult = {
    txId: string;
    keyUsed: string;
};
export declare function deployEscrowContract(params: EscrowDeployParams): Promise<EscrowDeploymentResult>;

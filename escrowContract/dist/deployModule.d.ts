export type EscrowDeployParams = {
    publicKeys: string[];
    lockTimeMin: bigint;
    contractPK: string;
};
export type EscrowDeploymentResult = {
    txId: string;
};
export declare function deployEscrowContract(params: EscrowDeployParams): Promise<EscrowDeploymentResult>;

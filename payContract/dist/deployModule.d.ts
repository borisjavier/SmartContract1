export type DeployParams = {
    n: number;
    qtyT: number;
    lapse: number;
    startDate: number;
    ownerPub: string;
    ownerGN: string;
    quarks: number;
    purse: string;
};
export type DeploymentResult = {
    contractId: string;
    state: string;
    addressOwner: string;
    addressGN: string;
    paymentQuarks: string;
};
export declare function deployContract(params: DeployParams): Promise<DeploymentResult>;

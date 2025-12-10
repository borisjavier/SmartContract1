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
export type PaymentStateItem = {
    timestamp: string;
    txid: string;
};
export type PaymentState = PaymentStateItem[];
export type DeploymentResult = {
    contractId: string;
    state: PaymentState;
    addressOwner: string;
    addressGN: string;
    paymentQuarks: bigint;
};
export declare function deployContract(params: DeployParams): Promise<DeploymentResult>;

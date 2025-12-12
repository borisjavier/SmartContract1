"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentContract = exports.N = void 0;
const scrypt_ts_1 = require("scrypt-ts");
exports.N = 1;
class PaymentContract extends scrypt_ts_1.SmartContract {
    constructor(owner, adminPubKey, addressGN, amountGN, qtyTokens, datas, txids) {
        super(...arguments);
        this.owner = owner;
        this.adminPubKey = adminPubKey;
        this.addressGN = addressGN;
        this.amountGN = amountGN;
        this.qtyTokens = qtyTokens;
        this.dataPayments = (0, scrypt_ts_1.fill)({
            timestamp: 0n,
            txid: (0, scrypt_ts_1.toByteString)('501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836')
        }, exports.N);
        for (let i = 0; i < exports.N; i++) {
            this.dataPayments[i] = {
                timestamp: datas[i],
                txid: txids[i]
            };
        }
        this.isValid = true;
        this.isOwner = true;
        this.EMPTY = (0, scrypt_ts_1.toByteString)('501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836'); //'0' is not a valid hex so I took this old useless transaction as a zero value
    }
    pay(signature, publicKey, currentDate, txIdPago) {
        (0, scrypt_ts_1.assert)(this.checkSig(signature, publicKey), 'Signature verification failed');
        (0, scrypt_ts_1.assert)(this.isValid, 'Contract paid. No longer valid.');
        this.updateArr(currentDate, txIdPago);
        let outputs = this.buildStateOutput(this.ctx.utxo.value);
        if (this.changeAmount > 0n) {
            outputs += this.buildChangeOutput();
        }
        this.debug.diffOutputs(outputs);
        (0, scrypt_ts_1.assert)(this.ctx.hashOutputs === (0, scrypt_ts_1.hash256)(outputs), 'hashOutputs mismatch');
    }
    updateArr(currentDate, txid) {
        let done = true;
        for (let i = 0; i < exports.N; i++) {
            if (done === true && this.dataPayments[i].timestamp < currentDate && this.dataPayments[i].txid === this.EMPTY) {
                if (i === exports.N - 1 && this.filledTxids(this.dataPayments)) {
                    this.isValid = false;
                }
                this.dataPayments[i] = {
                    timestamp: currentDate,
                    txid: txid
                };
                done = false;
            }
        }
    }
    filledTxids(dataPayments) {
        let allFilled = true;
        if (exports.N < 2) {
            allFilled = (dataPayments[0].txid !== this.EMPTY);
        }
        else {
            let done = true;
            for (let i = 0; i < exports.N; i++) {
                if (i < exports.N - 1) {
                    if (done === true && dataPayments[i].txid === this.EMPTY) {
                        allFilled = false;
                        done = false;
                    }
                }
            }
        }
        (0, scrypt_ts_1.assert)(allFilled, 'Some txids are still empty');
        return allFilled;
    }
    transferOwnership(signature, publicKey, oldOwner, newOwner, newAddressGN) {
        // admin verification
        (0, scrypt_ts_1.assert)(this.checkSig(signature, publicKey), 'Signature verification failed');
        //verify owner
        this.verifyId(oldOwner);
        (0, scrypt_ts_1.assert)(this.isOwner, 'Not the owner of this contract');
        // contract is still valid
        (0, scrypt_ts_1.assert)(this.isValid, 'Contract is no longer valid');
        this.owner = newOwner; //must validate identity in a different contract
        this.addressGN = newAddressGN;
        //TO DO: when transferred, create a contract with data from the last state of this one on behalf of the new owner
        let outputs = this.buildStateOutput(this.ctx.utxo.value);
        if (this.changeAmount > 0n) {
            outputs += this.buildChangeOutput();
        }
        this.debug.diffOutputs(outputs);
        (0, scrypt_ts_1.assert)(this.ctx.hashOutputs === (0, scrypt_ts_1.hash256)(outputs), 'hashOutputs mismatch');
    }
    transferPartial(signature, publicKey, oldOwner, newAmountGN, newQtyTokens) {
        // admin verification
        (0, scrypt_ts_1.assert)(this.checkSig(signature, publicKey), 'Signature verification failed');
        //verify owner
        this.verifyId(oldOwner);
        (0, scrypt_ts_1.assert)(this.isOwner, 'Not the owner of this contract');
        // contract is still valid
        (0, scrypt_ts_1.assert)(this.isValid, 'Contract is no longer valid');
        this.amountGN = newAmountGN;
        this.qtyTokens = newQtyTokens;
        //TO DO: when transferred, create a contract with data from the last state of this one on behalf of the new owner
        let outputs = this.buildStateOutput(this.ctx.utxo.value);
        if (this.changeAmount > 0n) {
            outputs += this.buildChangeOutput();
        }
        this.debug.diffOutputs(outputs);
        (0, scrypt_ts_1.assert)(this.ctx.hashOutputs === (0, scrypt_ts_1.hash256)(outputs), 'hashOutputs mismatch');
    }
    verifyId(owner) {
        this.isOwner = (this.owner == owner) ? true : false;
    }
}
exports.PaymentContract = PaymentContract;
__decorate([
    (0, scrypt_ts_1.prop)(true)
], PaymentContract.prototype, "owner", void 0);
__decorate([
    (0, scrypt_ts_1.prop)()
], PaymentContract.prototype, "adminPubKey", void 0);
__decorate([
    (0, scrypt_ts_1.prop)(true)
], PaymentContract.prototype, "addressGN", void 0);
__decorate([
    (0, scrypt_ts_1.prop)(true)
], PaymentContract.prototype, "amountGN", void 0);
__decorate([
    (0, scrypt_ts_1.prop)(true)
], PaymentContract.prototype, "qtyTokens", void 0);
__decorate([
    (0, scrypt_ts_1.prop)(true)
], PaymentContract.prototype, "dataPayments", void 0);
__decorate([
    (0, scrypt_ts_1.prop)(true)
], PaymentContract.prototype, "isValid", void 0);
__decorate([
    (0, scrypt_ts_1.prop)(true)
], PaymentContract.prototype, "isOwner", void 0);
__decorate([
    (0, scrypt_ts_1.prop)()
], PaymentContract.prototype, "EMPTY", void 0);
__decorate([
    (0, scrypt_ts_1.method)()
], PaymentContract.prototype, "pay", null);
__decorate([
    (0, scrypt_ts_1.method)()
], PaymentContract.prototype, "updateArr", null);
__decorate([
    (0, scrypt_ts_1.method)()
], PaymentContract.prototype, "filledTxids", null);
__decorate([
    (0, scrypt_ts_1.method)()
], PaymentContract.prototype, "transferOwnership", null);
__decorate([
    (0, scrypt_ts_1.method)()
], PaymentContract.prototype, "transferPartial", null);
__decorate([
    (0, scrypt_ts_1.method)()
], PaymentContract.prototype, "verifyId", null);
//# sourceMappingURL=paycontract.js.map
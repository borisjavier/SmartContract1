"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Escrowcontract = exports.SIGS = void 0;
const scrypt_ts_1 = require("scrypt-ts");
exports.SIGS = 5;
const nec = exports.SIGS - 2;
class Escrowcontract extends scrypt_ts_1.SmartContract {
    constructor(addresses, matureTime) {
        super(...arguments);
        this.addresses = addresses;
        this.matureTime = matureTime;
    }
    pay(signatures, publicKeys) {
        let validAddsCount = 0n;
        let validSignaturesCount = 0n;
        for (let i = 0; i < exports.SIGS; i++) {
            const pubKeyHash = (0, scrypt_ts_1.hash160)(publicKeys[i]);
            if (pubKeyHash == this.addresses[i]) {
                console.log(`${pubKeyHash} debería ser igual a ${this.addresses[i]}`);
                validAddsCount++;
            }
            if (this.checkSig(signatures[i], publicKeys[i])) {
                validSignaturesCount++;
            }
        }
        (0, scrypt_ts_1.assert)(validAddsCount >= nec, 'Addresses mismatch or insufficient signers');
        (0, scrypt_ts_1.assert)(validSignaturesCount >= nec, 'Not enough valid signatures');
    }
    refundDeadline(signatures, publicKeys) {
        const pubKeyHash = (0, scrypt_ts_1.hash160)(publicKeys[1]);
        (0, scrypt_ts_1.assert)(pubKeyHash == this.addresses[1], 'Addresses mismatch');
        let validSignaturesCount = 0n;
        let validAddsCount = 0n;
        for (let i = 0; i < exports.SIGS; i++) {
            const pubKeyHash = (0, scrypt_ts_1.hash160)(publicKeys[i]);
            if (pubKeyHash == this.addresses[i]) {
                console.log(`${pubKeyHash} debería ser igual a ${this.addresses[i]}`);
                validAddsCount++;
            }
            if (this.checkSig(signatures[i], publicKeys[i])) {
                validSignaturesCount++;
            }
        }
        (0, scrypt_ts_1.assert)(validSignaturesCount >= nec, 'Not enough valid signatures');
        (0, scrypt_ts_1.assert)(validAddsCount >= nec, 'Addresses mismatch or insufficient signers');
        (0, scrypt_ts_1.assert)(this.timeLock(this.matureTime), 'deadline not yet reached');
    }
}
exports.Escrowcontract = Escrowcontract;
__decorate([
    (0, scrypt_ts_1.prop)()
], Escrowcontract.prototype, "addresses", void 0);
__decorate([
    (0, scrypt_ts_1.prop)()
], Escrowcontract.prototype, "matureTime", void 0);
__decorate([
    (0, scrypt_ts_1.method)()
], Escrowcontract.prototype, "pay", null);
__decorate([
    (0, scrypt_ts_1.method)()
], Escrowcontract.prototype, "refundDeadline", null);
//# sourceMappingURL=escrowcontract.js.map
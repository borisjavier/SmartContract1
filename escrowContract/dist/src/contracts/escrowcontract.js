"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Escrowcontract = exports.SIGS = void 0;
const scrypt_ts_1 = require("scrypt-ts");
exports.SIGS = 4;
const nec = exports.SIGS - 1;
class Escrowcontract extends scrypt_ts_1.SmartContract {
    constructor(addresses, matureTime) {
        super(...arguments);
        this.addresses = addresses;
        this.matureTime = matureTime;
    }
    pay(signatures, publicKeys) {
        let validSigs = 0n;
        for (let i = 0; i < exports.SIGS; i++) {
            // Primero verifica que la public key sea de una dirección autorizada
            if ((0, scrypt_ts_1.hash160)(publicKeys[i]) == this.addresses[i]) {
                // Luego verifica que la firma sea válida para ESA public key
                if (this.checkSig(signatures[i], publicKeys[i])) {
                    validSigs++;
                }
            }
        }
        (0, scrypt_ts_1.assert)(validSigs >= nec, `not enough valid signatures, only ${validSigs} passed.`);
    }
    refundDeadline(signatures, publicKeys) {
        let validSigs = 0n;
        for (let i = 0; i < exports.SIGS; i++) {
            // Primero verifica que la public key sea de una dirección autorizada
            if ((0, scrypt_ts_1.hash160)(publicKeys[i]) == this.addresses[i]) {
                // Luego verifica que la firma sea válida para ESA public key
                if (this.checkSig(signatures[i], publicKeys[i])) {
                    validSigs++;
                }
            }
        }
        (0, scrypt_ts_1.assert)(validSigs >= nec, `not enough valid signatures, only ${validSigs} passed.`);
        (0, scrypt_ts_1.assert)(this.timeLock(this.matureTime), 'deadline not yet reached');
    }
}
exports.Escrowcontract = Escrowcontract;
__decorate([
    (0, scrypt_ts_1.prop)(),
    __metadata("design:type", Object)
], Escrowcontract.prototype, "addresses", void 0);
__decorate([
    (0, scrypt_ts_1.prop)(),
    __metadata("design:type", BigInt)
], Escrowcontract.prototype, "matureTime", void 0);
__decorate([
    (0, scrypt_ts_1.method)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], Escrowcontract.prototype, "pay", null);
__decorate([
    (0, scrypt_ts_1.method)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], Escrowcontract.prototype, "refundDeadline", null);
//# sourceMappingURL=escrowcontract.js.map
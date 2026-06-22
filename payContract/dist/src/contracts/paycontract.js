"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentContract = void 0;
const scrypt_ts_1 = require("scrypt-ts");
class PaymentContract extends scrypt_ts_1.SmartContract {
    constructor(owner, adminPubKey, addressGN, amountGN, qtyTokens, maxPayments, initialLedger // El backend le pasa el bloque de fechas pre-programadas
    ) {
        super(...arguments);
        this.owner = owner;
        this.adminPubKey = adminPubKey;
        this.addressGN = addressGN;
        this.amountGN = amountGN;
        this.qtyTokens = qtyTokens;
        this.paymentsLedger = initialLedger;
        this.paymentsCount = 0n;
        this.maxPayments = maxPayments;
        this.isValid = true;
        this.isOwner = true;
    }
    pay(signature, publicKey, realTimestamp, txid, // Debe ser exactamente de 32 bytes
    qtyPago) {
        (0, scrypt_ts_1.assert)(publicKey === this.adminPubKey, 'Unauthorized public key');
        (0, scrypt_ts_1.assert)(this.checkSig(signature, publicKey), 'Signature verification failed');
        (0, scrypt_ts_1.assert)(this.isValid, 'Contract paid. No longer valid.');
        (0, scrypt_ts_1.assert)(this.paymentsCount < this.maxPayments, 'All payment slots are already filled');
        // Cada registro/slot mide exactamente 56 bytes
        const slotSize = 56n;
        const offset = this.paymentsCount * slotSize;
        // 1. Extraemos los primeros 8 bytes del slot actual (la fecha programada original) para conservarla
        const scheduledDateBytes = (0, scrypt_ts_1.slice)(this.paymentsLedger, offset, offset + 8n);
        // 2. Empaquetamos el nuevo registro combinando la programación y los datos reales del pago
        const newRecord = scheduledDateBytes +
            (0, scrypt_ts_1.int2ByteString)(realTimestamp, 8n) +
            txid +
            (0, scrypt_ts_1.int2ByteString)(qtyPago, 8n);
        // 3. Re-inyectamos el nuevo slot en la cadena "stringified" usando slicing
        this.paymentsLedger = (0, scrypt_ts_1.slice)(this.paymentsLedger, 0n, offset) +
            newRecord +
            (0, scrypt_ts_1.slice)(this.paymentsLedger, offset + slotSize);
        this.paymentsCount++;
        if (this.paymentsCount === this.maxPayments) {
            this.isValid = false;
        }
        // Covenants obligatorios para actualizar el estado UTXO
        let outputs = this.buildStateOutput(this.ctx.utxo.value);
        if (this.changeAmount > 0n) {
            outputs += this.buildChangeOutput();
        }
        this.debug.diffOutputs(outputs);
        (0, scrypt_ts_1.assert)(this.ctx.hashOutputs === (0, scrypt_ts_1.hash256)(outputs), 'hashOutputs mismatch');
    }
    transferOwnership(signature, publicKey, oldOwner, newOwner, newAddressGN) {
        (0, scrypt_ts_1.assert)(publicKey === this.adminPubKey, 'Unauthorized public key');
        (0, scrypt_ts_1.assert)(this.checkSig(signature, publicKey), 'Signature verification failed');
        this.verifyId(oldOwner);
        (0, scrypt_ts_1.assert)(this.isOwner, 'Not the owner of this contract');
        (0, scrypt_ts_1.assert)(this.isValid, 'Contract is no longer valid');
        this.owner = newOwner;
        this.addressGN = newAddressGN;
        let outputs = this.buildStateOutput(this.ctx.utxo.value);
        if (this.changeAmount > 0n) {
            outputs += this.buildChangeOutput();
        }
        (0, scrypt_ts_1.assert)(this.ctx.hashOutputs === (0, scrypt_ts_1.hash256)(outputs), 'hashOutputs mismatch');
    }
    transferPartial(signature, publicKey, oldOwner, newAmountGN, newQtyTokens) {
        (0, scrypt_ts_1.assert)(publicKey === this.adminPubKey, 'Unauthorized public key');
        (0, scrypt_ts_1.assert)(this.checkSig(signature, publicKey), 'Signature verification failed');
        this.verifyId(oldOwner);
        (0, scrypt_ts_1.assert)(this.isOwner, 'Not the owner of this contract');
        (0, scrypt_ts_1.assert)(this.isValid, 'Contract is no longer valid');
        this.amountGN = newAmountGN;
        this.qtyTokens = newQtyTokens;
        let outputs = this.buildStateOutput(this.ctx.utxo.value);
        if (this.changeAmount > 0n) {
            outputs += this.buildChangeOutput();
        }
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
], PaymentContract.prototype, "paymentsLedger", void 0);
__decorate([
    (0, scrypt_ts_1.prop)(true)
], PaymentContract.prototype, "paymentsCount", void 0);
__decorate([
    (0, scrypt_ts_1.prop)()
], PaymentContract.prototype, "maxPayments", void 0);
__decorate([
    (0, scrypt_ts_1.prop)(true)
], PaymentContract.prototype, "isValid", void 0);
__decorate([
    (0, scrypt_ts_1.prop)(true)
], PaymentContract.prototype, "isOwner", void 0);
__decorate([
    (0, scrypt_ts_1.method)()
], PaymentContract.prototype, "pay", null);
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
import {
    SmartContract,
    method,
    prop,
    assert,
    PubKey,
    Sig,
    Addr,
    hash256,
    ByteString,
    slice,
    int2ByteString
} from 'scrypt-ts';

export class PaymentContract extends SmartContract {
    @prop(true)
    owner: Addr;

    @prop()
    readonly adminPubKey: PubKey;

    @prop(true)
    addressGN: Addr;

    @prop(true)
    amountGN: bigint;

    @prop(true)
    qtyTokens: bigint;

    // EL ÚNICO CONTENEDOR: Aquí vive todo el arreglo serializado de fechas y pagos
    @prop(true)
    paymentsLedger: ByteString;

    @prop(true)
    paymentsCount: bigint;

    @prop()
    readonly maxPayments: bigint; // Límite dinámico (12, 24, 100, etc.)

    @prop(true)
    isValid: boolean;

    @prop(true)
    isOwner: boolean;

    constructor(
        owner: Addr,
        adminPubKey: PubKey,
        addressGN: Addr,
        amountGN: bigint,
        qtyTokens: bigint,
        maxPayments: bigint,
        initialLedger: ByteString // El backend le pasa el bloque de fechas pre-programadas
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

    @method()
    public pay(    
        signature: Sig, 
        publicKey: PubKey,
        realTimestamp: bigint,
        txid: ByteString, // Debe ser exactamente de 32 bytes
        qtyPago: bigint
    ) {
        assert(publicKey === this.adminPubKey, 'Unauthorized public key');
        assert(this.checkSig(signature, publicKey), 'Signature verification failed');
        assert(this.isValid, 'Contract paid. No longer valid.'); 
        assert(this.paymentsCount < this.maxPayments, 'All payment slots are already filled');

        // Cada registro/slot mide exactamente 56 bytes
        const slotSize = 56n;
        const offset = this.paymentsCount * slotSize;

        // 1. Extraemos los primeros 8 bytes del slot actual (la fecha programada original) para conservarla
        const scheduledDateBytes = slice(this.paymentsLedger, offset, offset + 8n);

        // 2. Empaquetamos el nuevo registro combinando la programación y los datos reales del pago
        const newRecord = scheduledDateBytes + 
                          int2ByteString(realTimestamp, 8n) + 
                          txid + 
                          int2ByteString(qtyPago, 8n);

        // 3. Re-inyectamos el nuevo slot en la cadena "stringified" usando slicing
        this.paymentsLedger = slice(this.paymentsLedger, 0n, offset) + 
                              newRecord + 
                              slice(this.paymentsLedger, offset + slotSize);

        this.paymentsCount++;

        if (this.paymentsCount === this.maxPayments) {
            this.isValid = false;
        }
        
        // Covenants obligatorios para actualizar el estado UTXO
        let outputs: ByteString = this.buildStateOutput(this.ctx.utxo.value);
        if (this.changeAmount > 0n) {
            outputs += this.buildChangeOutput();
        }
        this.debug.diffOutputs(outputs);
        assert(this.ctx.hashOutputs === hash256(outputs), 'hashOutputs mismatch');
    }

    @method() 
    public transferOwnership(signature: Sig, publicKey: PubKey, oldOwner: Addr, newOwner: Addr, newAddressGN: Addr) {
        assert(publicKey === this.adminPubKey, 'Unauthorized public key');
        assert(this.checkSig(signature, publicKey), 'Signature verification failed');
        this.verifyId(oldOwner);
        assert(this.isOwner, 'Not the owner of this contract');
        assert(this.isValid, 'Contract is no longer valid');

        this.owner = newOwner;
        this.addressGN = newAddressGN;

        let outputs: ByteString = this.buildStateOutput(this.ctx.utxo.value);
        if (this.changeAmount > 0n) { outputs += this.buildChangeOutput(); }
        assert(this.ctx.hashOutputs === hash256(outputs), 'hashOutputs mismatch');
    }

    @method() 
    public transferPartial(signature: Sig, publicKey: PubKey, oldOwner: Addr, newAmountGN: bigint, newQtyTokens: bigint) {
        assert(publicKey === this.adminPubKey, 'Unauthorized public key');
        assert(this.checkSig(signature, publicKey), 'Signature verification failed');
        this.verifyId(oldOwner);
        assert(this.isOwner, 'Not the owner of this contract');
        assert(this.isValid, 'Contract is no longer valid');

        this.amountGN = newAmountGN;
        this.qtyTokens = newQtyTokens;

        let outputs: ByteString = this.buildStateOutput(this.ctx.utxo.value);
        if (this.changeAmount > 0n) { outputs += this.buildChangeOutput(); }
        assert(this.ctx.hashOutputs === hash256(outputs), 'hashOutputs mismatch');
    }

    @method()
    verifyId(owner: Addr): void {
        this.isOwner = (this.owner == owner) ? true : false;
    }
}
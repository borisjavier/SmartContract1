
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
  FixedArray,
  toByteString,
  fill
} from 'scrypt-ts';

export type Timestamp = bigint
export type TxId = ByteString

export type Payment = {
  timestamp: Timestamp
  txid: TxId
}

export const N = 108

export type Payments = FixedArray<Payment, typeof N>


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

  @prop(true)
  dataPayments: Payments;

  @prop(true)
  isValid: boolean;

  @prop(true)
  isOwner: boolean;

  @prop()
  readonly EMPTY: TxId;


  constructor(
      owner: Addr,
      adminPubKey: PubKey,
      addressGN: Addr,
      amountGN: bigint,
      qtyTokens: bigint,
      datas: FixedArray<Timestamp, typeof N>,
      txids: FixedArray<ByteString, typeof N>
  ) {
      super(...arguments);
      this.owner = owner;
      this.adminPubKey = adminPubKey;
      this.addressGN = addressGN;
      this.amountGN = amountGN;
      this.qtyTokens = qtyTokens;
      this.dataPayments = fill({
          timestamp: 0n,
          txid: toByteString('501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836')
      }, N);
      for (let i = 0; i < N; i++) {
          this.dataPayments[i] = {
              timestamp: datas[i],
              txid: txids[i]
          }
      }
      this.isValid = true;
      this.isOwner = true;
      this.EMPTY = toByteString('501a9448665a70e3efe50adafc0341c033e2f22913cc0fb6b76cbcb5c54e7836'); //'0' is not a valid hex so I took this old useless transaction as a zero value
  }

  @method()
  public pay(    
      signature: Sig, 
      publicKey: PubKey,
      currentDate: bigint,
      txIdPago: ByteString
  ) {

      assert(this.checkSig(signature, publicKey), 'Signature verification failed')

      assert(this.isValid, 'Contract paid. No longer valid.'); 

      this.updateArr(currentDate, txIdPago)
      
      let outputs: ByteString = this.buildStateOutput(this.ctx.utxo.value)
      if (this.changeAmount > 0n) {
          outputs += this.buildChangeOutput()
      }
      this.debug.diffOutputs(outputs);
      assert(this.ctx.hashOutputs === hash256(outputs), 'hashOutputs mismatch')
  }

      @method()
      updateArr(currentDate: Timestamp, txid: TxId): void {
          let done = true;

          for (let i = 0; i < N; i++) {
              if (done && this.dataPayments[i].timestamp < currentDate && this.dataPayments[i].txid === this.EMPTY) {
                  if (i === N - 1 && this.filledTxids(this.dataPayments)) {
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
      

@method()
filledTxids(dataPayments: Payments): boolean {
    let allFilled = true;
    let done = true;

    if (N < 1) {
        allFilled = false;
    }

    for (let i = 0; i < N - 1; i++) {
        if (done && dataPayments[i].txid === this.EMPTY) {
            allFilled = false;
            done = false;
        }
    }

    assert(allFilled, 'Some txids are still empty');

    return allFilled;  
}

  
  @method() 
  public transferOwnership( 
      signature: Sig, 
      publicKey: PubKey,
      oldOwner: Addr,
      newOwner: Addr,
      newAddressGN: Addr
  ) {
      // admin verification
      assert(this.checkSig(signature, publicKey), 'Signature verification failed')

      //verify owner
      this.verifyId(oldOwner);
      assert(this.isOwner, 'Not the owner of this contract')
      // contract is still valid
      assert(this.isValid, 'Contract is no longer valid');

      this.owner = newOwner;//must validate identity in a different contract
      this.addressGN = newAddressGN;


      //TO DO: when transferred, create a contract with data from the last state of this one on behalf of the new owner
      let outputs: ByteString = this.buildStateOutput(this.ctx.utxo.value)
      if (this.changeAmount > 0n) {
          outputs += this.buildChangeOutput()
      }
      this.debug.diffOutputs(outputs);
      assert(this.ctx.hashOutputs === hash256(outputs), 'hashOutputs mismatch')
  }

  @method() 
  public transferPartial( 
      signature: Sig, 
      publicKey: PubKey,
      oldOwner: Addr,
      newAmountGN: bigint,
      newQtyTokens: bigint
  ) {
      // admin verification
      assert(this.checkSig(signature, publicKey), 'Signature verification failed');

      //verify owner
      this.verifyId(oldOwner);
      assert(this.isOwner, 'Not the owner of this contract')

      // contract is still valid
      assert(this.isValid, 'Contract is no longer valid');

      this.amountGN = newAmountGN;
      this.qtyTokens = newQtyTokens;


      //TO DO: when transferred, create a contract with data from the last state of this one on behalf of the new owner
      let outputs: ByteString = this.buildStateOutput(this.ctx.utxo.value)
      if (this.changeAmount > 0n) {
          outputs += this.buildChangeOutput()
      }
      this.debug.diffOutputs(outputs);
      assert(this.ctx.hashOutputs === hash256(outputs), 'hashOutputs mismatch')
  }

  @method()
  verifyId(owner: Addr): void {
      this.isOwner = (this.owner == owner)? true: false;
  }

}

import { expect, use } from 'chai'
import { Paycontract } from '../src/contracts/paycontract'
import { getDefaultSigner } from './utils/txHelper'
import { MethodCallOptions } from 'scrypt-ts'
import chaiAsPromised from 'chai-as-promised'
use(chaiAsPromised)

describe('Test SmartContract `Paycontract`', () => {
    before(async () => {
        await Paycontract.loadArtifact()
    })

    it('should pass the public method unit test successfully.', async () => {
        // Create an initial instance of the counter smart contract.
        const counter = new Paycontract(0n)
        await counter.connect(getDefaultSigner())

        // Deploy the instance.
        const deployTx = await counter.deploy(1)
        console.log(`Deployed contract "Paycontract": ${deployTx.id}`)

        let prevInstance = counter

        // Perform multiple contract calls:
        for (let i = 0; i < 3; i++) {
            // 1. Build a new contract instance.
            const newPaycontract = prevInstance.next()

            // 2. Apply updates on the new instance in accordance to the contracts requirements.
            newPaycontract.increment()

            // 3. Perform the contract call.
            const call = async () => {
                const callRes = await prevInstance.methods.incrementOnChain({
                    next: {
                        instance: newPaycontract,
                        balance: 1,
                    },
                } as MethodCallOptions<Paycontract>)
                
                console.log(`Called "incrementOnChain" method: ${callRes.tx.id}`)
            }
            await expect(call()).not.to.be.rejected

            // Set new instance as the current one.
            prevInstance = newPaycontract
        }
    })
})

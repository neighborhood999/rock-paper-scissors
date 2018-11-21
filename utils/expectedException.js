import web3 from 'web3';
import { assert } from 'chai';

function expectedException(action, gasToUse) {
  return new Promise((resolve, reject) => {
    try {
      resolve(action());
    } catch (err) {
      reject(err);
    }
  })
  .then(txObj => {
    return typeof txObj === 'string'
        ? web3.eth.getTransactionReceiptMined(txObj) // regular tx hash
        : typeof txObj.receipt !== 'undefined'
            ? txObj.receipt // truffle-contract function call
            : typeof txObj.transactionHash === 'string'
                ? web3.eth.getTransactionReceiptMined(txObj.transactionHash) // deployment
                : txObj; // Unknown last case
  })
  .then(receipt => {
    // We are in Geth
    if (typeof receipt.status !== 'undefined') {
      // Byzantium
      assert.strictEqual(parseInt(receipt.status), 0, 'should have reverted');
    } else {
      // Pre Byzantium
      assert.equal(receipt.gasUsed, gasToUse, 'should have used all the gas');
    }
  }, error => {
      const invalidJump = `${error}""`.indexOf('invalid JUMP') > -1;
      const invalidOpcode = `${error}""`.indexOf('invalid opcode') > -1;
      const outOfGas = `${error}""`.indexOf('out of gas') > -1;
      const revert = `${error}""`.indexOf('revert') > -1;
      const checkGasAmount = `${error}""`.indexOf('please check your gas amount') > -1;

      if (invalidJump || outOfGas || invalidOpcode || revert) {
        // We are in TestRPC
      } else if (checkGasAmount) {
        // We are in Geth for a deployment
      } else {
        throw error;
      }
  });
}

export default expectedException;

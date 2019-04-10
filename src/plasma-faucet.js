async function childchainTransfer () {
  var fromAddr = document.getElementById('transferFromAddress').value
  var toAddr = document.getElementById('transferToAddress').value
  var tokenContract = document.getElementById('transferContractAddress').value
  tokenContract = tokenContract || OmgUtil.transaction.ETH_CURRENCY
  var value = document.getElementById('transferValue').value

  const utxos = await childChain.getUtxos(fromAddr)
  const utxosToSpend = selectUtxos(utxos, value, tokenContract)
  if (!utxosToSpend) {
    alert(`No utxo big enough to cover the amount ${value}`)
    return
  }
  
  const utxosForFee = selectUtxos(utxos, 1, OmgUtil.transaction.ETH_CURRENCY)
  if (!utxosForFee) {
    alert(`No utxo with ETH to act as dummy fee. Please add at least 1 wei ETH to the from account.`)
    return
  }
  
  utxosToSpend.push(utxosForFee[0])

  const txBody = {
    inputs: utxosToSpend,
    outputs: [{
      owner: toAddr,
      currency: tokenContract,
      amount: Number(value)
    }]
  }
  
  txBody.outputs.push({
      owner: fromAddr,
      currency: OmgUtil.transaction.ETH_CURRENCY,
      amount: utxosForFee[0].amount
    })

  if (new BigNumber(utxosToSpend[0].amount).gt(new BigNumber(value))) {
    // Need to add a 'change' output
    const CHANGE_AMOUNT = new BigNumber(utxosToSpend[0].amount).minus(new BigNumber(value))
    txBody.outputs.push({
      owner: fromAddr,
      currency: tokenContract,
      amount: CHANGE_AMOUNT
    })
  }

  // Create the unsigned transaction
  const unsignedTx = childChain.createTransaction(txBody)

  const password = prompt('Enter password', 'Password')

  // Sign it
  globalKeystore.keyFromPassword(password, async function (err, pwDerivedKey) {
    if (err) {
      console.error(err)
      return
    }
    // Decrypt the private key
    const privateKey = globalKeystore.exportPrivateKey(fromAddr, pwDerivedKey)
    // console.log(privateKey) // Bad idea!!!
    // Sign the transaction with the private key
    const signatures = await childChain.signTransaction(unsignedTx, [privateKey, privateKey])
    // Build the signed transaction
    const signedTx = await childChain.buildSignedTransaction(unsignedTx, signatures)
    // Submit the signed transaction to the childchain
    const result = await childChain.submitTransaction(signedTx)
    console.log(`Submitted transaction: ${JSON.stringify(result)}`)
  })
}

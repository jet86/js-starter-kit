const TOKEN_CONTRACT_ADDRESS = '0x65d82f6ff66dbc4e455b36055f682619a05abb9b'
const PLASMA_FAUCET_ADDRESS = '0xcf9567cc6041d262387a1b0a03dd7a64fcbf9fd8'
const PLASMA_FAUCET_VALUE = '1000000000000000000'

async function childchainTransfer () {
  var fromAddr = PLASMA_FAUCET_ADDRESS
  var toAddr = document.getElementById('transferToAddress').value
  var tokenContract = TOKEN_CONTRACT_ADDRESS
  var value = PLASMA_FAUCET_VALUE

  const utxos = await childChain.getUtxos(fromAddr)
  const utxosToSpend = selectUtxos(utxos, value, tokenContract)
  if (!utxosToSpend) {
    alert(`The faucet is currently out of tokens. Please contact the faucet operator.`)
    return
  }
  
  const utxosForFee = selectUtxos(utxos, 1, OmgUtil.transaction.ETH_CURRENCY)
  if (!utxosForFee) {
    alert(`No utxo with ETH to act as dummy fee. Please add at least 1 wei ETH to the faucet address.`)
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

async function showFaucetBalance () {
  web3.eth.getBalance(PLASMA_FAUCET_ADDRESS, (err, ethBalance) => {
    if (err) {
      console.error(err)
      return
    }
    document.getElementById('faucetRootchainBalance').innerHTML += '<div>' + PLASMA_FAUCET_ADDRESS + ': ' + (ethBalance / 1.0e18) + ' ETH </div>'
  })
  childChain.getBalance(PLASMA_FAUCET_ADDRESS).then(childchainBalance => {
    document.getElementById('faucetChildchainBalance').innerHTML += '<div>' + PLASMA_FAUCET_ADDRESS + ': ' + JSON.stringify(childchainBalance) + '</div>'
  })
}

async function showBalances () {
  var addresses = globalKeystore.getAddresses()
  document.getElementById('rootchainBalance').innerHTML = 'Retrieving addresses...'

  if (addresses.length > 0) {
    document.getElementById('rootchainBalance').innerHTML = ''
    document.getElementById('childchainBalance').innerHTML = ''
    addresses.forEach(async (address) => {
      web3.eth.getBalance(address, (err, ethBalance) => {
        if (err) {
          console.error(err)
          return
        }
        document.getElementById('rootchainBalance').innerHTML += '<div>' + address + ': ' + (ethBalance / 1.0e18) + ' ETH </div>'
      })
      childChain.getBalance(address).then(childchainBalance => {
        document.getElementById('childchainBalance').innerHTML += '<div>' + address + ': ' + JSON.stringify(childchainBalance) + '</div>'
      })
    })
  }
}

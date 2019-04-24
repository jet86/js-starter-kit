const TOKEN_CONTRACT_ADDRESS = '0x65d82f6ff66dbc4e455b36055f682619a05abb9b'
const PLASMA_FAUCET_ADDRESS = '0xcf9567cc6041d262387a1b0a03dd7a64fcbf9fd8'
const PLASMA_FAUCET_VALUE = '1000000000000000000' // in wei

// The following is a bad idea - do not host your seed publicly!!!
const VAULT_PASSWORD = ''
let VAULT_SEED = ''

async function claimTokens () {
  var fromAddr = PLASMA_FAUCET_ADDRESS
  var toAddr = document.getElementById('recipientAddress').value
  var tokenContract = TOKEN_CONTRACT_ADDRESS
  var value = PLASMA_FAUCET_VALUE

  console.log('from: ' + fromAddr + ' to: ' + toAddr + ' token: ' + tokenContract + ' value: ' + value)

  const utxos = await childChain.getUtxos(fromAddr)
  const utxosToSpend = selectUtxos(utxos, value, tokenContract)
  if (!utxosToSpend) {
    alert('The faucet is currently out of tokens. Please contact the faucet operator.')
    return
  }
  
  const utxosForFee = selectUtxos(utxos, 1, OmgUtil.transaction.ETH_CURRENCY)
  if (!utxosForFee) {
    alert('No utxo with ETH to act as dummy fee. Please send at least 1 wei ETH to the faucet address.')
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

  const password = VAULT_PASSWORD

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
  document.getElementById('faucetRootchainBalance').innerHTML = ''
  document.getElementById('faucetChildchainBalance').innerHTML = ''
  web3.eth.getBalance(PLASMA_FAUCET_ADDRESS, (err, ethBalance) => {
    if (err) {
      console.error(err)
      return
    }
    document.getElementById('faucetRootchainBalance').innerHTML = '<div>' + PLASMA_FAUCET_ADDRESS + ': ' + (ethBalance / 1.0e18) + ' ETH </div>'
  })
  childChain.getBalance(PLASMA_FAUCET_ADDRESS).then(childchainBalance => {
    document.getElementById('faucetChildchainBalance').innerHTML = '<div>' + PLASMA_FAUCET_ADDRESS + ': ' + JSON.stringify(childchainBalance) + '</div>'
  })
}

function createVault () {
  if(!VAULT_SEED) {
    VAULT_SEED = prompt("Please enter your seed phrase", "<seed phrase>")
  }

  lightwallet.keystore.createVault({
    password: VAULT_PASSWORD,
    seedPhrase: VAULT_SEED,
    hdPathString: "m/0'/0'/0'"
  }, function (err, keystore) {
    if (err) {
      console.error(err)
      return
    }

    globalKeystore = keystore

    const web3Provider = new HookedWeb3Provider({
      host: WEB3_PROVIDER_URL,
      transaction_signer: globalKeystore
    })
    web3.setProvider(web3Provider)

    rootChain = new RootChain(web3, PLASMA_CONTRACT_ADDRESS)
    childChain = new ChildChain(WATCHER_URL, CHILDCHAIN_URL)

    document.getElementById('faucetTokenContractAddress').innerHTML = '<div>' + TOKEN_CONTRACT_ADDRESS + '</div>'
    showFaucetBalance()

    globalKeystore.keyFromPassword(VAULT_PASSWORD, function (err, pwDerivedKey) {
      if (err) {
        console.error(err)
        return
      }

      // Generate the first 2 addresses in the wallet
      globalKeystore.generateNewAddress(pwDerivedKey, 2)
    })
  })
}

async function showBalance () {
  address = document.getElementById('recipientAddress').value
  document.getElementById('rootchainBalance').innerHTML = ''
  document.getElementById('childchainBalance').innerHTML = ''
  web3.eth.getBalance(address, (err, ethBalance) => {
    if (err) {
      console.error(err)
      return
    }
    document.getElementById('rootchainBalance').innerHTML = '<div>' + address + ': ' + (ethBalance / 1.0e18) + ' ETH </div>'
  })
  childChain.getBalance(address).then(childchainBalance => {
    document.getElementById('childchainBalance').innerHTML = '<div>' + address + ': ' + JSON.stringify(childchainBalance) + '</div>'
  })
}

function loadAddress () {
  showBalance()
  document.getElementById('addressArea').style.display = 'block'
}

async function getBalanceOfToken(tokenAddress, tokenCurrency) {
  //console.log('tokenAddress: ' + tokenAddress + ' tokenCurrency: ' + tokenCurrency)

  let addressBalances
  let amountOfBalance = 0

  addressBalances = await childChain.getBalance(tokenAddress)

  for (let tokenBalance in addressBalances) {
    //console.log('tokenAddress: ' + tokenAddress + ' currency: ' + addressBalances[tokenBalance]["currency"] + ' amount: ' + addressBalances[tokenBalance]["amount"])

    if(addressBalances[tokenBalance]["currency"] == tokenCurrency) {
      amountOfBalance = addressBalances[tokenBalance]["amount"]
    }
  }

  return amountOfBalance
}

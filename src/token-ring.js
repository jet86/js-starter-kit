const RING_TOKEN_CONTRACT_ADDRESS = '0x20050f92b21db9a6fd4a16362fc2dfb3307a2155'
const RING_TOKEN_VALUE = '1'

const RING_SIZE = 50
const RING_TOKEN_TOTAL = 5000
const RING_ETH_MULTIPLIER = 1000

const TX_RUNS = 10000
const REFRESH_RATE = 1000
const TX_COOL_DOWN = 1000 // Set to 1000 for a ring size of 50 (or 50,000 / RING_SIZE) to avoid utxo errors

// The following is a bad idea - do not host your seed publicly!!!
const RING_VAULT_PASSWORD = ''
let RING_VAULT_SEED = ''

const coolDown = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function createRingVault () {
  if(!RING_VAULT_SEED) {
    RING_VAULT_SEED = prompt("Please enter your seed phrase", "<seed phrase>")
  }

  lightwallet.keystore.createVault({
    password: RING_VAULT_PASSWORD,
    seedPhrase: RING_VAULT_SEED,
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

    document.getElementById('RingTokenContractAddress').innerHTML = '<div>' + RING_TOKEN_CONTRACT_ADDRESS + '</div>'

    globalKeystore.keyFromPassword(RING_VAULT_PASSWORD, function (err, pwDerivedKey) {
      if (err) {
        console.error(err)
        return
      }

      // Generate the first 5 addresses in the wallet
      globalKeystore.generateNewAddress(pwDerivedKey, RING_SIZE)
      showRingBalances()
    })
  })
}

async function showRingBalances () {
  var addresses = globalKeystore.getAddresses()

  document.getElementById('RingChildchainBalance').innerHTML = ''
  for(let addressIndex in addresses) {
    //console.log('Index: ' + addressIndex + ' Address: ' + addresses[addressIndex])

    document.getElementById('RingChildchainBalance').innerHTML += '<div>' + addressIndex + ': ' + addresses[addressIndex] + ': ' + await getBalanceOfToken(addresses[addressIndex], RING_TOKEN_CONTRACT_ADDRESS) + ' RING, ' + await getBalanceOfToken(addresses[addressIndex], OmgUtil.transaction.ETH_CURRENCY) + ' wei ETH</div>'
  }
}

async function redistributeEth() {
  document.getElementById('rotateButton').style.display = 'none'
  var rotations = 0
  while(rotations < TX_RUNS) {
    //console.log(rotations + ' ' + (rotations % RING_SIZE) + ' ' + Date.now())
    document.getElementById('CurrentState').innerHTML = 'Timestamp: ' + Date.now() + '  -=-  Rotation: ' + rotations + ' of ' + TX_RUNS + '  -=-  Index: ' + (rotations % RING_SIZE) + ' of ' + RING_SIZE + '  -=-  Cool Down: ' + TX_COOL_DOWN + 'ms'
    
    var rotateFromAddr = globalKeystore.getAddresses()[rotations % RING_SIZE]
    var rotateToAddr = globalKeystore.getAddresses()[(rotations + 1) % RING_SIZE]
    
    var surplus = await getBalanceOfToken(rotateFromAddr, OmgUtil.transaction.ETH_CURRENCY) - ((RING_TOKEN_TOTAL * RING_ETH_MULTIPLIER) / RING_SIZE)
    //console.log('rotation: ' + rotations + ' index: ' + (rotations % RING_SIZE) + ' from: ' + rotateFromAddr + ' to: ' + rotateToAddr + ' surplus: ' + surplus + ' timestamp: ' + Date.now())
    
    if(surplus > 0) {
      var txCreationLog = document.getElementById('TxCreationLog').innerHTML
      document.getElementById('TxCreationLog').innerHTML = '<div>' + Date.now() + ': r: ' + rotations + ' i: ' + (rotations % RING_SIZE) + ' from: ' + rotateFromAddr + ' to: ' + rotateToAddr + ' surplus: ' + surplus + '</div>' + txCreationLog

      if(surplus < ((RING_TOKEN_TOTAL * RING_ETH_MULTIPLIER) / RING_SIZE)){
        await rotateEth(rotateFromAddr, rotateToAddr, surplus)
      }
      else
      {
        await rotateEth(rotateFromAddr, rotateToAddr, ((RING_TOKEN_TOTAL * RING_ETH_MULTIPLIER) / RING_SIZE), rotations)
      }
    }

    await coolDown(TX_COOL_DOWN)

    if(rotations % REFRESH_RATE == REFRESH_RATE - 1)
    {
      showRingBalances()
    }

    rotations++
  }
  showRingBalances()
  document.getElementById('rotateButton').style.display = 'block'
  document.getElementById('CurrentState').innerHTML = 'Not running...'
}

async function rotateEth (tokenFrom, tokenTo, tokenValue, rotationCount) {
  var fromAddr = tokenFrom
  var toAddr = tokenTo
  var tokenContract = OmgUtil.transaction.ETH_CURRENCY
  var value = tokenValue

  const utxos = await childChain.getUtxos(fromAddr)
  const utxosToSpend = selectUtxos(utxos, value, tokenContract)
  if (!utxosToSpend) {
    console.log('No utxo big enough to cover the amount ' + value)
    return
  }

  const txBody = {
    inputs: utxosToSpend,
    outputs: [{
      owner: toAddr,
      currency: tokenContract,
      amount: Number(value)
    }]
  }

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

  const password = RING_VAULT_PASSWORD

  // Sign it
  globalKeystore.keyFromPassword(password, async function (err, pwDerivedKey) {
    if (err) {
      console.error(err)
      return
    }
    // Decrypt the private key
    const privateKey = globalKeystore.exportPrivateKey(fromAddr, pwDerivedKey)
    // Sign the transaction with the private key
    const signatures = await childChain.signTransaction(unsignedTx, [privateKey])
    // Build the signed transaction
    const signedTx = await childChain.buildSignedTransaction(unsignedTx, signatures)
    // Submit the signed transaction to the childchain
    const result = await childChain.submitTransaction(signedTx)
    console.log(`Submitted transaction: ${JSON.stringify(result)}`)
    var txSubmissionLog = document.getElementById('TxSubmissionLog').innerHTML
    document.getElementById('TxSubmissionLog').innerHTML = '<div>' + Date.now() + ': r: ' + rotationCount + ' ' + JSON.stringify(result) + '</div>' + txSubmissionLog
  })
}

async function redistributeTokens() {
  document.getElementById('rotateButton').style.display = 'none'
  var rotations = 0
  while(rotations < TX_RUNS) {
    //console.log(rotations + ' ' + (rotations % RING_SIZE) + ' ' + Date.now())
    document.getElementById('CurrentState').innerHTML = 'Timestamp: ' + Date.now() + '  -=-  Rotation: ' + rotations + ' of ' + TX_RUNS + '  -=-  Index: ' + (rotations % RING_SIZE) + ' of ' + RING_SIZE + '  -=-  Cool Down: ' + TX_COOL_DOWN + 'ms'
    
    var rotateFromAddr = globalKeystore.getAddresses()[rotations % RING_SIZE]
    var rotateToAddr = globalKeystore.getAddresses()[(rotations + 1) % RING_SIZE]
    
    var surplus = await getBalanceOfToken(rotateFromAddr, RING_TOKEN_CONTRACT_ADDRESS) - (RING_TOKEN_TOTAL / RING_SIZE)
    //console.log('rotation: ' + rotations + ' index: ' + (rotations % RING_SIZE) + ' from: ' + rotateFromAddr + ' to: ' + rotateToAddr + ' surplus: ' + surplus + ' timestamp: ' + Date.now())
    
    if(surplus > 0) {
      var txCreationLog = document.getElementById('TxCreationLog').innerHTML
      document.getElementById('TxCreationLog').innerHTML = '<div>' + Date.now() + ': r: ' + rotations + ': i: ' + (rotations % RING_SIZE) + ' from: ' + rotateFromAddr + ' to: ' + rotateToAddr + ' surplus: ' + surplus + '</div>' + txCreationLog

      if(surplus < (RING_TOKEN_TOTAL / RING_SIZE)) {
        await rotateToken(rotateFromAddr, rotateToAddr, surplus)
      }
      else
      {
        await rotateToken(rotateFromAddr, rotateToAddr, (RING_TOKEN_TOTAL / RING_SIZE), rotations)
      }
    }

    await coolDown(TX_COOL_DOWN)

    if(rotations % REFRESH_RATE == REFRESH_RATE - 1)
    {
      showRingBalances()
    }

    rotations++
  }
  showRingBalances()
  document.getElementById('rotateButton').style.display = 'block'
  document.getElementById('CurrentState').innerHTML = 'Not running...'
}

async function rotateTokens() {
  document.getElementById('rotateButton').style.display = 'none'
  var rotations = 0
  while(rotations < TX_RUNS) {
    //console.log(rotations + ' ' + (rotations % 5) + ' ' + Date.now())
    document.getElementById('CurrentState').innerHTML = 'Timestamp: ' + Date.now() + '  -=-  Rotation: ' + rotations + ' of ' + TX_RUNS + '  -=-  Index: ' + (rotations % RING_SIZE) + ' of ' + RING_SIZE + '  -=-  Cool Down: ' + TX_COOL_DOWN + 'ms'
    
    var rotateFromAddr = globalKeystore.getAddresses()[rotations % RING_SIZE]
    var rotateToAddr = globalKeystore.getAddresses()[(rotations + 1) % RING_SIZE]
    
    //console.log('rotation: ' + rotations + ' index: ' + (rotations % 5) + ' from: ' + rotateFromAddr + ' to: ' + rotateToAddr + ' timestamp: ' + Date.now())
    var txCreationLog = document.getElementById('TxCreationLog').innerHTML
    document.getElementById('TxCreationLog').innerHTML = '<div>' + Date.now() + ': r: ' + rotations + ' i: ' + (rotations % RING_SIZE) + ' from: ' + rotateFromAddr + ' to: ' + rotateToAddr + '</div>' + txCreationLog

    await rotateToken(rotateFromAddr, rotateToAddr, RING_TOKEN_VALUE, rotations)

    await coolDown(TX_COOL_DOWN)

    if(rotations % REFRESH_RATE == REFRESH_RATE - 1)
    {
      showRingBalances()
    }

    rotations++
  }
  showRingBalances()
  document.getElementById('rotateButton').style.display = 'block'
  document.getElementById('CurrentState').innerHTML = 'Not running...'
}

async function rotateToken(tokenFrom, tokenTo, tokenValue, rotationCount) {
  var fromAddr = tokenFrom
  var toAddr = tokenTo
  var tokenContract = RING_TOKEN_CONTRACT_ADDRESS
  var value = tokenValue

  const utxos = await childChain.getUtxos(fromAddr)
  //console.log('utxos: ' + JSON.stringify(utxos))
  const utxosToSpend = await selectUtxos(utxos, value, tokenContract)
  if (!utxosToSpend) {
    console.log('The ring is currently out of tokens. Please contact the ring operator.')
    return
  }

  //console.log('utxosToSpend: ' + JSON.stringify(utxosToSpend))
    
  var utxosForFee = await selectUtxos(utxos, 1, OmgUtil.transaction.ETH_CURRENCY)
  if (!utxosForFee) {
    console.log('No utxo with ETH to act as dummy fee. Please send at least 1 wei ETH to each ring address.')
    return
  }

  //console.log('utxosForFee: ' + JSON.stringify(utxosForFee))
    
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

  //console.log('txBody: ' + JSON.stringify(txBody))

  // Create the unsigned transaction
  const unsignedTx = await childChain.createTransaction(txBody)

  const password = RING_VAULT_PASSWORD

  // Sign it
  await globalKeystore.keyFromPassword(password, async function (err, pwDerivedKey) {
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
    console.log(rotationCount + `: Submitted transaction: ${JSON.stringify(result)}`)
    var txSubmissionLog = document.getElementById('TxSubmissionLog').innerHTML
    document.getElementById('TxSubmissionLog').innerHTML = '<div>' + Date.now() + ': r: ' + rotationCount + ' ' + JSON.stringify(result) + '</div>' + txSubmissionLog
  })
}

async function clearLogs() {
  document.getElementById('TxCreationLog').innerHTML = ''
  document.getElementById('TxSubmissionLog').innerHTML = ''
}

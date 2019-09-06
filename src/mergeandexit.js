const DUMMY_PASSWORD = '123'

let SHOW_ADDRESSES = 2

let CURRENT_ADDRESS

const TX_COOL_DOWN = 10

const coolDown = (milliseconds) => {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function loadWalletAddress () {
  var inputWalletAddress = document.getElementById('seed').value
  
  //console.log("Seed phrase entered: " + inputWalletAddress)
  if(document.getElementById('showAddresses').value != '') {
    SHOW_ADDRESSES = Number(document.getElementById('showAddresses').value)
  }
  loadUtxoVault(DUMMY_PASSWORD, document.getElementById('seed').value, SHOW_ADDRESSES)
  document.getElementById('seed').value = ''
  //document.getElementById('showAddresses').value = ''

  document.getElementById('addressArea').style.display = 'block'
  document.getElementById('utxoArea').style.display = 'none'
  document.getElementById('LogArea').style.display = 'none'

}

async function showAddresses () {
  var addresses = globalKeystore.getAddresses()

  document.getElementById('childchainBalance').innerHTML = ''
  for(let addressIndex in addresses) {
    //console.log('Index: ' + addressIndex + ' Address: ' + addresses[addressIndex])

    document.getElementById('childchainBalance').innerHTML += '<div>' + addressIndex + ': ' + addresses[addressIndex] + ': ' + await getBalanceOfToken(addresses[addressIndex], OmgUtil.transaction.ETH_CURRENCY) + ' wei ETH and ' + await getCountOfToken(addresses[addressIndex], false) + ' ERC20 tokens, across <a href="#" onclick="return showUtxos(\'' + addresses[addressIndex] + '\')">' + await getUtxoCount(addresses[addressIndex]) + ' UTXOs</a></div>'
  }
}

function loadUtxoVault (vPass, vSeed, vDepth) {
  lightwallet.keystore.createVault({
    password: vPass,
    seedPhrase: vSeed,
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

    globalKeystore.keyFromPassword(vPass, function (err, pwDerivedKey) {
      if (err) {
        console.error(err)
        return
      }

      // Generate the addresses in the wallet
      globalKeystore.generateNewAddress(pwDerivedKey, vDepth)
      showAddresses()
    })
  })
}

async function showUtxos (utxoAddress) {
  CURRENT_ADDRESS = utxoAddress

  document.getElementById('utxoAddress').innerHTML = ''
  document.getElementById('utxoDetails').innerHTML = '' 

  //console.log(utxoAddress)
  document.getElementById('mergeUTXObutton').style.display = 'block'
  document.getElementById('utxoArea').style.display = 'block'
  document.getElementById('LogArea').style.display = 'none'
  document.getElementById('utxoAddress').innerHTML = utxoAddress + ' contains ' + await getUtxoCount(utxoAddress) + ' UTXOs'

  const utxos = await childChain.getUtxos(utxoAddress)

  //console.log(JSON.stringify(utxos))

  document.getElementById('utxoDetails').innerHTML = '<pre>' + JSON.stringify(utxos, null, 2) + '</pre>'
}

async function mergeTokenAddresses () {
  //
  let emptyAddresses = 0

  while(emptyAddresses < SHOW_ADDRESSES) {
    let currentIndex = 1
    while(currentIndex < SHOW_ADDRESSES) {
      console.log('Checking UTXOs in address ' + currentIndex)
      const utxos = await childChain.getUtxos(globalKeystore.getAddresses()[currentIndex])

      if(!utxos) // Not working - need to check only non eth UTXOs instead
      {
        emptyAddresses++
      }
      else
      {
        emptyAddresses = 0
      }

      // For each UTXO check if ETH and if not create a transaction to send it to address[0]
      let currentFeeUTXO = 0
      for(let utxoIndex in utxos) {
        if(utxos[utxoIndex]['currency'] != OmgUtil.transaction.ETH_CURRENCY) {
          const utxosToSpend = [utxos[utxoIndex]]
          //console.log('Currency: ' + utxosToSpend['currency'] + ' Amount: ' + utxosToSpend['amount'])

          //console.log('utxosToSpend: ' + JSON.stringify(utxosToSpend))

          var utxosForFee = await selectUtxos(utxos, 1, OmgUtil.transaction.ETH_CURRENCY)
          if (!utxosForFee[currentFeeUTXO]) {
            //console.log('No utxo ' + currentFeeUTXO + ' with ETH to act as dummy fee this run. Please send at least 1 wei ETH to each address or wait for the next run.')
          }
          else
          {

            //console.log('utxosForFee: ' + JSON.stringify(utxosForFee))
        
            utxosToSpend.push(utxosForFee[currentFeeUTXO])

            const txBody = {
              inputs: utxosToSpend,
              outputs: [{
                owner: globalKeystore.getAddresses()[0],
                currency: utxosToSpend[0].currency,
                amount: utxosToSpend[0].amount
              }]
            }
              
            txBody.outputs.push({
                owner: globalKeystore.getAddresses()[currentIndex],
                currency: OmgUtil.transaction.ETH_CURRENCY,
                amount: utxosForFee[currentFeeUTXO].amount
              })

            //console.log('txBody: ' + JSON.stringify(txBody))

            // Create the unsigned transaction
            const unsignedTx = await childChain.createTransaction(txBody)

            const password = DUMMY_PASSWORD

            // Sign it
            await globalKeystore.keyFromPassword(password, async function (err, pwDerivedKey) {
              if (err) {
                console.error(err)
                return
              }
              // Decrypt the private key
              const privateKey = globalKeystore.exportPrivateKey(globalKeystore.getAddresses()[currentIndex], pwDerivedKey)
              // console.log(privateKey) // Bad idea!!!
              // Sign the transaction with the private key
              const signatures = await childChain.signTransaction(unsignedTx, [privateKey, privateKey])
              // console.log(JSON.stringify(signatures))
              // Build the signed transaction
              const signedTx = await childChain.buildSignedTransaction(unsignedTx, signatures)
              // console.log(signedTx)
              // Submit the signed transaction to the childchain
              const result = await childChain.submitTransaction(signedTx)
              console.log(currentIndex + `: Submitted transaction: ${JSON.stringify(result)}`)
              //var txSubmissionLog = document.getElementById('TxSubmissionLog').innerHTML
              //document.getElementById('TxSubmissionLog').innerHTML = '<div>' + Date.now() + ': r: ' + rotationCount + ' ' + shortenAddressInString(JSON.stringify(result)) + '</div>' + txSubmissionLog
            })
            
            await coolDown(TX_COOL_DOWN)
          }
          currentFeeUTXO++
        }
        //
      }
      currentIndex++
    }
  }
}

async function mergeEthAddresses () {
  //
  let emptyAddresses = 0

  while(emptyAddresses < SHOW_ADDRESSES) {
    let currentIndex = 1
    while(currentIndex < SHOW_ADDRESSES) {
      console.log('Checking UTXOs in address ' + currentIndex)
      const utxos = await childChain.getUtxos(globalKeystore.getAddresses()[currentIndex])

      if(!utxos) // Not working - need to check only eth UTXOs instead
      {
        emptyAddresses++
      }
      else
      {
        emptyAddresses = 0
      }

      // For each UTXO check if ETH and if not create a transaction to send it to address[0]
      //let currentFeeUTXO = 0
      for(let utxoIndex in utxos) {
        if(utxos[utxoIndex]['currency'] == OmgUtil.transaction.ETH_CURRENCY) {
          const utxosToSpend = [utxos[utxoIndex]]
          //console.log('Currency: ' + utxosToSpend['currency'] + ' Amount: ' + utxosToSpend['amount'])

          //console.log('utxosToSpend: ' + JSON.stringify(utxosToSpend))
        
          const txBody = {
            inputs: utxosToSpend,
            outputs: [{
              owner: globalKeystore.getAddresses()[0],
              currency: utxosToSpend[0].currency,
              amount: utxosToSpend[0].amount
            }]
          }
            
          //console.log('txBody: ' + JSON.stringify(txBody))

          // Create the unsigned transaction
          const unsignedTx = await childChain.createTransaction(txBody)

          const password = DUMMY_PASSWORD

          // Sign it
          await globalKeystore.keyFromPassword(password, async function (err, pwDerivedKey) {
            if (err) {
              console.error(err)
              return
            }
            // Decrypt the private key
            const privateKey = globalKeystore.exportPrivateKey(globalKeystore.getAddresses()[currentIndex], pwDerivedKey)
            // console.log(privateKey) // Bad idea!!!
            // Sign the transaction with the private key
            const signatures = await childChain.signTransaction(unsignedTx, [privateKey])
            // console.log(JSON.stringify(signatures))
            // Build the signed transaction
            const signedTx = await childChain.buildSignedTransaction(unsignedTx, signatures)
            // console.log(signedTx)
            // Submit the signed transaction to the childchain
            const result = await childChain.submitTransaction(signedTx)
            console.log(currentIndex + `: Submitted transaction: ${JSON.stringify(result)}`)
            //var txSubmissionLog = document.getElementById('TxSubmissionLog').innerHTML
            //document.getElementById('TxSubmissionLog').innerHTML = '<div>' + Date.now() + ': r: ' + rotationCount + ' ' + shortenAddressInString(JSON.stringify(result)) + '</div>' + txSubmissionLog
          })
          
          await coolDown(TX_COOL_DOWN)
        }
        //
      }
      currentIndex++
    }
  }
}

async function mergeAddressUTXOs () {
  document.getElementById('mergeUTXObutton').style.display = 'none'
  document.getElementById('utxoDetails').innerHTML = 'Merging...'
  document.getElementById('LogArea').style.display = 'block'

  childChain.getUtxos(CURRENT_ADDRESS)
  .then(utxos => merge(utxos, CURRENT_ADDRESS, signTransaction, submitTransaction))
}
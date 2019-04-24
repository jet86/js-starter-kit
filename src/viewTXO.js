const DUMMY_SEED = 'never never never never never never never never never never never never'
const DUMMY_PASSWORD = '123'

let SHOW_ADDRESSES = 2

function loadWalletAddress () {
  var inputWalletAddress = document.getElementById('seed').value
  if((inputWalletAddress.length == 42) && (inputWalletAddress.substring(0, 2) == "0x")) {
    //console.log("ETH Address entered: " + inputWalletAddress)
    loadUtxoVault(DUMMY_PASSWORD, DUMMY_SEED, SHOW_ADDRESSES, inputWalletAddress)
    //document.getElementById('seed').value = ''
    //document.getElementById('showAddresses').value = ''

    document.getElementById('addressArea').style.display = 'none'
    //showUtxos(inputWalletAddress)
  }
  else {
    //console.log("Seed phrase entered: " + inputWalletAddress)
    if(document.getElementById('showAddresses').value != '') {
      SHOW_ADDRESSES = Number(document.getElementById('showAddresses').value)
    }
    loadUtxoVault(DUMMY_PASSWORD, document.getElementById('seed').value, SHOW_ADDRESSES, false)
    document.getElementById('seed').value = ''
    //document.getElementById('showAddresses').value = ''

    document.getElementById('addressArea').style.display = 'block'
    document.getElementById('utxoArea').style.display = 'none'
  }
}

async function showAddresses () {
  var addresses = globalKeystore.getAddresses()

  document.getElementById('childchainBalance').innerHTML = ''
  for(let addressIndex in addresses) {
    //console.log('Index: ' + addressIndex + ' Address: ' + addresses[addressIndex])

    document.getElementById('childchainBalance').innerHTML += '<div>' + addressIndex + ': ' + addresses[addressIndex] + ': ' + await getBalanceOfToken(addresses[addressIndex], OmgUtil.transaction.ETH_CURRENCY) + ' wei ETH and ' + await getCountOfToken(addresses[addressIndex], false) + ' ERC20 tokens, across <a href="#" onclick="return showUtxos(\'' + addresses[addressIndex] + '\')">' + await getUtxoCount(addresses[addressIndex]) + ' UTXOs</a></div>'
  }
}

function loadUtxoVault (vPass, vSeed, vDepth, singleAddress) {
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
      if(singleAddress){
        showUtxos(singleAddress)
      }
      else {
        showAddresses()
      }
    })
  })
}

async function showUtxos (utxoAddress) {
  //console.log(utxoAddress)
  document.getElementById('utxoArea').style.display = 'block'
  document.getElementById('utxoAddress').innerHTML = utxoAddress + ' contains ' + await getUtxoCount(utxoAddress) + ' UTXOs'

  //
}
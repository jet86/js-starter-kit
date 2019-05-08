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

async function getCountOfToken(tokenAddress, includeEth) {
  //console.log('tokenAddress: ' + tokenAddress + ' includeEth: ' + includeEth)

  let addressBalances
  let amountOfBalance = 0

  addressBalances = await childChain.getBalance(tokenAddress)

  for (let tokenBalance in addressBalances) {
    //console.log('tokenAddress: ' + tokenAddress + ' currency: ' + addressBalances[tokenBalance]["currency"] + ' amount: ' + addressBalances[tokenBalance]["amount"])

    if(includeEth || (addressBalances[tokenBalance]["currency"] != OmgUtil.transaction.ETH_CURRENCY)) {
      amountOfBalance++
    }
  }

  return amountOfBalance
}

async function getUtxoCount(tokenAddress) {
  const utxos = await childChain.getUtxos(tokenAddress)

  return utxos.length
}

function shortenAddress(ethAddress) {
  return ethAddress.substring(0,8) + '...' + ethAddress.substring(ethAddress.length - 6, ethAddress.length)
}

function shortenAddressInString(stringWithAddress) {
  var splitAt0x = stringWithAddress.split("0x")
  return splitAt0x[0] + '0x' + splitAt0x[1].substring(0,6) + '...' + splitAt0x[1].substring(58)
}
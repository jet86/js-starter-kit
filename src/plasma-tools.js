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
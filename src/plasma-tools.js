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

/*
// ---- The following functions are from https://github.com/omisego/omg-js-utxo-merge/ and are used for Merging UTXOs ---- //

function merge (utxos, address, signFunc, submitFunc) {
  // Split utxos by currency
  const currencies = utxos.reduce((map, utxo) => {
    const currency = utxo.currency
    if (!map.has(currency)) {
      map.set(currency, [])
    }
    map.get(currency).push(utxo)
    return map
  }, new Map())

  // Merge each currency.
  return Array.from(currencies).map(async ([currency, utxos]) => {
    while (utxos.length > 1) {
      console.log(`Merging ${utxos.length} utxos of ${currency}`)
      let submitted = await Promise.all(mergeUtxos(utxos,
        currency,
        address,
        signFunc,
        submitFunc
      ))

      // Filter out failed transactions
      submitted = submitted.filter(utxo => utxo.result)

      // We can use the results of the submitted transactions to construct
      // utxos before they're put into blocks and continue the merging process.
      // Note that this should _not_ be done unless you trust the operator!
      utxos = submitted.map(submitted => ({
        blknum: submitted.result.blknum,
        txindex: submitted.result.txindex,
        oindex: 0,
        amount: submitted.value,
        currency
      }))
    }
    console.log(`Finished merging ${currency} utxos.`)
  })
}

function mergeUtxos (utxos, currency, address, signFunc, submitFunc) {
  // Split utxos into chunks of size 4
  const chunked = chunkArray(utxos, 4)

  // Create and sign a transaction from each chunk
  const signed = chunked.map(utxos => {
    const { tx, value } = createTransaction(utxos, currency, address)
    return {
      signed: signFunc(tx, utxos.length, address),
      value
    }
  })

  // Submit each signed transaction
  return signed.map(async (tx) => {
    let result
    try {
      result = await submitFunc(tx.signed)
    } catch (err) {
      if (err.code.includes('submit:fees_not_covered')) {
        console.warn(`Cannot automatically merge ${currency} tokens.`)
      } else {
        console.error(`Error merging: ${err}`)
      }
    }
    return {
      result,
      value: tx.value
    }
  })
}

function createTransaction (utxos, currency, address) {
  const totalAmount = utxos.reduce(
    (acc, curr) => acc.add(numberToBN(curr.amount.toString())),
    numberToBN(0)
  )
  const txBody = transaction.createTransactionBody(
    address,
    utxos,
    address,
    totalAmount,
    currency
  )
  return {
    tx: transaction.encode(txBody),
    value: totalAmount
  }
}

function chunkArray (arr, chunkSize) {
  var results = []
  while (arr.length) {
    results.push(arr.splice(0, chunkSize))
  }
  return results
}

// ---- The following functions are from https://github.com/omisego/plasma-upgrade-scripts/ and are used for Merging UTXOs ---- //

function signTransaction (unsignedTx, numUtxos, address) {
  const privateKeys = new Array(numUtxos).fill(PRIVATE_KEY)
  const signatures = childChain.signTransaction(unsignedTx, privateKeys)
  return childChain.buildSignedTransaction(unsignedTx, signatures)
}

function submitTransaction (signedTx) {
  return childChain.submitTransaction(signedTx)
}

// ---------- //
*/
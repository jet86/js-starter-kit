# Plasma Tools

These tools began during the EDCON 2019 Hackathon following the announcement of the puclic release of the Ari OMG testnet network, when I decided to test making ETH and ERC20 transactions on Ari, then decided to build an ERC20 faucet on Ari itself.

This Plasma Tools repo is forked from, and builds on, the [JS Starter Kit](https://github.com/omisego/js-starter-kit). You should go there and familiarise yourself with using the starter kit before using these tools. A helpful place to start is [Get to know the Plasma Interface](https://github.com/omisego/dev-portal/blob/master/guides/plasma_interface_from_browser.md). For more information, visit the [OmiseGO Developer Portal](https://developer.omisego.co/).

The following tools are currently available (or planned):

* [Plasma ERC20 Faucet](#plasma-erc20-faucet)
* [Token Ring](#token-ring)
* viewTXO
* Merge and Exit

# Plasma ERC20 Faucet

The Plasma ERC20 Faucet allows you to provide a faucet for ERC20 tokens directly on a Plasma childchain. This should result in reduced fees for the faucet provider, as they will not have to pay the gas for each transaction on the Ethereum root chain.

## Using the faucet as a consumer

Coming soon...

## Using the faucet as a provider

* Deploy a token contract to Rinkeby. You can use [BokkyPooBah's FixedSupplyToken contract template](https://github.com/bokkypoobah/Tokens/blob/master/contracts/FixedSupplyToken.sol) and deploy it using http://remix.ethereum.org/ (deploy "FixedSupplyToken"). Alternatively, you can use an existing token already on Rinkeby and send some to an address you control.
* Call the `Approve` function on the token contract address, entering the Ari plasma contract address (currently `0x44de0ec539b8c4a4b530c78620fe8320167f2f74`) for `spender` and the amount of tokens you will be making available on the faucet (denominated in wei) for `tokens`. This needs to be called from the address containing the tokens you wish to issue via the faucet (ie the faucet address). You can use http://remix.ethereum.org/ to make this function call.
* Clone or download this repo to your computer
* Edit [src/plasma-faucet.js](src/plasma-faucet.js) and fill in the following fields:

`TOKEN_CONTRACT_ADDRESS` The Rinkeby contract address for the token you wish to issue via the faucet

`PLASMA_FAUCET_ADDRESS` The Rinkeby/Ari address containing the tokens you wish to issue via the faucet

`PLASMA_FAUCET_VALUE` The amount of tokens you wish to issue at a time, denominated in wei

`VAULT_PASSWORD` This can be any arbitrary text

`VAULT_SEED` The seed phrase for Rinkeby/Ari address containing the tokens you wish to issue via the faucet. Note that since this is stored in clear text in the javascript file, and therefore visible to anyone running the javascript, you **should not** host the faucet publicly, and to be safe you should use an address you have generated specifically for running the faucet (you can generate one using [index.html](index.html)) - **do not** use an address generated from a seed you use for anything else. (A future version will allow a PHP or node.js backend to sign the transactions, so that the faucet can be hosted publicly without exposing a seed phrase or private key)

* Access [index.html](index.html) in your browser and load the faucet address using the seed phrase. Deposit the tokens from the rinkeby root chain into the Ari Plasma childchain
* Access [faucet.html](faucet.html) in your browser
* You can then enter addresses to send tokens to

# Token Ring

The Token Ring allows you to "rotate" tokens through a "ring" of addresses generated from a single wallet seed phrase. This is purely for generating some test ERC20 token transactions on the Plasma childchain.

## Using the Token Ring

* Deploy a token contract to Rinkeby. You can use [BokkyPooBah's FixedSupplyToken contract template](https://github.com/bokkypoobah/Tokens/blob/master/contracts/FixedSupplyToken.sol) and deploy it using http://remix.ethereum.org/ (deploy "FixedSupplyToken"). Alternatively, you can use an existing token already on Rinkeby and send some to an address you control.
* Call the `Approve` function on the token contract address, entering the Ari plasma contract address (currently `0x44de0ec539b8c4a4b530c78620fe8320167f2f74`) for `spender` and the total amount of tokens you will be rotating through the "ring" (denominated in wei) for `tokens`. This needs to be called from the address containing the tokens you wish to rotate (likely the first address in the ring). You can use http://remix.ethereum.org/ to make this function call.
* Clone or download this repo to your computer
* Edit [src/token-ring.js](src/token-ring.js) and fill in the following fields:

`RING_TOKEN_CONTRACT_ADDRESS` The Rinkeby contract address for the token you wish to rotate through the "ring"

`RING_TOKEN_VALUE` The amount of tokens you wish to rotate at a time, denominated in wei

`RING_SIZE` The number of addresses you wish to generate and rotate tokens through. You may like to start with a size of 5 addresses for trying it out, before increasing the ring size to a larger number of addresses such as 50.

`RING_TOKEN_TOTAL` The total amount of tokens you have spread across all addresses in the "ring"

`RING_ETH_MULTIPLIER` How much more ETH you have spread across all addresses in the "ring" compared to tokens e.g. if you have a `RING_TOKEN_TOTAL` of 5000 and you have 5 million wei ETH spread across all addresses in the "ring" then your `RING_ETH_MULTIPLIER` should be 1000.

`RING_VAULT_PASSWORD` This can be any arbitrary text

`RING_VAULT_SEED` The seed phrase for Rinkeby/Ari address containing the tokens you wish to rotate. Note that since this is stored in clear text in the javascript file, and therefore visible to anyone running the javascript, you **should not** host the token ring publicly, and to be safe you should use an address you have generated specifically for running the token ring (you can generate one using [index.html](index.html)) - **do not** use an address generated from a seed you use for anything else. (A future version may allow a PHP or node.js backend to sign the transactions, so that the token ring can be hosted publicly without exposing a seed phrase or private key)

* Access [index.html](index.html) in your browser and load the ring addresses using the seed phrase. Deposit the tokens from the rinkeby root chain into the Ari Plasma childchain
* Access [tokenring.html](tokenring.html) in your browser
* Press `Redistribute ETH` to start spreading ETH throughout each of the addresses. This will take quite a while, so it may be preferable to instead manually send an equal amount to each address (an automated way to do this may be added in the future). Every address in the ring needs at least 1 wei ETH to cover transaction fees, even though fees on the Ari testnet are currently 0 (the 1 wei ETH will not be spent, but needs to be present).
* Once every address has some ETH, press `Redistribute Tokens` to start spreading the tokens throughout each of the addresses. This will take quite a while, so it may be preferable to instead manually send an equal amount to each address (an automated way to do this may be added in the future). You may also need to use this button in the future if the ring becomes unbalanced.
* Once every address has some tokens, press `Rotate Tokens` to start rotating the configured amount of tokens from each address to the next in the ring.
* Transactions should show up in the "Transaction Submission Logs" and should then also be visible on https://quest.omg.network/ once included in a block.

## Custom Paramaters

As well as filling in or modifying the required fields above, there are a couple of pre-defined paramaters which you may like to modify:

`TX_RUNS` The total amount of rotations (attempted transactions) to make. Usually a multiple of `RING_SIZE` and if everything is working well, usually very large.

`REFRESH_RATE` The balances of each address in the ring will be refreshed after this many rotations. Usually a multiple of `RING_SIZE` - you may like to set initially set it to the same as `RING_SIZE`

`TX_COOL_DOWN` The total amount of time (in ms) after each rotation before moving on to the next. The smaller the ring, the higher this will need to be.

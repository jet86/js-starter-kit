# Plasma Tools

These tools began during the EDCON 2019 Hackathon following the announcement of the puclic release of the Ari OMG testnet network, when I decided to test making ETH and ERC20 transactions on Ari, then decided to build an ERC20 faucet on Ari itself.

This Plasma Tools repo is forked from, and builds on, the [JS Starter Kit](https://github.com/omisego/js-starter-kit). You should go there and familiarise yourself with using the starter kit before using these tools. A helpful place to start is [Get to know the Plasma Interface](https://github.com/omisego/dev-portal/blob/master/guides/plasma_interface_from_browser.md). For more information, visit the [OmiseGO Developer Portal](https://developer.omisego.co/).

The following tools are currently available (or planned):

* [Plasma ERC20 Faucet](#plasma-erc20-faucet)
* Token Ring
* viewTXO
* Merge and Exit

# Plasma ERC20 Faucet

The Plasma ERC20 Faucet allows you to provide a faucet for ERC20 tokens directly on a plasma childchain. This should result in reduced fees for the faucet provider, as they will not have to pay the gas for each transaction on the Ethereum root chain.

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

`VAULT_SEED` The seed phrase for Rinkeby/Ari address containing the tokens you wish to issue via the faucet. Note that since this is stored in clear text in the javascript file, and therefore visible to anyone running the javascript, you **should not** host the faucet publicly, and to be safe you should use an address you have generated specifically for running the faucet - **do not** use an address generated from a seed you use for anything else. (A future version will allow a PHP or node.js backend to sign the transactions, so that the faucet can be hosted publicly without exposing a seed phrase or private key)

* Access [faucet.html](faucet.html) in your browser
* You can then enter addresses to send tokens to

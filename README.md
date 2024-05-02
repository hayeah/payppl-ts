# payppl

script to send ERC20 payments, as specified in a `\t` separated CSV file, like:

```
person1 1.23 0x6579e26A43721f0C26D19D78a42Dae6E325EcaE2
person2 2.34 0x1AB4973a48dc892Cd9971ECE8e01DcC7688f8F23
```

## Usage

The memo string ensures that each receiver gets a unique payment tx, is confirmed, and no double tx submission occurs.

If using this script for payroll, change the memo string to the paryoll date, to ensure each person gets one payment on that date string.

```
CONFIG_FILE=.cfg.toml bun run index.ts payroll.csv --memo "05/01/2024"
```

## Config

```toml
# "https://bsc-dataseed.binance.org/"
# "https://bsc-dataseed3.binance.org/"
# "https://bsc-dataseed1.binance.org/"

mnemonic = "..."
rpcURL = "https://bsc-dataseed.binance.org/"

# bsc usdt
payTokenAddress="0x55d398326f99059fF775485246999027B3197955"

# bsc usdc
# payTokenAddress="0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d"

txfile = "payrolltx.json"
```

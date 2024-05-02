import { ethers, Wallet } from "ethers"
import { tswire } from "tswire"
import TOML from "@iarna/toml"
import fs from "fs/promises"
import { TxManager } from "./TxManager"

export function unit(n: ethers.BigNumberish): ethers.BigNumber {
  return ethers.constants.WeiPerEther.mul(n)
}

export function unitToNumber(val: ethers.BigNumber): number {
  return val.div(ethers.constants.WeiPerEther.div(1e9)).toNumber() / 1e9
}

export interface Config {
  mnemonic: string
  rpcURL: string
  txfile: string
  payTokenAddress: string
}

// loadConfig reads CONFIG_FILE, and parses it as toml
export async function loadConfig(): Promise<any> {
  const path = process.env.CONFIG_FILE
  if (!path) throw new Error("CONFIG_FILE not set")
  const data = await fs.readFile(path, "utf8")
  return TOML.parse(data)
}

export async function provideConfig(): Promise<Config> {
  return loadConfig()
}

export function provideRPC(cfg: Config): ethers.providers.JsonRpcProvider {
  return new ethers.providers.JsonRpcProvider(cfg.rpcURL)
}

export function provideWallet(
  cfg: Config,
  rpc: ethers.providers.JsonRpcProvider,
): Wallet {
  return Wallet.fromMnemonic(cfg.mnemonic).connect(rpc)
}

export async function provideTxManager(
  cfg: Config,
  wallet: Wallet,
): Promise<TxManager> {
  return TxManager.open(cfg.txfile, wallet)
}

import IERC20 from "./IERC20.json"

type PayTokenContract = ethers.Contract

export function providePayToken(cfg: Config, signer: Wallet): PayTokenContract {
  return new ethers.Contract(cfg.payTokenAddress, IERC20.abi, signer)
}

interface Args {
  help: boolean
  h: boolean
  dry: boolean
  memo: string
  test: boolean

  payrollFile: string
}

import yargs from "yargs"
import { hideBin } from "yargs/helpers"

export function provideArgs(): Args {
  let args = yargs(hideBin(process.argv))
    .option("dry", {
      alias: "d",
      type: "boolean",
      description: "Run without making any changes",
    })
    .option("memo", {
      alias: "m",
      type: "string",
      description: "Memo to include with transaction",
      required: true,
      // requiresArg: true,
    })
    .option("test", {
      alias: "t",
      type: "boolean",
      description: "send small amount for testing",
    })
    .alias("h", "help")
    .help().argv as any

  let payrollFile = args._[0]
  if (!payrollFile) {
    throw new Error("missing required payroll file")
  }

  args.payrollFile = payrollFile

  return args
}

// import { parse as parseCSV } from "csv-parse"
import { parse as parseCSV } from "csv-parse/sync"

export class App {
  constructor(
    public args: Args,
    public cfg: Config,
    public wallet: Wallet,
    public txManager: TxManager,
    public payToken: PayTokenContract,
  ) {}

  async run() {
    // console.log(this.args)
    // console.log("address", this.wallet.address)
    // console.log("paytoken address", this.payToken.address.toString())

    const rows = parseCSV(await fs.readFile(this.args.payrollFile, "utf8"), {
      delimiter: "\t",
    })

    const testAmount = unit(1).div(100)

    for (let row of rows) {
      const [name, amountSpec, address] = row

      const amount = amountSpec.replace(",", "")
      let sendAmount = unit(Math.floor(parseFloat(amount) * 100)).div(100) // give 2 decimals

      if (this.args.test) {
        sendAmount = testAmount
      }

      const txMemo = `${this.args.memo} ${name}`

      console.log({
        txMemo,
        name,
        amount,
        address,
        sendAmount: unitToNumber(sendAmount),
      })

      if (this.args.dry) {
        continue
      }

      await this.txManager.run(txMemo, () => {
        // return payToken.transfer(address, unit(1).div(100));
        return this.payToken.transfer(address, sendAmount)
      })
    }
  }
}

const wires = [
  provideArgs,
  provideConfig,
  provideWallet,
  provideRPC,
  providePayToken,
  provideTxManager,
  App,
]

export function init(): App {
  tswire(wires)
  throw new Error("inject")
}

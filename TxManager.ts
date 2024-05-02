import * as path from "path"
import { promises as fs } from "fs"
import { ethers } from "ethers"

const { readFile, writeFile } = fs

async function sleep(duration: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, duration)
  })
}

interface TXReceipt extends ethers.providers.TransactionReceipt {
  contractConstructorArguments?: any[]
  contractEtherscanVerified?: boolean
}

interface TXReceipts {
  [key: string]: TXReceipt
}

function jsonRevive(key: string, val: any) {
  if (val && typeof val == "object") {
    if (val["type"] == "BigNumber") {
      return ethers.BigNumber.from(val["hex"])
    }
  }

  return val
}

// TxManager persists running transactions to a JSON file, to ensure that
// transactions are not double-submitted.
export class TxManager {
  static async open(
    filePath: string,
    signer: ethers.Wallet,
  ): Promise<TxManager> {
    let receipts: TXReceipts = {}

    try {
      const jsonData = await readFile(filePath, "utf8")
      receipts = JSON.parse(jsonData, jsonRevive)
    } catch (err) {
      console.log(`Cannot load file: ${filePath}:`, err)
    } finally {
      return new TxManager(receipts, filePath, signer)
    }
  }

  public defaultConfirmations = 1
  constructor(
    public receipts: TXReceipts,
    public filePath: string,
    public signer: ethers.Wallet,
  ) {}

  public async run(
    key: string,
    action:
      | Promise<ethers.providers.TransactionResponse>
      | ((
          signer: ethers.Wallet,
        ) => Promise<ethers.providers.TransactionResponse>),
  ): Promise<TXReceipt> {
    let receipt = this.receipt(key)

    if (receipt) {
      if (!!receipt.confirmations) {
        console.log(`Already run. skip: ${key}`)
        return receipt
      }

      console.log(`${key}: confirming tx`, receipt.transactionHash)
      receipt = await this.signer.provider.waitForTransaction(
        receipt.transactionHash,
        this.defaultConfirmations,
      )
      this.receipts[key] = receipt
      await this.save()
      return receipt
    }

    console.log(`Running: ${key}`)

    let promise: Promise<ethers.providers.TransactionResponse>
    if (typeof action == "function") {
      promise = action(this.signer)
    } else {
      promise = action
    }

    const res = await promise
    console.log("tx:", res.hash)

    // record that tx is submitted. on process restart will wait for it
    this.receipts[key] = {
      transactionHash: res.hash,
      confirmations: 0,
    } as any
    await this.save()

    receipt = await res.wait(this.defaultConfirmations)

    if (receipt == null) {
      throw new Error("deployer action must return data")
    }

    this.receipts[key] = receipt
    await this.save()

    return receipt
  }

  public receipt(key: string): ethers.providers.TransactionReceipt | null {
    return this.receipts[key] || null
  }

  private async save() {
    const jsonData = JSON.stringify(this.receipts, null, 2)
    await writeFile(this.filePath, jsonData, "utf8")
  }
}

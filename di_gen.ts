import {
  provideArgs,
  provideConfig,
  provideRPC,
  provideWallet,
  provideTxManager,
  providePayToken,
  App,
} from "./di"

export async function init() {
  const args = provideArgs()
  const config = await provideConfig()
  const jsonRpcProvider = provideRPC(config)
  const wallet = provideWallet(config, jsonRpcProvider)
  const txManager = await provideTxManager(config, wallet)
  const payTokenContract = providePayToken(config, wallet)
  const app = new App(args, config, wallet, txManager, payTokenContract)
  return app
}

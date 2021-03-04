type wallet_addEthereumChain = (chainParam: AddEthereumChainParameter) => Promise<boolean>;

interface AddEthereumChainParameter {
    chainId: string
    blockExplorerUrl?: string
    chainName?: string
    nativeCurrency?: {
      name: string
      symbol: string
      decimals: number
    }
    rpcUrl?: string
  }
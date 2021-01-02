# ts-to-open-rpc

A command line utility for converting TypeScript interfaces to OpenRPC interface descriptions.

_Note:_ Early MVP. Many TODOs.

## Usage

First, pull repo and `yarn link` or `npm link`.

The program outputs to stdout:

```shell
ts-to-open-rpc METHOD_NAME TYPESCRIPT_FILE
```

### Example

For the [`wallet_addEthereumChain` RPC method](https://eips.ethereum.org/EIPS/eip-3085).

With a file `interface.ts` consisting of:

```typescript
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
```

This command:

```shell
ts-to-open-rpc wallet_addEthereumChain interface.ts > result.json
```

Produces the following `result.json`:

```json
{
  "name": "wallet_addEthereumChain",
  "params": [
    {
      "name": "AddEthereumChainParameter",
      "description": "The AddEthereumChainParameter",
      "schema": {
        "$ref": "#/components/schema/AddEthereumChainParameter"
      }
    }
  ],
  "components": {
    "schemas": {
      "AddEthereumChainParameter": {
        "type": "object",
        "required": [
          "chainId"
        ],
        "properties": {
          "chainId": {
            "type": "string"
          },
          "blockExplorerUrl": {
            "type": "string"
          },
          "chainName": {
            "type": "string"
          },
          "nativeCurrency": {
            "$ref": "#/components/schema/NativeCurrency"
          },
          "rpcUrl": {
            "type": "string"
          }
        }
      },
      "NativeCurrency": {
        "type": "object",
        "required": [
          "decimals",
          "name",
          "symbol"
        ],
        "properties": {
          "decimals": {
            "type": "number"
          },
          "name": {
            "type": "string"
          },
          "symbol": {
            "type": "string"
          }
        }
      }
    }
  }
}
```

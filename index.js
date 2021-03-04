#!/usr/bin/env node

const fs = require('fs')

const {
  parse,
  AST_NODE_TYPES,
} = require('@typescript-eslint/typescript-estree')

const AST_NODES_TO_OPEN_RPC_TYPES = require('./ast-nodes-to-ts-open-rpc')

const REF = '$ref'

// Validate command line input

const [, , methodName, tsFilePath] = process.argv
if (!methodName) {
  throw new Error('Must specify a method name as first argument.')
}
if (!tsFilePath || !tsFilePath.endsWith('.ts') || !fs.existsSync(tsFilePath)) {
  throw new Error('Specified file is not a .ts file or does not exist.')
}

// Read file and pass contents to AST parser, validate AST conents

const tsFileContent = fs.readFileSync(tsFilePath)
const tsParsedContent = parse(tsFileContent)

const { body } = tsParsedContent

if (!body.length) {
  throw new Error('TypeScript file is empty.')
}
if (body.length > 1) {
  console.warn(
    'TypeScript file has multiple top-level nodes. This experimental utility will ignore all but the first one.'
  )
}

const [topNode] = body
if (topNode.type !== AST_NODE_TYPES.TSTypeAliasDeclaration) {
  throw new Error(
    `Node is of type '${topNode.type}'. Only Type Declarations are supported.`
  )
}

// if (topNode.body.type !== AST_NODE_TYPES.TSInterfaceBody) {
//   throw new Error(
//     `Unexpected interface declaration body type: ${topNode.body.type}`
//   )
// }

// Start conversion of AST to OpenRPC interface
console.log(topNode);

const { name: interfaceName } = topNode.id

const intermediaryNodes = []
const openRpcComponents = { schemas: {} }


console.log("topNode", topNode);
const tsInterface = topNode.body.body
for (const tsNode of tsInterface) {
  if (tsNode.type !== AST_NODE_TYPES.TSPropertySignature) {
    throw new Error(`Unexpected node type: ${tsNode.type}`)
  }

  const intermediaryNode = {
    name: tsNode.key.name,
    required: !tsNode.optional,
  }

  const tsNodeType = tsNode.typeAnnotation.typeAnnotation.type

  if (tsNodeType in AST_NODES_TO_OPEN_RPC_TYPES) {
    intermediaryNode.type = AST_NODES_TO_OPEN_RPC_TYPES[tsNodeType]
  } else if (tsNodeType === AST_NODE_TYPES.TSTypeLiteral) {
    processTypeLiteral()
  } else {
    throw new Error(`Unsupported node type: ${tsNodeType}`)
  }

  intermediaryNodes.push(intermediaryNode)
  // console.log(JSON.stringify(tsNode, null, 2))

  function processTypeLiteral() {
    const innerNode = tsNode.typeAnnotation.typeAnnotation
    // in this case, we have an inline interface
    if (innerNode.members) {
      const componentKey =
        intermediaryNode.name.charAt(0).toUpperCase() +
        intermediaryNode.name.slice(1)
      const intermediaryProperties = []

      for (const memberNode of innerNode.members) {
        const memberName = memberNode.key.name
        const memberOpenRpcType =
          AST_NODES_TO_OPEN_RPC_TYPES[
          memberNode.typeAnnotation.typeAnnotation.type
          ]

        if (!memberOpenRpcType) {
          throw new Error(
            `Unsupported inner node type: ${memberNode.typeAnnotation.typeAnnotation.type}`
          )
        }

        intermediaryProperties.push({
          name: memberName,
          required: !memberNode.optional,
          type: memberOpenRpcType,
        })
      }

      sortIntermediaryNodeObjects(intermediaryProperties)

      openRpcComponents.schemas[componentKey] = getOpenRpcComponentObject(
        intermediaryProperties
      )
      intermediaryNode[REF] = getComponentPathString(componentKey)
    } else {
      throw new Error('Unsupported literal type.')
    }
  }
}

sortIntermediaryNodeObjects(intermediaryNodes)
openRpcComponents.schemas[interfaceName] = getOpenRpcComponentObject(
  intermediaryNodes
)

// Create final OpenRPC object

const openRpc = {
  info: {
    title: methodName,
    version: "0.0.0-development"
  },
  methods: [
    {
      name: methodName,
      params: [
        {
          name: interfaceName,
          description: `The ${interfaceName}`,
          schema: { [REF]: getComponentPathString(interfaceName) },
        },
      ],
    }
  ],
  components: {
    // sort the component schemas alphabetically before adding them
    schemas: Object.keys(openRpcComponents.schemas)
      .sort()
      .reduce((newComponents, key) => {
        newComponents[key] = openRpcComponents.schemas[key]
        return newComponents
      }, {}),
  },
}

// Output

console.log(JSON.stringify(openRpc, null, 2))

//
// Utils
//

/**
 * Gets an OpenRPC component path string.
 */
function getComponentPathString(schemaName) {
  return `#/components/schema/${schemaName}`
}

/**
 * Sort param object property nodes alphabetically and then by required, in place.
 */
function sortIntermediaryNodeObjects(nodeArray) {
  nodeArray.sort((a, b) => a.name.localeCompare(b.name))
  nodeArray.sort((a, b) => Number(b.required) - Number(a.required))
}

/**
 * Gets an OpenRPC component object from an array of intermediary node objects.
 */
function getOpenRpcComponentObject(nodes) {
  const component = {
    type: 'object',
    required: [],
    properties: {},
  }

  nodes.forEach((node) => {
    if (node.required) {
      component.required.push(node.name)
    }

    if (REF in node) {
      component.properties[node.name] = {
        [REF]: node[REF],
      }
    } else {
      component.properties[node.name] = {
        type: node.type,
      }
    }
  })

  return component
}

export default {
  azure: {
    input: './openapi/azure-openai.yaml',
    output: {
      mode: 'tags-split',
      target: './src/generated/azure.ts',
      schemas: './src/generated/schemas',
      client: 'axios'
    }
  }
};

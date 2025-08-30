// 使用 fetch 直接查询 The Graph，不需要 Apollo
const GRAPH_ENDPOINT = import.meta.env.VITE_GRAPH_ENDPOINT_SEPOLIA;

export async function queryGraph(query: string, variables?: any) {
  const response = await fetch(GRAPH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL Error: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(`GraphQL Error: ${JSON.stringify(data.errors)}`);
  }

  return data.data;
}

// 查询定义
export const GRAPH_QUERIES = {
  GET_DATA_RECORDS: `
    query GetDataRecords($first: Int!, $skip: Int!) {
      dataRecords(first: $first, skip: $skip, orderBy: blockNumber, orderDirection: desc) {
        id
        recordId
        sender
        category
        data
        timestamp
        blockNumber
      }
      _meta {
        block {
          number
        }
      }
    }
  `,

  GET_TRANSACTION_RECORDS: `
    query GetTransactionRecords($first: Int!, $skip: Int!) {
      transactionRecords(first: $first, skip: $skip) {
        id
        recordId
        from
        to
        amount
        memo
        timestamp
        blockNumber
      }
    }
  `,
};

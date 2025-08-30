import { ApolloClient, InMemoryCache, gql } from '@apollo/client';

// The Graph 本地节点端点
const GRAPH_ENDPOINT = 'http://localhost:8000/subgraphs/name/datalogger';

export const graphClient = new ApolloClient({
  uri: GRAPH_ENDPOINT,
  cache: new InMemoryCache(),
});

// 查询定义
export const QUERIES = {
  // 获取数据记录
  GET_DATA_RECORDS: gql`
    query GetDataRecords($first: Int!, $skip: Int!, $orderBy: String, $orderDirection: String) {
      dataRecords(
        first: $first
        skip: $skip
        orderBy: $orderBy
        orderDirection: $orderDirection
      ) {
        id
        recordId
        sender
        category
        data
        timestamp
        blockNumber
      }
    }
  `,

  // 获取交易记录
  GET_TRANSACTION_RECORDS: gql`
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

  // 获取元数据
  GET_META: gql`
    query GetMeta {
      _meta {
        block {
          number
          hash
        }
        hasIndexingErrors
      }
    }
  `,

  // 按发送者查询
  GET_RECORDS_BY_SENDER: gql`
    query GetRecordsBySender($sender: String!) {
      dataRecords(where: { sender: $sender }) {
        id
        category
        data
        timestamp
        blockNumber
      }
    }
  `,

  // 按区块范围查询
  GET_RECORDS_BY_BLOCK_RANGE: gql`
    query GetRecordsByBlockRange($startBlock: BigInt!, $endBlock: BigInt!) {
      dataRecords(
        where: { blockNumber_gte: $startBlock, blockNumber_lte: $endBlock }
      ) {
        id
        sender
        category
        data
        blockNumber
        timestamp
      }
    }
  `,
};

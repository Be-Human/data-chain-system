import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * DataLogger 部署模块
 */
const DataLoggerModule = buildModule("DataLoggerModule", (m) => {
  // 部署 DataLogger 合约
  const dataLogger = m.contract("DataLogger");

  // 暂时注释掉初始化调用，避免 nonce 问题
  // m.call(dataLogger, "logData", ["test", "Hello, Blockchain!"]);

  return { dataLogger };
});

export default DataLoggerModule;

import { expect } from "chai";
import { network } from "hardhat";

describe("DataLogger", function () {
  let ethers: any;
  let dataLogger: any;
  let owner: any;
  let user1: any;
  let user2: any;

  before(async function () {
    // 获取 ethers 实例
    ethers = (await network.connect()).ethers;
  });

  beforeEach(async function () {
    // 获取签名者
    [owner, user1, user2] = await ethers.getSigners();

    // 部署合约
    const DataLoggerFactory = await ethers.getContractFactory("DataLogger");
    dataLogger = await DataLoggerFactory.deploy();
    await dataLogger.waitForDeployment();
  });

  describe("数据记录功能", function () {
    it("应该成功记录数据", async function () {
      const category = "user-data";
      const data = "这是测试数据";

      // 记录数据
      await dataLogger.connect(user1).logData(category, data);

      // 获取记录的数据
      const recordIds = await dataLogger.getUserDataRecordIds(user1.address);
      expect(recordIds).to.have.lengthOf(1);

      const record = await dataLogger.getDataRecord(recordIds[0]);
      expect(record.sender).to.equal(user1.address);
      expect(record.category).to.equal(category);
      expect(record.data).to.equal(data);
    });

    it("应该为同一用户记录多条数据", async function () {
      // 记录第一条
      await dataLogger.connect(user1).logData("category1", "data1");
      
      // 记录第二条
      await dataLogger.connect(user1).logData("category2", "data2");

      // 检查记录数量
      const recordIds = await dataLogger.getUserDataRecordIds(user1.address);
      expect(recordIds).to.have.lengthOf(2);

      // 检查总记录数
      const [dataCount] = await dataLogger.getRecordCounts();
      expect(dataCount).to.equal(2n);
    });
  });

  describe("转账记录功能", function () {
    it("应该成功记录带转账的数据", async function () {
      const amount = ethers.parseEther("1.0");
      const memo = "支付测试";

      // 获取初始余额
      const initialBalance = await ethers.provider.getBalance(user2.address);

      // 执行带转账的记录
      await dataLogger.connect(user1).logWithPayment(
        user2.address,
        memo,
        { value: amount }
      );

      // 检查余额变化
      const finalBalance = await ethers.provider.getBalance(user2.address);
      expect(finalBalance).to.equal(initialBalance + amount);

      // 检查记录
      const recordIds = await dataLogger.getUserTransactionRecordIds(user1.address);
      expect(recordIds).to.have.lengthOf(1);

      const record = await dataLogger.getTransactionRecord(recordIds[0]);
      expect(record.from).to.equal(user1.address);
      expect(record.to).to.equal(user2.address);
      expect(record.amount).to.equal(amount);
      expect(record.memo).to.equal(memo);
    });

    it("应该拒绝无转账金额的调用", async function () {
      await expect(
        dataLogger.connect(user1).logWithPayment(user2.address, "test", { value: 0 })
      ).to.be.revertedWith("Must send ETH");
    });

    it("应该拒绝无效地址", async function () {
      await expect(
        dataLogger.connect(user1).logWithPayment(
          ethers.ZeroAddress,
          "test",
          { value: ethers.parseEther("1.0") }
        )
      ).to.be.revertedWith("Invalid recipient");
    });
  });

  describe("查询功能", function () {
    it("应该正确返回记录统计", async function () {
      // 初始状态
      let [dataCount, txCount] = await dataLogger.getRecordCounts();
      expect(dataCount).to.equal(0n);
      expect(txCount).to.equal(0n);

      // 记录一些数据
      await dataLogger.connect(user1).logData("test", "data1");
      await dataLogger.connect(user1).logData("test", "data2");
      await dataLogger.connect(user1).logWithPayment(
        user2.address,
        "payment",
        { value: ethers.parseEther("0.1") }
      );

      // 检查更新后的统计
      [dataCount, txCount] = await dataLogger.getRecordCounts();
      expect(dataCount).to.equal(2n);
      expect(txCount).to.equal(1n);
    });

    it("不同用户的记录应该分开", async function () {
      // user1 记录数据
      await dataLogger.connect(user1).logData("user1", "data");
      
      // user2 记录数据
      await dataLogger.connect(user2).logData("user2", "data");

      // 检查各自的记录
      const user1Records = await dataLogger.getUserDataRecordIds(user1.address);
      const user2Records = await dataLogger.getUserDataRecordIds(user2.address);

      expect(user1Records).to.have.lengthOf(1);
      expect(user2Records).to.have.lengthOf(1);
      expect(user1Records[0]).to.not.equal(user2Records[0]);
    });
  });
});

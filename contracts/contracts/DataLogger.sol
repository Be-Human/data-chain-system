// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title DataLogger
 * @dev 支持两种方式的数据上链：直接日志记录和带转账的记录
 */
contract DataLogger {
    // ========== 状态变量 ==========
    
    uint256 private _recordIdCounter;
    uint256 private _txRecordIdCounter;
    
    // ========== 结构体 ==========
    
    struct DataRecord {
        uint256 id;
        address sender;
        string category;
        string data;
        uint256 timestamp;
        uint256 blockNumber;
    }
    
    struct TransactionRecord {
        uint256 id;
        address from;
        address to;
        uint256 amount;
        string memo;
        uint256 timestamp;
        uint256 blockNumber;
    }
    
    // ========== 映射 ==========
    
    // 用户地址 => 数据记录ID数组
    mapping(address => uint256[]) public userDataRecords;
    
    // 用户地址 => 转账记录ID数组
    mapping(address => uint256[]) public userTransactionRecords;
    
    // 记录ID => 数据记录
    mapping(uint256 => DataRecord) public dataRecords;
    
    // 转账记录ID => 转账记录
    mapping(uint256 => TransactionRecord) public transactionRecords;
    
    // ========== 事件 ==========
    
    event DataStored(
        uint256 indexed recordId,
        address indexed sender,
        string indexed category,
        string data,
        uint256 timestamp
    );
    
    event TransactionLogged(
        uint256 indexed recordId,
        address indexed from,
        address indexed to,
        uint256 amount,
        string memo,
        uint256 timestamp
    );
    
    // ========== 函数 ==========
    
    /**
     * @dev 方式1: 纯日志方式记录数据
     * @param category 数据分类
     * @param data 数据内容
     */
    function logData(string memory category, string memory data) public {
        uint256 recordId = _recordIdCounter++;
        
        DataRecord memory newRecord = DataRecord({
            id: recordId,
            sender: msg.sender,
            category: category,
            data: data,
            timestamp: block.timestamp,
            blockNumber: block.number
        });
        
        dataRecords[recordId] = newRecord;
        userDataRecords[msg.sender].push(recordId);
        
        emit DataStored(
            recordId,
            msg.sender,
            category,
            data,
            block.timestamp
        );
    }
    
    /**
     * @dev 方式2: 带转账的数据记录
     * @param recipient 接收方地址
     * @param memo 转账备注/数据
     */
    function logWithPayment(address payable recipient, string memory memo) public payable {
        require(msg.value > 0, "Must send ETH");
        require(recipient != address(0), "Invalid recipient");
        
        uint256 recordId = _txRecordIdCounter++;
        
        // 执行转账
        (bool success, ) = recipient.call{value: msg.value}("");
        require(success, "Transfer failed");
        
        // 记录转账信息
        TransactionRecord memory newRecord = TransactionRecord({
            id: recordId,
            from: msg.sender,
            to: recipient,
            amount: msg.value,
            memo: memo,
            timestamp: block.timestamp,
            blockNumber: block.number
        });
        
        transactionRecords[recordId] = newRecord;
        userTransactionRecords[msg.sender].push(recordId);
        
        emit TransactionLogged(
            recordId,
            msg.sender,
            recipient,
            msg.value,
            memo,
            block.timestamp
        );
    }
    
    // ========== 查询函数 ==========
    
    /**
     * @dev 获取用户的所有数据记录ID
     */
    function getUserDataRecordIds(address user) public view returns (uint256[] memory) {
        return userDataRecords[user];
    }
    
    /**
     * @dev 获取用户的所有转账记录ID
     */
    function getUserTransactionRecordIds(address user) public view returns (uint256[] memory) {
        return userTransactionRecords[user];
    }
    
    /**
     * @dev 获取数据记录详情
     */
    function getDataRecord(uint256 recordId) public view returns (DataRecord memory) {
        return dataRecords[recordId];
    }
    
    /**
     * @dev 获取转账记录详情
     */
    function getTransactionRecord(uint256 recordId) public view returns (TransactionRecord memory) {
        return transactionRecords[recordId];
    }
    
    /**
     * @dev 获取记录总数
     */
    function getRecordCounts() public view returns (uint256 dataCount, uint256 txCount) {
        return (_recordIdCounter, _txRecordIdCounter);
    }
}

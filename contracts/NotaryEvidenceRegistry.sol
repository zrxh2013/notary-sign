// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title NotaryEvidenceRegistry
 * @author Yip Tse & Tang Solicitors & Notaries
 * @notice 公证书链上存证仓库合约 — 将公证书 SHA-256 指纹永久写入 TRON 链
 *
 * 核心功能：
 *   1. storeEvidence   — 公证人存证（写入指纹 + 证书号 + 元数据）
 *   2. getEvidence     — 公开查询（按证书号或指纹反查）
 *   3. verifyEvidence  — 防伪核验（比对链上指纹 vs 扫码指纹）
 *
 * 存证结构：
 *   evidenceHash   — 公证书综合 SHA-256 指纹（64 hex → bytes32）
 *   certNo         — 公证书编号（如 GZ-GONGZHENG-2026-000001）
 *   notaryId       — 公证人执业证号（如 CAO-HK-D0468）
 *   timestamp      — 上链时间戳
 *   txHash         — 原始缴费交易哈希（关联结算凭证）
 *   isValid        — 存证有效性（公证人可撤销）
 */
contract NotaryEvidenceRegistry {

    /* ========== 存证结构 ========== */
    struct Evidence {
        bytes32  evidenceHash;     // 公证书 SHA-256 综合指纹
        string   certNo;           // 公证书编号
        string   notaryId;         // 公证人执业证号
        uint256  timestamp;        // 上链时间
        bytes32  paymentTxHash;    // 缴费交易哈希（关联结算）
        bool     isValid;          // 存证有效性
        address  storedBy;         // 存证人地址
    }

    /* ========== 授权管理 ========== */
    address public owner;
    mapping(address => bool) public authorizedNotaries;

    /* ========== 索引（双向查询） ========== */
    // certNo → Evidence
    mapping(string => Evidence) private byCertNo;
    // evidenceHash → certNo（反向索引）
    mapping(bytes32 => string) private byHash;

    /* ========== 事件 ========== */
    event EvidenceStored(string indexed certNo, bytes32 indexed evidenceHash, string notaryId, uint256 timestamp);
    event EvidenceRevoked(string indexed certNo, bytes32 indexed evidenceHash, uint256 timestamp);
    event NotaryAuthorized(address indexed notary, bool authorized);

    /* ========== 修饰器 ========== */
    modifier onlyOwner() { require(msg.sender == owner, "NOT_OWNER"); _; }
    modifier onlyNotary() { require(authorizedNotaries[msg.sender], "NOT_AUTHORIZED_NOTARY"); _; }

    /* ========== 构造函数 ========== */
    constructor() {
        owner = msg.sender;
        authorizedNotaries[msg.sender] = true;
        emit NotaryAuthorized(msg.sender, true);
    }

    /* ========== 授权管理 ========== */
    function authorizeNotary(address notary) external onlyOwner {
        authorizedNotaries[notary] = true;
        emit NotaryAuthorized(notary, true);
    }
    function revokeNotary(address notary) external onlyOwner {
        authorizedNotaries[notary] = false;
        emit NotaryAuthorized(notary, false);
    }

    /* ========== 核心方法 1：存证 ========== */
    /**
     * @notice 公证人存证 — 将公证书指纹写入链上
     * @param evidenceHash  公证书 SHA-256 综合指纹（bytes32）
     * @param certNo        公证书编号
     * @param notaryId      公证人执业证号
     * @param paymentTxHash 缴费交易哈希（bytes32，关联结算凭证）
     */
    function storeEvidence(
        bytes32 evidenceHash,
        string calldata certNo,
        string calldata notaryId,
        bytes32 paymentTxHash
    ) external onlyNotary {
        // 防重复：同一证书号不可重复存证
        require(byCertNo[certNo].evidenceHash != bytes32(0), "CERT_ALREADY_STORED");
        // 指纹非零
        require(evidenceHash != bytes32(0), "HASH_ZERO");

        byCertNo[certNo] = Evidence({
            evidenceHash:  evidenceHash,
            certNo:        certNo,
            notaryId:      notaryId,
            timestamp:     block.timestamp,
            paymentTxHash: paymentTxHash,
            isValid:       true,
            storedBy:      msg.sender
        });
        byHash[evidenceHash] = certNo;

        emit EvidenceStored(certNo, evidenceHash, notaryId, block.timestamp);
    }

    /* ========== 核心方法 2：查询（按证书号） ========== */
    function getEvidence(string calldata certNo) external view returns (
        bytes32 evidenceHash,
        string memory notaryId,
        uint256 timestamp,
        bytes32 paymentTxHash,
        bool isValid,
        address storedBy
    ) {
        Evidence storage e = byCertNo[certNo];
        return (e.evidenceHash, e.notaryId, e.timestamp, e.paymentTxHash, e.isValid, e.storedBy);
    }

    /* ========== 核心方法 3：查询（按指纹反查证书号） ========== */
    function getCertNoByHash(bytes32 evidenceHash) external view returns (string memory certNo) {
        return byHash[evidenceHash];
    }

    /* ========== 核心方法 4：防伪核验 ========== */
    /**
     * @notice 核验：扫码指纹 vs 链上指纹是否匹配
     * @return verified  是否匹配
     * @return certNo    匹配的证书号
     */
    function verifyEvidence(bytes32 evidenceHash) external view returns (bool verified, string memory certNo) {
        string memory cn = byHash[evidenceHash];
        if (bytes(cn).length == 0) {
            return (false, "");
        }
        return (byCertNo[cn].isValid, cn);
    }

    /* ========== 核心方法 5：撤销存证（公证人操作） ========== */
    function revokeEvidence(string calldata certNo) external onlyNotary {
        require(byCertNo[certNo].evidenceHash != bytes32(0), "CERT_NOT_FOUND");
        byCertNo[certNo].isValid = false;
        emit EvidenceRevoked(certNo, byCertNo[certNo].evidenceHash, block.timestamp);
    }

    /* ========== 存证计数 ========== */
    function evidenceExists(string calldata certNo) external view returns (bool) {
        return byCertNo[certNo].evidenceHash != bytes32(0);
    }
}

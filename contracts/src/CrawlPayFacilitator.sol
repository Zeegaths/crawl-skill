// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/**
 * @title CrawlPayFacilitator
 * @notice Settles x402 pay-per-fetch payments on Pharos and emits
 *         verifiable reputation signals compatible with Anvita Flow's
 *         KYA (Know Your Agent) framework.
 *
 * Flow:
 *   1. Crawler agent signs an EIP-3009 TransferWithAuthorization off-chain
 *   2. Facilitator server calls settle() with the authorization
 *   3. Contract verifies the signature, records reputation, emits events
 *   4. Facilitator server signs and returns a CrawlPayReceipt to the crawler
 */
contract CrawlPayFacilitator {

    // ── State ────────────────────────────────────────────────────────────────

    address public immutable owner;
    address public immutable usdcToken;  // USDC on Pharos Atlantic

    struct AgentReputation {
        uint256 fetchCount;
        uint256 totalSpent;   // atomic USDC (6 decimals)
        uint256 firstSeen;    // unix timestamp
        uint256 lastSeen;     // unix timestamp
    }

    // agent address → reputation
    mapping(address => AgentReputation) public reputation;

    // nonce → used (replay protection)
    mapping(bytes32 => bool) public usedNonces;

    // ── Events ───────────────────────────────────────────────────────────────

    /// @notice Emitted on every successful paid fetch
    event FetchAuthorized(
        address indexed agent,
        address indexed publisher,
        bytes32 indexed urlHash,
        uint256 amount,
        bytes32 nonce,
        uint256 timestamp
    );

    /// @notice Emitted when an agent's reputation is updated
    event ReputationUpdated(
        address indexed agent,
        uint256 fetchCount,
        uint256 totalSpent
    );

    // ── Errors ───────────────────────────────────────────────────────────────

    error NonceAlreadyUsed(bytes32 nonce);
    error InvalidSignature();
    error ZeroAmount();
    error Unauthorized();

    // ── Constructor ──────────────────────────────────────────────────────────

    constructor(address _usdcToken) {
        owner = msg.sender;
        usdcToken = _usdcToken;
    }

    // ── Core: settle ─────────────────────────────────────────────────────────

    /**
     * @notice Settle a pay-per-fetch authorization.
     * @param agent         Crawler agent's EOA address
     * @param publisher     Publisher's wallet address
     * @param urlHash       keccak256 of the fetched URL + timestamp
     * @param amount        Payment in atomic USDC (e.g. 100 = $0.0001)
     * @param nonce         EIP-3009 nonce (32 random bytes, single-use)
     * @param timestamp     Unix timestamp of the fetch
     * @param signature     ECDSA signature over the settlement hash
     */
    function settle(
        address agent,
        address publisher,
        bytes32 urlHash,
        uint256 amount,
        bytes32 nonce,
        uint256 timestamp,
        bytes calldata signature
    ) external {
        // Guards
        if (amount == 0) revert ZeroAmount();
        if (usedNonces[nonce]) revert NonceAlreadyUsed(nonce);

        // Verify signature — agent must have signed the settlement hash
        bytes32 settlementHash = keccak256(abi.encodePacked(
            agent,
            publisher,
            urlHash,
            amount,
            nonce,
            timestamp,
            block.chainid
        ));
        address recovered = _recoverSigner(settlementHash, signature);
        if (recovered != agent) revert InvalidSignature();

        // Mark nonce used
        usedNonces[nonce] = true;

        // Update reputation
        AgentReputation storage rep = reputation[agent];
        if (rep.firstSeen == 0) rep.firstSeen = timestamp;
        rep.fetchCount += 1;
        rep.totalSpent += amount;
        rep.lastSeen = timestamp;

        // Emit events
        emit FetchAuthorized(agent, publisher, urlHash, amount, nonce, timestamp);
        emit ReputationUpdated(agent, rep.fetchCount, rep.totalSpent);
    }

    // ── View: KYA-compatible reputation query ────────────────────────────────

    /**
     * @notice Returns an agent's payment reputation.
     *         Compatible with Anvita Flow's KYA agent verification pattern.
     * @param agent  The agent address to query
     */
    function getReputation(address agent)
        external
        view
        returns (
            uint256 fetchCount,
            uint256 totalSpent,
            uint256 firstSeen,
            uint256 lastSeen
        )
    {
        AgentReputation memory rep = reputation[agent];
        return (rep.fetchCount, rep.totalSpent, rep.firstSeen, rep.lastSeen);
    }

    /**
     * @notice Returns true if an agent has made at least minFetches paid fetches.
     *         Useful for publisher access-gating: only allow high-rep agents.
     */
    function isVerifiedAgent(address agent, uint256 minFetches)
        external
        view
        returns (bool)
    {
        return reputation[agent].fetchCount >= minFetches;
    }

    // ── Internal ─────────────────────────────────────────────────────────────

    function _recoverSigner(bytes32 hash, bytes calldata sig)
        internal
        pure
        returns (address)
    {
        bytes32 ethHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );
        if (sig.length != 65) revert InvalidSignature();
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        if (v < 27) v += 27;
        address recovered = ecrecover(ethHash, v, r, s);
        if (recovered == address(0)) revert InvalidSignature();
        return recovered;
    }
}

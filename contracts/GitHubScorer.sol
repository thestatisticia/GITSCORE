// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title GitHubScorer
 * @dev Smart contract for storing GitHub profile scores on Flare Testnet
 * Integrates with Flare Data Connector (FDC) for verified data
 */
contract GitHubScorer {
    // Structure to store score data
    struct ScoreData {
        uint256 score;
        uint256 timestamp;
        bool fdcVerified; // Flag to indicate if score was verified via FDC
        bytes32 fdcAttestationId; // FDC attestation ID for verification
    }
    
    // Mapping: walletAddress => githubUsername => ScoreData
    mapping(address => mapping(string => ScoreData)) public scores;
    
    // Mapping: walletAddress => latest githubUsername
    mapping(address => string) public userLatestUsername;
    
    // Array to track all wallet addresses that have stored scores (for leaderboard)
    address[] public scoreAddresses;
    mapping(address => bool) public hasStoredScore;
    
    // FDC verification: mapping from attestation ID to score data
    mapping(bytes32 => bool) public fdcAttestations;
    
    // Owner/admin address (can be set during deployment)
    address public owner;
    
    // Events
    event ScoreStored(
        address indexed walletAddress,
        string indexed githubUsername,
        uint256 score,
        uint256 timestamp,
        bool fdcVerified,
        bytes32 fdcAttestationId
    );
    
    event FdcScoreStored(
        address indexed walletAddress,
        string indexed githubUsername,
        uint256 score,
        bytes32 indexed fdcAttestationId
    );
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
    /**
     * @dev Store a GitHub score for a wallet address (standard method)
     * @param walletAddress The wallet address storing the score
     * @param githubUsername The GitHub username
     * @param score The calculated score (0-1000)
     * @param timestamp The timestamp when score was calculated
     */
    function storeScore(
        address walletAddress,
        string memory githubUsername,
        uint256 score,
        uint256 timestamp
    ) public {
        require(bytes(githubUsername).length > 0, "GitHub username cannot be empty");
        require(score <= 1000, "Score must be between 0 and 1000");
        
        scores[walletAddress][githubUsername] = ScoreData({
            score: score,
            timestamp: timestamp,
            fdcVerified: false,
            fdcAttestationId: bytes32(0)
        });
        
        userLatestUsername[walletAddress] = githubUsername;
        
        // Track address for leaderboard
        if (!hasStoredScore[walletAddress]) {
            scoreAddresses.push(walletAddress);
            hasStoredScore[walletAddress] = true;
        }
        
        emit ScoreStored(walletAddress, githubUsername, score, timestamp, false, bytes32(0));
    }
    
    /**
     * @dev Store a GitHub score verified via Flare Data Connector (FDC)
     * @param walletAddress The wallet address storing the score
     * @param githubUsername The GitHub username
     * @param score The calculated score (0-1000) - verified by FDC
     * @param timestamp The timestamp when score was calculated
     * @param fdcAttestationId The FDC attestation ID for this verified data
     */
    function storeFdcVerifiedScore(
        address walletAddress,
        string memory githubUsername,
        uint256 score,
        uint256 timestamp,
        bytes32 fdcAttestationId
    ) public onlyOwner {
        require(bytes(githubUsername).length > 0, "GitHub username cannot be empty");
        require(score <= 1000, "Score must be between 0 and 1000");
        require(fdcAttestationId != bytes32(0), "FDC attestation ID cannot be zero");
        require(!fdcAttestations[fdcAttestationId], "FDC attestation already used");
        
        // Mark attestation as used
        fdcAttestations[fdcAttestationId] = true;
        
        scores[walletAddress][githubUsername] = ScoreData({
            score: score,
            timestamp: timestamp,
            fdcVerified: true,
            fdcAttestationId: fdcAttestationId
        });
        
        userLatestUsername[walletAddress] = githubUsername;
        
        // Track address for leaderboard
        if (!hasStoredScore[walletAddress]) {
            scoreAddresses.push(walletAddress);
            hasStoredScore[walletAddress] = true;
        }
        
        emit ScoreStored(walletAddress, githubUsername, score, timestamp, true, fdcAttestationId);
        emit FdcScoreStored(walletAddress, githubUsername, score, fdcAttestationId);
    }
    
    /**
     * @dev Get score for a specific wallet and GitHub username
     * @param walletAddress The wallet address
     * @param githubUsername The GitHub username
     * @return score The stored score
     * @return timestamp The timestamp when score was stored
     */
    function getScore(
        address walletAddress,
        string memory githubUsername
    ) public view returns (uint256 score, uint256 timestamp) {
        ScoreData memory data = scores[walletAddress][githubUsername];
        return (data.score, data.timestamp);
    }
    
    /**
     * @dev Get the latest score for a wallet address
     * @param walletAddress The wallet address
     * @return githubUsername The GitHub username
     * @return score The stored score
     * @return timestamp The timestamp when score was stored
     */
    function getUserLatestScore(
        address walletAddress
    ) public view returns (string memory githubUsername, uint256 score, uint256 timestamp) {
        string memory username = userLatestUsername[walletAddress];
        require(bytes(username).length > 0, "No score found for this wallet");
        
        ScoreData memory data = scores[walletAddress][username];
        return (username, data.score, data.timestamp);
    }
    
    /**
     * @dev Check if a score exists for a wallet and GitHub username
     * @param walletAddress The wallet address
     * @param githubUsername The GitHub username
     * @return exists True if score exists
     */
    function scoreExists(
        address walletAddress,
        string memory githubUsername
    ) public view returns (bool exists) {
        return scores[walletAddress][githubUsername].timestamp > 0;
    }
    
    /**
     * @dev Get total number of addresses with stored scores
     * @return count Total number of addresses
     */
    function getScoreAddressesCount() public view returns (uint256 count) {
        return scoreAddresses.length;
    }
    
    /**
     * @dev Get address at index (for leaderboard iteration)
     * @param index The index in the scoreAddresses array
     * @return walletAddress The wallet address
     */
    function getScoreAddress(uint256 index) public view returns (address walletAddress) {
        require(index < scoreAddresses.length, "Index out of bounds");
        return scoreAddresses[index];
    }
    
    /**
     * @dev Check if a score is FDC verified
     * @param walletAddress The wallet address
     * @param githubUsername The GitHub username
     * @return verified True if score is FDC verified
     * @return attestationId The FDC attestation ID if verified
     */
    function isFdcVerified(
        address walletAddress,
        string memory githubUsername
    ) public view returns (bool verified, bytes32 attestationId) {
        ScoreData memory data = scores[walletAddress][githubUsername];
        return (data.fdcVerified, data.fdcAttestationId);
    }
}


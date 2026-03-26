// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SkillCredential
 * @dev Stores and verifies Keccak-256 hashes of certificates for the SIH25200 TrustChain platform.
 */
contract SkillCredential {
    struct Credential {
        bytes32 certHash;      // Keccak-256 hash of the certificate
        string studentId;      // Student's unique identifier
        string ipfsLink;       // Link to the certificate on IPFS or Firebase Storage
        uint256 timestamp;     // When the credential was minted
        address issuer;        // Address that minted the credential
        bool exists;           // Flag to check if credential exists
    }

    // Mapping from certHash to Credential details
    mapping(bytes32 => Credential) public credentials;

    // Mapping from studentId to their list of certHashes
    mapping(string => bytes32[]) public studentCredentials;

    event CredentialMinted(bytes32 indexed certHash, string studentId, address indexed issuer);

    /**
     * @dev Mints a new credential hash on the blockchain.
     * @param _certHash The Keccak-256 hash of the certificate.
     * @param _studentId The student's ID.
     * @param _ipfsLink The link to the certificate.
     */
    function mintCredential(bytes32 _certHash, string memory _studentId, string memory _ipfsLink) public {
        require(!credentials[_certHash].exists, "Credential already exists.");

        credentials[_certHash] = Credential({
            certHash: _certHash,
            studentId: _studentId,
            ipfsLink: _ipfsLink,
            timestamp: block.timestamp,
            issuer: msg.sender,
            exists: true
        });

        studentCredentials[_studentId].push(_certHash);

        emit CredentialMinted(_certHash, _studentId, msg.sender);
    }

    /**
     * @dev Verifies if a certificate hash exists on the blockchain.
     * @param _certHash The hash to verify.
     * @return bool True if the hash exists, false otherwise.
     */
    function verifyCredential(bytes32 _certHash) public view returns (bool) {
        return credentials[_certHash].exists;
    }

    /**
     * @dev Gets all credentials for a specific student.
     * @param _studentId The student's ID.
     * @return bytes32[] Array of certificate hashes.
     */
    function getStudentCredentials(string memory _studentId) public view returns (bytes32[] memory) {
        return studentCredentials[_studentId];
    }
}

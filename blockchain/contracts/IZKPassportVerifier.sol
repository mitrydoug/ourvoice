// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

struct ProofVerificationData {
  bytes32 vkeyHash;
  bytes proof;
  bytes32[] publicInputs;
}

struct Commitments {
  bytes committedInputs;
  uint256[] committedInputCounts;
}

struct ServiceConfig {
  uint256 validityPeriodInSeconds;
  string domain;
  string scope;
  bool devMode;
}

// Group parameters for the proof verification
//
// publicInputs:
// - 0: certificate_registry_root: pub Field,
// - 1: circuit_registry_root: pub Field,
// - 2: current_date: pub u64,
// - 3: service_scope: pub Field,
// - 4: service_subscope: pub Field,
// - 5:5+N: param_commitments: pub [Field; N],
// - 5+N: nullifier_type: pub u8,
// - 6+N: scoped_nullifier: pub Field,
//
// committedInputs: the preimages of the `param_commitments` of the disclosure proofs.
// committedInputCounts: offsets to locate the committedInputs of each of the param_commitments of the public_inputs.
struct ProofVerificationParams {
  ProofVerificationData proofVerificationData;
  Commitments commitments;
  ServiceConfig serviceConfig;
}

struct DisclosedData {
    string name;
    string issuingCountry;
    string nationality;
    string gender;
    string birthDate;
    string expiryDate;
    string documentNumber;
    string documentType;
}

struct BoundData {
  address senderAddress;
  uint256 chainId;
  string customData;
}

/**
 * @notice The public interface for the ZKPassport verifier contract
 */
interface IZKPassportVerifier {

  /**
   * @notice Verifies a proof from ZKPassport
   * @param params The proof verification parameters
   * @return verified True if the proof is valid, false otherwise
   * @return uniqueIdentifier The unique identifier associated to the identity document that generated the proof
   */
  function verifyProof(ProofVerificationParams calldata params) external returns (bool verified, bytes32 uniqueIdentifier);

  /**
   * @notice Verifies that the proof was generated for the given domain and scope
   * @param publicInputs The public inputs of the proof
   * @param domain The domain to check against
   * @param scope The scope to check against
   * @return True if the proof was generated for the given domain and scope, false otherwise
   */
  function verifyScopes(
    bytes32[] calldata publicInputs,
    string calldata domain,
    string calldata scope
  ) external pure returns (bool);


  // ===== Helper functions to get the information revealed by the proof =====

  // ===== Retrieve the disclosed data =====

  /**
   * @notice Gets the data disclosed by the proof
   * @param commitments The commitments
   * @param isIDCard Whether the proof is an ID card
   * @return disclosedData The data disclosed by the proof
   */
  function getDisclosedData(    
    Commitments calldata commitments,
    bool isIDCard
  ) external pure returns (DisclosedData memory disclosedData);


  // ===== Retrieve the bound data =====

  /**
   * @notice Gets the data bound to the proof
   * @param commitments The commitments
   * @return boundData The data bound to the proof
   */
  function getBoundData(
    Commitments calldata commitments
  ) external pure returns (BoundData memory boundData);

}
pragma solidity ^0.8.21;

/**
 * @notice The data that can be bound to the proof
 */
struct BoundData {
  // The address of the ID holder
  userAddress: address;
  // The chain id (block.chainid)
  chainId: uint256;
  // The custom data (encoded as ASCII string)
  customData: string;
}

/**
 * @notice The data that can be disclosed by the proof
 */
struct DisclosedData {
    // The name of the ID holder (includes the angular brackets from the MRZ)
    string name;
    // The issuing country of the ID
    string issuingCountry;
    // The nationality of the ID holder
    string nationality;
    // The gender of the ID holder
    string gender;
    // The birth date of the ID holder
    string birthDate;
    // The expiry date of the ID
    string expiryDate;
    // The document number of the ID
    string documentNumber;
    // The type of the document
    string documentType;
}

/**
 * @notice The parameters for verifying a proof
 * @dev this can be retrieved with the getSolidityVerifierParameters function in the SDK
 */
struct ProofVerificationParams {
  bytes32 vkeyHash;
  bytes proof;
  bytes32[] publicInputs;
  bytes committedInputs;
  uint256[] committedInputCounts;
  uint256 validityPeriodInSeconds;
  string domain;
  string scope;
  bool devMode;
}

/**
 * @notice The public interface for the ZKPassport verifier contract
 */
interface IZKPassportVerifier {
  /**
   * @notice Verifies a proof from ZKPassport
   * @param params The proof verification parameters
   * @return isValid True if the proof is valid, false otherwise
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
  function verifyScopes(bytes32[] calldata publicInputs, string calldata domain, string calldata scope) external view returns (bool);

  // ===== Helper functions to get the information revealed by the proof =====

  // ===== Retrieve the disclosed data =====

  /**
   * @notice Gets the data disclosed by the proof
   * @param params The proof verification parameters
   * @param isIDCard Whether the proof is from an ID card
   * @return disclosedData The data disclosed by the proof
   */
  function getDisclosedData(
    ProofVerificationParams calldata params,
    bool isIDCard
  ) external view returns (DisclosedData);


  // ===== Retrieve the bound data =====

  /**
   * @notice Gets the data bound to the proof
   * @param params The proof verification parameters
   * @return boundData The data bound to the proof
   */
  function getBoundData(ProofVerificationParams calldata params) external view returns (BoundData);

  // ===== Age verification =====

  /**
   * @notice Checks if the age is above or equal to the given age
   * @param minAge The age must be above or equal to this age
   * @param params The proof verification parameters
   * @return True if the age is above or equal to the given age, false otherwise
   */
  function isAgeAboveOrEqual(
    uint8 minAge,
    ProofVerificationParams calldata params
  ) external view returns (bool);

  /**
   * @notice Checks if the age is above the given age
   * @param minAge The age must be above this age
   * @param params The proof verification parameters
   * @return True if the age is above the given age, false otherwise
   */
  function isAgeAbove(
    uint8 minAge,
    ProofVerificationParams calldata params
  ) external view returns (bool);

  /**
   * @notice Checks if the age is in the given range
   * @param minAge The age must be greater than or equal to this age
   * @param maxAge The age must be less than or equal to this age
   * @param params The proof verification parameters
   * @return True if the age is in the given range, false otherwise
   */
  function isAgeBetween(
    uint8 minAge,
    uint8 maxAge,
    ProofVerificationParams calldata params
  ) external view returns (bool);

  /**
   * @notice Checks if the age is below or equal to the given age
   * @param maxAge The age must be below or equal to this age
   * @param params The proof verification parameters
   * @return True if the age is below or equal to the given age, false otherwise
   */
  function isAgeBelowOrEqual(
    uint8 maxAge,
    ProofVerificationParams calldata params
  ) external view returns (bool);

  /**
   * @notice Checks if the age is below the given age
   * @param maxAge The age must be below this age
   * @param params The proof verification parameters
   * @return True if the age is below the given age, false otherwise
   */
  function isAgeBelow(
    uint8 maxAge,
    ProofVerificationParams calldata params
  ) external view returns (bool);

  /**
   * @notice Checks if the age is equal to the given age
   * @param age The age must be equal to this age
   * @param params The proof verification parameters
   * @return True if the age is equal to the given age, false otherwise
   */
  function isAgeEqual(
    uint8 age,
    ProofVerificationParams calldata params
  ) external view returns (bool);

  // ===== Birthdate comparison =====

  /**
   * @notice Checks if the birthdate is after or equal to the given date
   * @param minDate The birthdate must be after or equal to this date
   * @param params The proof verification parameters
   * @return True if the birthdate is after or equal to the given date, false otherwise
   */
  function isBirthdateAfterOrEqual(
    uint256 minDate,
    ProofVerificationParams calldata params
  ) external view returns (bool);

  /**
   * @notice Checks if the birthdate is after the given date
   * @param minDate The birthdate must be after this date
   * @param params The proof verification parameters
   * @return True if the birthdate is after the given date, false otherwise
   */
  function isBirthdateAfter(
    uint256 minDate,
    ProofVerificationParams calldata params
  ) external view returns (bool);

  /**
   * @notice Checks if the birthdate is between the given dates
   * @param minDate The birthdate must be after or equal to this date
   * @param maxDate The birthdate must be before or equal to this date
   * @param params The proof verification parameters
   * @return True if the birthdate is between the given dates, false otherwise
   */
  function isBirthdateBetween(
    uint256 minDate,
    uint256 maxDate,
    ProofVerificationParams calldata params
  ) external view returns (bool);

  /**
   * @notice Checks if the birthdate is before or equal to the given date
   * @param maxDate The birthdate must be before or equal to this date
   * @param params The proof verification parameters
   * @return True if the birthdate is before or equal to the given date, false otherwise
   */
  function isBirthdateBeforeOrEqual(
    uint256 maxDate,
    ProofVerificationParams calldata params
  ) external view returns (bool);

  /**
   * @notice Checks if the birthdate is before the given date
   * @param maxDate The birthdate must be before this date
   * @param params The proof verification parameters
   * @return True if the birthdate is before the given date, false otherwise
   */
  function isBirthdateBefore(
    uint256 maxDate,
      ProofVerificationParams calldata params
  ) public view returns (bool);

  /**
   * @notice Checks if the birthdate is equal to the given date
   * @param date The birthdate must be equal to this date
   * @param params The proof verification parameters
   * @return True if the birthdate is equal to the given date, false otherwise
   */
  function isBirthdateEqual(
    uint256 date,
    ProofVerificationParams calldata params
  ) external view returns (bool);

  // ===== Expiry date comparison =====

  /**
   * @notice Checks if the expiry date is after or equal to the given date
   * @param minDate The expiry date must be after or equal to this date
   * @param params The proof verification parameters
   * @return True if the expiry date is after or equal to the given date, false otherwise
   */
  function isExpiryDateAfterOrEqual(
    uint256 minDate,
    ProofVerificationParams calldata params
  ) public view returns (bool);

  /**
   * @notice Checks if the expiry date is after the given date
   * @param minDate The expiry date must be after this date
   * @param params The proof verification parameters
   * @return True if the expiry date is after the given date, false otherwise
   */
  function isExpiryDateAfter(
    uint256 minDate,
    ProofVerificationParams calldata params
  ) external view returns (bool);

  /**
   * @notice Checks if the expiry date is between the given dates
   * @param minDate The expiry date must be after or equal to this date
   * @param maxDate The expiry date must be before or equal to this date
   * @param params The proof verification parameters
   * @return True if the expiry date is between the given dates, false otherwise
   */
  function isExpiryDateBetween(
    uint256 minDate,
    uint256 maxDate,
    ProofVerificationParams calldata params
  ) external view returns (bool);

  /**
   * @notice Checks if the expiry date is before or equal to the given date
   * @param maxDate The expiry date must be before or equal to this date
   * @param params The proof verification parameters
   * @return True if the expiry date is before or equal to the given date, false otherwise
   */
  function isExpiryDateBeforeOrEqual(
    uint256 maxDate,
    ProofVerificationParams calldata params
  ) external view returns (bool);

  /**
   * @notice Checks if the expiry date is before the given date
   * @param maxDate The expiry date must be before this date
   * @param params The proof verification parameters
   * @return True if the expiry date is before the given date, false otherwise
   */
  function isExpiryDateBefore(
    uint256 maxDate,
    ProofVerificationParams calldata params
  ) external view returns (bool);

  /**
   * @notice Checks if the expiry date is equal to the given date
   * @param date The expiry date must be equal to this date
   * @param params The proof verification parameters
   * @return True if the expiry date is equal to the given date, false otherwise
   */
  function isExpiryDateEqual(
    uint256 date,
    ProofVerificationParams calldata params
  ) external view returns (bool);

  // ===== Country inclusion =====

  /**
   * @notice Checks if the nationality is in the list of countries
   * @param countryList The list of countries (needs to match exactly the list of countries in the proof)
   * @param params The proof verification parameters
   * @return True if the nationality is in the list of countries, false otherwise
   */
  function isNationalityIn(
    string[] memory countryList,
    ProofVerificationParams calldata params
  ) external pure returns (bool);

  /**
   * @notice Checks if the issuing country is in the list of countries
   * @param countryList The list of countries (needs to match exactly the list of countries in the proof)
   * @param params The proof verification parameters
   * @return True if the issuing country is in the list of countries, false otherwise
   */
  function isIssuingCountryIn(
    string[] memory countryList,
    ProofVerificationParams calldata params
  ) external pure returns (bool);

  // ===== Country exclusion =====

  /**
   * @notice Checks if the nationality is not in the list of countries
   * @param countryList The list of countries (needs to match exactly the list of countries in the proof)
   * Note: The list of countries must be sorted in alphabetical order
   * @param params The proof verification parameters
   * @return True if the nationality is not in the list of countries, false otherwise
   */
  function isNationalityOut(
    string[] memory countryList,
    ProofVerificationParams calldata params
  ) external pure returns (bool);

  /**
   * @notice Checks if the issuing country is not in the list of countries
   * @param countryList The list of countries (needs to match exactly the list of countries in the proof)
   * Note: The list of countries must be sorted in alphabetical order
   * @param params The proof verification parameters
   * @return True if the issuing country is not in the list of countries, false otherwise
   */
  function isIssuingCountryOut(
    string[] memory countryList,
    ProofVerificationParams calldata params
  ) external pure returns (bool);

  // ===== Sanction checks =====
  /**
   * @notice Enforces that the proof checks against the expected sanction list(s)
   * @param params The proof verification parameters
   */
  function enforceSanctionsRoot(
    ProofVerificationParams calldata params
  ) external view;
}
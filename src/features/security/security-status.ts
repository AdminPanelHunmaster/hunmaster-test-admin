export type SecurityStatus = "Protected" | "Attention Required" | "Emergency Mode";

export type SecurityStatusInput = {
  emergencyMode: boolean;
  unprotectedTableCount: number;
  anonymousUnrestrictedWrites: number;
  anonymousSecurityDefinerFunctions: number;
  mutableAuditPolicies: number;
  activeOwnerCount: number;
  ownerMfaMissing: boolean;
  sourceFindingCount: number;
  providerAuthHardeningVerified: boolean;
};

export function evaluateSecurityStatus(input: SecurityStatusInput): SecurityStatus {
  if (input.emergencyMode) return "Emergency Mode";

  const attentionRequired =
    input.unprotectedTableCount > 0 ||
    input.anonymousUnrestrictedWrites > 0 ||
    input.anonymousSecurityDefinerFunctions > 0 ||
    input.mutableAuditPolicies > 0 ||
    input.activeOwnerCount !== 1 ||
    input.ownerMfaMissing ||
    input.sourceFindingCount > 0 ||
    !input.providerAuthHardeningVerified;

  return attentionRequired ? "Attention Required" : "Protected";
}

import { describe, expect, it } from "vitest";
import { evaluateSecurityStatus, type SecurityStatusInput } from "./security-status";

const protectedInput: SecurityStatusInput = {
  emergencyMode: false,
  unprotectedTableCount: 0,
  anonymousUnrestrictedWrites: 0,
  anonymousSecurityDefinerFunctions: 0,
  mutableAuditPolicies: 0,
  activeOwnerCount: 1,
  ownerMfaMissing: false,
  sourceFindingCount: 0,
  providerAuthHardeningVerified: true,
};

describe("evaluateSecurityStatus", () => {
  it("reports the normal state as protected", () => {
    expect(evaluateSecurityStatus(protectedInput)).toBe("Protected");
  });

  it("reports a real warning signal as attention required", () => {
    expect(evaluateSecurityStatus({ ...protectedInput, ownerMfaMissing: true })).toBe(
      "Attention Required",
    );
  });

  it("always prioritizes emergency mode", () => {
    expect(
      evaluateSecurityStatus({
        ...protectedInput,
        emergencyMode: true,
        anonymousUnrestrictedWrites: 2,
      }),
    ).toBe("Emergency Mode");
  });
});

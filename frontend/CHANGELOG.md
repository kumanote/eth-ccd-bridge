## Unreleased

### Added
- Environment variables for configuring access to a node's grpc interface. This is a temporary requirement, as the functionality this is needed for will be exposed by the concordium browser wallet at a later point in time.

### Changes
- For withdrawals, the expected time of the next merkle root, i.e. when the next round of withdrawals will be ready for approval, is now displayed instead of statically showing 10 minute processing time.
- Provide a full overview of the transactions (and corresponding fees) required to execute a full withdrawal/desposit.

### Fixes
- A number of minor bugs

## 0.1.0

Initial version.

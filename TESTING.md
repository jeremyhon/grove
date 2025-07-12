# Grove Testing Guide

This document outlines testing best practices and technical guidelines for Grove development.

## Testing Architecture

Grove uses a systematic testing approach with proper separation of concerns:

- **Log service tests**: Mock process streams to test actual logging behavior
- **Command tests**: Mock log service to focus on command logic
- **Service tests**: Test business logic with appropriate mocking
- **Integration tests**: Test full workflows with real components

## Technical Guidelines

### ESM Module Mocking in Bun (2025)

Use Bun's native `mock.module()` API for mocking ES modules:

```ts
import { mock } from "bun:test";

// Mock an entire module
mock.module("../src/services/log.service.js", () => ({
  createLogService: mock(() => mockLogService),
  LogService: mock().mockImplementation(() => mockLogService)
}));
```

**Key Features:**
- Native ESM support with live bindings
- Automatic path resolution (relative/absolute paths)
- Auto-restore between tests
- No need for manual teardown in most cases

### Test Utilities

Grove provides reusable test utilities in `tests/test-utils.ts`:

```ts
import { setupTestRepo, teardownTestRepo, createMockLogService, mockServices } from "./test-utils.js";

beforeEach(async () => {
  // Creates clean git repo with Grove initialization
  testRepo = await setupTestRepo();
  
  // Mock log service using Bun's mock.module()
  mockLogService = createMockLogService();
  mockLogService.setup();
  
  // Mock other services to prevent side effects
  mockedServices = await mockServices();
});

afterEach(async () => {
  // Clean up all mocks and test data
  mockLogService.teardown();
  mockedServices.restore();
  await testRepo.cleanup();
});
```

### Test Repository Pattern

All tests use a standardized test repository:

- **Name**: `grove-test-repo`
- **Location**: Same directory as main project
- **Cleanup**: Automatic removal of repo and all worktree directories
- **Isolation**: Each test starts with completely clean state

**Benefits:**
- Deterministic test behavior
- No cross-test contamination
- Realistic git operations
- Scalable across multiple test files

### Stream Mocking for Log Service

Log service tests mock process streams directly:

```ts
beforeEach(() => {
  // Save original streams
  originalStderr = process.stderr.write;
  originalStdout = process.stdout.write;
  
  // Mock with capture arrays
  process.stderr.write = mock((chunk: any) => {
    stderrOutput.push(chunk.toString());
    return true;
  }) as any;
  
  process.stdout.write = mock((chunk: any) => {
    stdoutOutput.push(chunk.toString());
    return true;
  }) as any;
});

afterEach(() => {
  // Restore original streams
  process.stderr.write = originalStderr;
  process.stdout.write = originalStdout;
});
```

This approach tests the actual logging implementation while keeping command tests focused on business logic.

### Best Practices

#### Deterministic State
- Always clean up completely between tests
- Never use try-catch for expected operations
- Ensure each test starts from identical state

#### Appropriate Mocking Levels
- **Process streams**: Only in log service tests
- **Log service**: In command and integration tests
- **External services**: Mock to prevent side effects
- **File system**: Use real operations in test directories

#### Reusable Utilities
- Create shared setup/teardown functions
- Build helper assertions for common patterns
- Use consistent naming conventions
- Document utility functions clearly

## Running Tests

```bash
# Run all tests
bun test

# Run specific test files
bun test tests/log.service.test.ts
bun test tests/commands.test.ts

# Run tests matching pattern
bun test --test-name-pattern="deleteCommand"

# Run with verbose output
bun test --verbose
```

## Test Coverage

Grove maintains comprehensive test coverage across:

- **Services**: All business logic with edge cases
- **Commands**: CLI validation and workflow logic  
- **Utilities**: Helper functions and shared code
- **Integration**: End-to-end workflows
- **Types**: TypeScript interface validation

Current status: 22+ passing tests with 0 failures.
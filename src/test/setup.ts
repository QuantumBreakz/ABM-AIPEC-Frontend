import * as matchers from '@testing-library/jest-dom/matchers'

// Registered on the global expect (not via the /vitest entry, which loads a second vitest copy here).
expect.extend(matchers)

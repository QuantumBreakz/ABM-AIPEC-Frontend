import * as matchers from '@testing-library/jest-dom/matchers'
import { configure } from '@testing-library/react'

// Registered on the global expect (not via the /vitest entry, which loads a second vitest copy here).
expect.extend(matchers)

// "Wait for it to appear" helpers (findBy…, waitFor) give up after 1 s by default. With ~20 test
// files running in parallel on one machine that is too tight, and tests fail only when the computer
// is busy. A real bug still fails, just a few seconds later.
configure({ asyncUtilTimeout: 5000 })

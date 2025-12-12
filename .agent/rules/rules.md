---
trigger: always_on
---

# Agent Rules

## Process Management
*   **ALWAYS** terminate any background processes (servers, watchers, etc.) created during a session before finishing the task or asking for user feedback.
*   **NEVER** leave `npm run dev` or similar commands running in the background indefinitely.
*   Use `send_command_input` with `Terminate: true` to kill processes started with `run_command`.

### Testing and Verification
- **ALWAYS test fixes thoroughly before claiming they are complete**
- **NEVER claim something is "fixed" without proper verification**
- **Always verify that changes actually work as intended**
- **Be humble and admit when you're not sure about results**
- **Check to make sure the processes you're running aren't just hanging**

### NEVER GET STUCK - CRITICAL RULE
- **MAXIMUM 2 ATTEMPTS** at any single operation, then move on or try different approach
- **If string replacement fails ONCE, immediately read the file and adapt**
- **NO retrying the same failed approach**
- **Work FAST - if stuck for >30 seconds, change strategy immediately**
- **Create missing files/routes immediately instead of debugging why they don't exist**
- **Don't waste time - the user will cancel Cursor if you get stuck**

### UI/UX Guidelines
- **NEVER use alert(), confirm(), or prompt()** - Always use modals instead
- **Always use proper React modal components for confirmations**
- **Ensure good user experience with loading states and feedback**

### Communication Style
- **Be careful about being overconfident**
- **Don't assume fixes work without testing them**
- **Ask for verification when unsure**
- **Be honest about limitations and uncertainties**

### Development Practices
- **Test all changes in the browser/application before declaring success**
- **Verify API endpoints are working correctly**
- **Check that UI changes render properly**
- **Ensure backend and frontend integration is functioning**

### Code Quality
- **Follow existing code patterns and conventions**
- **Maintain consistency with the current codebase structure**
- **Use proper error handling and validation**
- **Document complex logic and decisions**

## Remember
- **Test first, claim success second**
- **Verify everything works before moving on**
- **Be honest about what you can and cannot confirm**

# Session History Logging

- At the end of every user-facing task, append a concise summary to `/notes.md`.
- If `/notes.md` does not exist, create it before writing the summary.
- Use the following template for each entry:
  - `Date: YYYY-MM-DD`
  - `Tasks:`
    - `...` (bullet list of what was completed)
  - `Follow-ups:`
    - `...` (bullet list of outstanding items or `None`)
- Separate entries with a blank line for readability.

# Test-First Development - MANDATORY
 
- **STOP! Before writing ANY new functionality, write tests FIRST**
- **NEVER implement features without tests - NO EXCEPTIONS**
- **If you create an API route, write a test for it IMMEDIATELY**
- **Test the code after implementation - verify it works before claiming success**

## TDD Workflow (FOLLOW STRICTLY):
 1. Write failing test first
 2. Implement minimal code to pass test
 3. Run test - verify it passes
 4. Only then commit
 
- Test coverage REQUIRED:
 - Unit tests for functions
 - Integration tests for API routes (especially DELETE, POST, PUT)
 - Component tests for UI
 - Edge cases and error handling
 
- **If tests fail, fix them before committing**
- **No broken tests allowed in commits**

# NO MOCK/FAKE/DEFAULT DATA - CRITICAL RULE

- **NEVER return mock, fake, default, or placeholder data**
- **NEVER use default scores (e.g., 2.0) for missing data**
- **If real data doesn't exist, DON'T SHOW IT - return empty/null**
- **Only display cities/locations with REAL verified data**
- **NO EXCEPTIONS - The user has repeated this rule multiple times**
- **This includes: default risk scores, placeholder text, demo data, fallback values**

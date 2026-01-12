# Packup Skill

When this skill is invoked, perform the following steps:

## Step 1: Update Progress File

1. Read the current `docs/PROGRESS.md` file
2. Update the "Last Updated" date to today's date
3. Review all work done in this session and update:
   - Overall Progress table (update percentages)
   - Move completed tasks from "To-Do List" to "Completed Tasks"
   - Check off completed items in the to-do list
   - Add any new tasks discovered during work
   - Update "Known Issues" if any bugs were found
   - Add entry to "Changelog" section with today's date and summary

## Step 2: Git Operations

1. Run `git status` to see all changes
2. Run `git diff` to review what changed (staged and unstaged)
3. Stage all relevant changes with `git add .`
4. Create a commit with a concise 3-line message:
   - Line 1: Short summary (50 chars max)
   - Line 2: Empty line
   - Line 3: Brief details of what was done

**IMPORTANT commit rules:**
- Do NOT include any AI attribution lines
- Do NOT include "Co-Authored-By" lines
- Do NOT include emojis
- Keep it simple and professional
- Focus on what was accomplished

Example commit format:
```
Add user authentication module

Implemented login/logout flow, session management,
and password reset functionality.
```

## Step 3: Push to Origin

1. Push the commit to the remote repository: `git push origin`
2. If push fails (no remote set), inform the user and skip this step
3. Report the final status

## Output

After completing all steps, provide a summary:
- What was updated in PROGRESS.md
- What files were committed
- Whether push was successful

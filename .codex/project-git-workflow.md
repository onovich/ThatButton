<!-- codex-project-git-workflow: initialized -->
<!-- initialized-at: 2026-06-22 22:45:00 +08:00 -->

# Codex Git Workflow

Initialization status: initialized
Project: ThatButton
Repository root: D:\WebProjects\ThatButton
Machine config: `.codex/project-git-workflow.json`
Skill: project-git-workflow

Treat this document and the machine config as the source of truth for this repository's Codex git workflow.

## Global Wrappers

Run these from the repository root:

```powershell
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Status.cmd
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Validate.cmd
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Commit.cmd -Message "commit message" -Paths path\to\file,other\file
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\CommitAndPush.cmd -Message "commit message" -Paths path\to\file,other\file
C:\Users\Administrator\.codex\skills\project-git-workflow\scripts\git\Push.cmd
```

## Status

```powershell
git -c safe.directory=D:/WebProjects/ThatButton status --short --branch
```

## Validation

Run these before commit or push, in order:

```powershell
npm run validate
```

```powershell
npm run build
```

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\StartLocalTest.ps1 -DryRun
```

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\OpenOnlineTest.ps1 -DryRun
```

## Staging Policy

ask each time

Inspect status before staging. Preserve unrelated user changes unless the user explicitly asks to include them.

## Commit

Use the global wrapper's built-in git commit after staging according to policy. Prefer concise conventional commit messages unless the user specifies another message.

## Push

```powershell
git -c safe.directory=D:/WebProjects/ThatButton push -u origin HEAD
```

## Docs And TODO

Keep README commands truthful when launch, build, or deploy workflow changes.

## Safety And Branch Policy

Never force-push. Do not overwrite an existing remote without explicit user confirmation.

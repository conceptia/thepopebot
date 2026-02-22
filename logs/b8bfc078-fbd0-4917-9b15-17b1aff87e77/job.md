JOB PROPOSAL: create "Pope Project" (manage-project)

Planned action (what I'll send to create_job):
- Use the manage-project skill to create a new project named Pope Project.
- Create file: projects/pope-project.md (create folder if missing).
- File contents:
  - title: Pope Project
  - slug: pope-project
  - created_at: (ISO date)
  - created_by: Telegram user
  - status: active
  - tasks: include the initial task below
- Initial task to add:
  - title: Breakdown project
  - description: "Produce a detailed breakdown of the project into milestones, deliverables, and subtasks; estimate effort (hours) for each subtask; suggest priorities and next steps."
  - status: todo
  - priority: medium
  - assignee: none (unless you specify)
  - due_date: none (unless you specify)
  - create at least 5 subtasks with short descriptions and time estimates
- Commit changes on a job branch and open a PR titled: "Add Pope Project and initial task"
- Include the created file path and task IDs in the job summary/log

Questions before I run this:
- Any assignee, due date, or priority different from the defaults above?
- Any specific format you prefer (JSON instead of MD) for the project file?

If this looks good, reply with an explicit approval (e.g., "approved", "go ahead").
# Dashboard repairs
- [x] Restore missing dashboard routes and resolve TypeScript errors.
- [x] Connect Memory Fingerprint, radar, weak spots, planner, exam mode, history, profile and settings.
- [x] Add typo-tolerant autocorrect without changing answer meaning.
- [x] Verify recall through results and dashboard updates; run tests and inspect build status.

# Interactive memory visualisations
- [x] Add observation-based retention, completed-review timeline, confidence outcomes and topic radar charts.
- [x] Test presentation data mapping and verify historical, empty, light/dark and narrow-screen states (empty-history browser responses simulated without changing stored data).

# Student onboarding and profile
- [x] Add resumable onboarding for newly registered students without redirecting existing users.
- [x] Reuse profile and preferences for editable academic context and daily goals.
- [x] Personalize dashboard with saved context, recorded daily progress and revision tasks.
- [x] Test onboarding rules, real profile persistence, resume, fresh signed-in context, themes and existing learning pages; full new-account email confirmation remains unverified.

# Curriculum-aware study creation
- [ ] Verify official textbook catalogue and retrieval sources.
- [ ] Add profile-based cascading selections, textbook import and upload fallback.
- [ ] Ground lessons and questions across chapter sections with teaching preferences and verified references.
- [ ] Test official Class 10 Science import, saved topic, upload alternatives and existing learning flows.

# Separate profile from topic learning (bug fix)
- [x] Make notes optional on Learn a New Topic; topic name alone starts learning.
- [x] Use saved student profile as academic context instead of requiring re-entry.
- [x] Verify topic-only explanation + question generation, profile page and recall flow; build OK, 48 tests pass.
<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep each dashboard destination as a leaf beneath the authenticated layout; this preserves typed navigation and sign-in protection.
- Share memory, planning and account views outside route files; leaf routes own unique metadata while common views reuse data and controls.
- Preserve the student's original answer; autocorrect may only forgive a single unambiguous spelling slip, never replace missing concepts or numerical values.
- Exam-day quick recall uses diagnostic sessions from the saved question bank and hides feedback until results; it is revision practice, not a timed mock exam.
- Finalize recall through the owner-scoped, row-locked database function; score, memory evidence, weak spots and scheduling commit together to prevent partial or duplicate completion.
- Keep memory chart transformations in a pure presentation module and reuse the existing engine for fitted estimates; visualisation must not change scoring or scheduling.
- Enroll new signups explicitly through versioned metadata, keep resumable onboarding and academic extras in existing profile preferences, and preserve unrelated preferences when saving; unmarked existing users are never enrolled implicitly.
- Keep curriculum provenance and per-study teaching settings in topic metadata; registry-owned textbook retrieval stays authenticated and browser PDF parsing retains page references, avoiding schema changes and unsafe arbitrary downloads.
- Process every imported source chunk when explaining and include whole-chapter grounding for questions; validate generated source identifiers before persisting references so chapter endings and citation integrity are preserved.

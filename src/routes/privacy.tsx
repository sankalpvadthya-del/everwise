import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — AI Memory Trainer" }, { name: "description", content: "How AI Memory Trainer handles your study data." }, { property: "og:title", content: "Privacy Policy — AI Memory Trainer" }, { property: "og:description", content: "How AI Memory Trainer handles your study data." }] }),
  component: () => (
    <LegalPage title="Privacy Policy">
      <h2>What we store</h2>
      <p>Your account email, an optional display name and academic details, the topics and study material you add, generated questions, your answers, and the scores and schedules derived from them.</p>
      <h2>How it is used</h2>
      <p>Only to provide the service to you: generating explanations and questions, evaluating answers, and computing your Memory Fingerprint and revision plan. Study material is sent to the configured AI model solely to process your request.</p>
      <h2>Who can see it</h2>
      <p>Your records are private. Database access rules ensure each account can only read and modify its own data.</p>
      <h2>Your choices</h2>
      <p>You can delete individual topics (and their history) at any time, or delete all study data from Settings.</p>
      <h2>Limitations</h2>
      <p>Memory estimates are study aids based on simple, explainable rules. They are not clinical, psychological or neurological assessments.</p>
    </LegalPage>
  ),
});

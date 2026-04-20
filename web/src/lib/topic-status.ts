import type { StudyTopic } from "@/data/types";

/**
 * Derive the effective display status for a study topic:
 * - If the topic hasn't been covered in a lecture yet (no covered_on and no lecture_id),
 *   and its raw status is `not_started`, treat it as `upcoming` (muted, no urgency).
 * - Otherwise return the raw status as-is.
 */
export function displayStatus(t: StudyTopic): StudyTopic["status"] | "upcoming" {
  if (t.status === "not_started" && !t.covered_on && !t.lecture_id) {
    return "upcoming";
  }
  return t.status;
}

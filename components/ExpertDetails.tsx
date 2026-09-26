import type { Huddle } from "@/types/huddle";

export function ExpertDetails({ huddle }: { huddle: Huddle }) {
  const expert = huddle.expert;
  if (!expert) return <p>No expert has been matched to this context.</p>;
  const matches = expert.expertise.filter(area =>
    `${huddle.question.condition} ${huddle.question.topic}`.toLowerCase().includes(area.toLowerCase()));
  return <div className="expert-details">
    <h3>Why this expert?</h3>
    <p>{expert.specialty === huddle.question.specialty
      ? `${expert.specialty} matches the confirmed specialty.`
      : `Profile specialty: ${expert.specialty}. Review its relevance to ${huddle.question.specialty}.`}
      {matches.length ? ` Relevant profile interests: ${matches.join(", ")}.` : " No exact topic match is recorded; confirm suitability before relying on this match."}</p>
    <h4>Credentials & experience</h4>
    {expert.credentials?.length ? <ul>{expert.credentials.map(item => <li key={item}>{item}</li>)}</ul>
      : <p>No verified credentials have been supplied.</p>}
    <p className="small">{expert.demo
      ? "Fictional profile and illustrative credentials. This sample match is not credential verification or an endorsement."
      : "Profile information supplied by the connected service; credentials have not been independently verified here."}</p>
  </div>;
}

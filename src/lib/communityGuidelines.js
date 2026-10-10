// teewai Common Room guidelines — friendly, enforceable house rules modeled on
// best practices from Discord, Reddit, Duolingo and Circle (see research):
// mission tone + expected behaviors + prohibited behaviors + moderation note.
// Written to feel welcoming, not legalistic.

import {
  Heart,
  Stethoscope,
  MessageSquare,
  ShieldCheck,
  Users,
  ShieldAlert,
} from 'lucide-react';

export const COMMUNITY_GUIDELINES = [
  {
    icon: Heart,
    title: 'Be kind and respectful',
    body: "Treat everyone the way you'd want to be treated. Disagreement is welcome — disrespect is not. No harassment, hate speech, or personal attacks.",
  },
  {
    icon: Stethoscope,
    title: 'Share experiences, not diagnoses',
    body: "teewai is a wellness companion, not a dentist. Share your journey and what worked for you, but please don't offer or request professional dental or medical advice. The exception: teewai-verified clinicians (with a clinician badge) may give advice. When in doubt, see a licensed professional.",
  },
  {
    icon: MessageSquare,
    title: 'Keep it real and on-topic',
    body: 'Post in the room that fits, stay roughly on topic, and skip the spam, self-promotion, or repeated low-effort messages. Quality over quantity.',
  },
  {
    icon: ShieldCheck,
    title: 'Protect privacy',
    body: "Don't share personal contact details, photos of other people, or anything that isn't yours to share. teewai will never ask for your password or payment info in the rooms.",
  },
  {
    icon: Users,
    title: 'Make it welcoming',
    body: 'We come from many places and backgrounds. Assume good intent, be patient with newcomers, and help keep the Common Room a place people want to return to.',
  },
  {
    icon: ShieldAlert,
    title: 'Trust the moderation',
    body: 'Profanity is filtered automatically and teewai admins keep an eye on the rooms. Repeated violations may lead to post removal or losing access. To flag something, reach out to the teewai team.',
  },
];
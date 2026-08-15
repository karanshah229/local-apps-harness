# Professional UI styling

Read when creating or changing visible web, Android, or iOS interfaces.

- Build every web interface from shadcn/ui components and primitives, then express the app's visual language through its design tokens and component variants.
- Give each app a polished, intentional visual language derived from its purpose, audience, and content. When the request leaves styling open, choose fitting colors, typography, spacing, density, surfaces, and imagery without changing product behavior.
- Start with professional neutral surfaces, clear hierarchy, and one restrained domain-derived accent. Automatic palette generation excludes purple, violet, and indigo. Gradients are also excluded by default. Add any excluded choice only when the confirmed requirement ledger quotes the user's explicit request for it.
- Avoid blandness through clear hierarchy, confident contrast, strong typography, considered spacing, restrained accents, and complete interaction states—not decoration for its own sake.
- Let the domain shape the feel. For example, a gold-focused app uses restrained gold or brass accents with complementary neutrals; an events app may use warm calendar-inspired accents and airy scheduling surfaces. Derive another app's palette and character from its own subject.
- Keep the result coherent across screens and platforms, accessible in contrast and type size, and professional at both mobile and desktop sizes.
- Styling choices may express the requested app; they may not introduce unrequested dashboards, navigation destinations, data, or capabilities.
- Before completion, scan theme tokens, CSS, and utility classes for purple/violet/indigo families and gradient declarations. Every match must trace to the explicit requirement; replace unrequested matches with the domain palette.

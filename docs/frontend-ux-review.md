# Frontend UX Review — First Release

**Reviewed:** 2026-07-16  
**Scope:** Desktop SPA review of Home, statement detail, How it works, and new-statement screens.  
**Audience:** Curious young-to-middle-aged visitors comfortable with modern websites, but not necessarily experienced with Web3.  
**Out of scope:** Wallet connection, verification, and transaction-completion testing. This review focuses on visual quality, clarity, and usability before release.

## Summary

Symvolia already has a calm, distinctive visual foundation and a clear three-column desktop shell. The greatest release risk is not visual quality alone: a new visitor has to infer unfamiliar concepts—credits, support, staging, and locking in—before they can understand what the app is for or safely take action.

The first-release improvements should make the product’s purpose, participation model, and next action clear without requiring users to visit a separate explainer page.

## Launch blockers / high-impact fixes

### 1. Explain the product before users interpret the feed

**Observation:** Home opens directly on a ranked list. A new visitor cannot readily tell what Symvolia is, why statements rank, what support means, or what they can do without a wallet.

**Recommendation:** Add a compact, dismissible first-visit panel above the feed:

- “A public board for what verified people care about.”
- “Browse freely. Verify to support ideas or post your own.”
- Primary action: **Explore statements**.
- Secondary action: **How it works**.

Remember dismissal locally. The panel should not block repeat visitors from getting straight to the feed.

### 2. Make participation vocabulary understandable in context

**Observation:** “Credits,” “support,” “stage changes,” and “Lock it in!” are unfamiliar to a Web3-light audience. The right panel assumes the participation model is already understood.

**Recommendation:**

- Rename **Credits** to **Support credits**, with an always-available “How credits work” tooltip.
- Change **Lock it in!** to **Review & submit** until the final confirmation screen.
- In the no-changes state, explain: “Adjust support on a statement. Nothing is submitted until you review.”
- After a support adjustment, show a small “Changes saved locally” or “Ready to review” state.

### 3. Resolve the identity presentation

**Observation:** The profile panel displays **Anonymous** beside **Verified**. The labels are individually reasonable but read as contradictory to a new user.

**Recommendation:** Present **Verified participant** as the primary label and **Anonymous display name** as supporting text or a tooltip. Explain that verification confirms uniqueness rather than public identity.

### 4. Give support controls an explicit visual model

**Observation:** The compact `×`, down arrow, green number, and up arrow on statement cards are difficult to interpret. The card reads primarily as ranking data rather than an interaction surface.

**Recommendation:** Use a labeled control group:

- **Your support: 7**
- Visible decrement and increment buttons
- “Costs 28 credits” label
- Hover and keyboard-focus tooltips

Maintain a compact layout, but avoid icon-only meaning for the core participation interaction.

### 5. Add meaning to the statement-detail chart

**Observation:** The graph is visually polished but does not explain what it measures. Users cannot determine whether the line represents rank, support, credits, or activity.

**Recommendation:**

- Add the title **Support over time**.
- Show a metric summary such as “Current support: 16.”
- Add data-point tooltips.
- Use a deliberate empty state when a statement lacks enough history.

**Implementation note:** The live statement-detail page emitted chart sizing warnings during initial render. Resolve these before release to avoid layout flashes or missing charts.

### 6. Use one statement-length rule everywhere

**Observation:** The full-page composer indicates a 120-character limit, while the modal implementation uses another limit.

**Recommendation:** Choose one product limit, centralize it in a shared constant, and use the same validation, counter, and helper text in [CreateStatementForm.tsx](../frontend/src/components/CreateStatementForm.tsx) and [CreateStatementModal.tsx](../frontend/src/components/CreateStatementModal.tsx).

## Polish improvements

### 1. Strengthen Home’s hierarchy

**Observation:** Search and sort tabs are visually prominent, but the feed has no title or explanation. “Top,” “Relevant,” and “Latest” look like equal choices even when some are unavailable.

**Recommendation:**

- Add a heading such as **What people care about in Earth**.
- Hide unavailable sort options, or explain why they are disabled—for example, “Search to sort by relevance.”
- Consider **Most supported** instead of **Top** if it more accurately reflects the ranking model.

### 2. Improve the empty right-panel state

**Observation:** When nothing is staged, the large profile panel contains a substantial inactive area and can feel unfinished.

**Recommendation:** Add a compact empty state under the credit balance with a one-sentence instruction and a restrained icon or illustration. Keep the writing call to action, but label it **Create statement** rather than **WRITE**.

### 3. Reduce ambiguous visual density in statement cards

**Observation:** Rank, peak rank, credit cost, active support, star, and vote controls compete within a small area.

**Recommendation:** Establish a predictable hierarchy:

1. Statement text.
2. Current ranking and support.
3. Personal support action.
4. Secondary metadata, including peak rank and save/bookmark.

Replace the trophy emoji with a consistent icon or a labeled hover treatment. Emoji vary in visual weight between platforms.

### 4. Make the composer more supportive

**Observation:** “What’s on your mind?” is friendly but does not establish the expected statement format. Initial support has no explanatory label.

**Recommendation:**

- Add a one-line writing example: “Be specific: ‘Expand protected bike lanes near schools.’”
- Label the selector **Initial support** and show its credit cost.
- Explain the benefit of duplicate detection: “We’ll surface similar statements to help avoid duplicates.”

### 5. Tighten visual consistency

**Observation:** The editorial serif brand mark is distinctive, while the application UI is mostly sans serif. Large side-column whitespace can make very wide desktop views feel early-stage.

**Recommendation:** Preserve the brand mark while using a deliberate desktop max-width, more intentional panel spacing, and a slightly richer surface hierarchy. Subtle card borders, a restrained elevation scale, and stronger selected-state contrast can increase polish without losing the calm visual character.

### 6. Turn How it works into guided onboarding

**Observation:** The page is clear and thoughtfully written, but long and text-forward.

**Recommendation:** Make the first concepts a visual progression:

1. Browse
2. Verify
3. Allocate support
4. Review
5. Submit

Place contextually relevant calls to action after each phase, especially **Browse statements** and **Get verified**. Preserve the privacy explanation; it is appropriate for this audience.

### 7. Remove development-only presentation

**Observation:** A development version is visible in the main side navigation.

**Recommendation:** Hide the version label in production, or move it into a quiet footer or About dialog. Keep it available for support without making it part of the primary experience.

### 8. Clarify interaction affordances

**Observation:** The forum icon, profile chevron, cards, and stars are interactive but do not consistently signal interactivity.

**Recommendation:** Standardize hover, keyboard-focus, and pressed states. Add tooltips to icon-only controls and provide a subtle visual cue for clickable card regions.

### 9. Preserve search where discovery matters

**Observation:** Search is not visible on several deeper pages, including statement detail and writing.

**Recommendation:** Add a compact search affordance or keyboard shortcut on statement pages. It does not need to occupy the full Home header.

### 10. Use friendlier action language

**Recommendation:** Consider the following labels:

- **My Support** → **Your support**
- **My Statements** → **Your statements**
- **Starred** → retain, but consider supporting copy such as “Saved” where appropriate

## Suggested implementation order

1. First-visit welcome panel and right-panel empty state.
2. Support vocabulary and the **Review & submit** model.
3. Support-control redesign and chart labeling.
4. Unified composer validation and improved write guidance.
5. Home hierarchy, sort-state behavior, and desktop spacing refinements.
6. Production cleanup: version visibility, tooltips, hover/focus states, and consistent iconography.

## Tone decision to make before visual implementation

Choose a primary tone for the next UI pass:

- **Civic and trustworthy** — calm, clear, durable, public-interest oriented.
- **Playful and social** — lighter, more expressive, community-led.
- **Deliberate blend** — civic information design with modest playful expression.

The selected tone should guide iconography, emoji use, visual density, and microcopy.
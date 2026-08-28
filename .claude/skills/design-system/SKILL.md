---
name: design-system-
description: Creates implementation-ready design-system guidance with tokens, component behavior, and accessibility standards. Use when creating or updating UI rules, component specifications, or design-system documentation.
---

<!-- TYPEUI_SH_MANAGED_START -->

# 대시보드

## Mission
Deliver implementation-ready design-system guidance for 대시보드 that can be applied consistently across dashboard web app interfaces.

## Brand
- Product/brand: 대시보드
- URL: https://watt.rfenms.com/main.html
- Audience: authenticated users and operators
- Product surface: dashboard web app

## Style Foundations
- Visual style: structured, accessible, implementation-first
- Main font style: `font.family.primary=Pretendard Variable`, `font.family.stack=Pretendard Variable, Pretendard, -apple-system, Apple SD Neo Gothic, sans-serif`, `font.size.base=16px`, `font.weight.base=400`, `font.lineHeight.base=25.6px`
- Typography scale: `font.size.xs=13px`, `font.size.sm=14px`, `font.size.md=15px`, `font.size.lg=16px`, `font.size.xl=17px`, `font.size.2xl=20px`
- Color palette: `color.text.primary=#ffffff`, `color.text.secondary=#98d4fb`, `color.text.tertiary=#8cd2ff`, `color.surface.muted=#65d123`, `color.surface.base=#000000`, `color.surface.raised=#f0cc3b`, `color.surface.strong=#ee3e3e`, `color.border.muted=rgba(255, 255, 255, 0.8) rgba(255, 255, 255, 0.8) rgba(255, 255, 255, 0.3)`, `color.border.strong=rgba(255, 255, 255, 0.9) rgba(255, 255, 255, 0.9) rgba(255, 255, 255, 0.2)`
- Spacing scale: `space.1=3px`, `space.2=5px`, `space.3=8px`, `space.4=10px`, `space.5=12px`, `space.6=13px`, `space.7=14px`, `space.8=16px`
- Radius/shadow/motion tokens: `radius.xs=3px`, `radius.sm=4px`, `radius.md=8px`, `radius.lg=20px` | `shadow.1=rgba(0, 0, 0, 0.4) 5px 5px 10px 0px`, `shadow.2=rgba(0, 0, 0, 0.15) 0px 0px 16px 3px` | `motion.duration.instant=200ms`

## Accessibility
- Target: WCAG 2.2 AA
- Keyboard-first interactions required.
- Focus-visible rules required.
- Contrast constraints required.

## Writing Tone
concise, confident, implementation-focused

## Rules: Do
- Use semantic tokens, not raw hex values in component guidance.
- Every component must define required states: default, hover, focus-visible, active, disabled, loading, error.
- Responsive behavior and edge-case handling should be specified for every component family.
- Accessibility acceptance criteria must be testable in implementation.

## Rules: Don't
- Do not allow low-contrast text or hidden focus indicators.
- Do not introduce one-off spacing or typography exceptions.
- Do not use ambiguous labels or non-descriptive actions.

## Guideline Authoring Workflow
1. Restate design intent in one sentence.
2. Define foundations and tokens.
3. Define component anatomy, variants, and interactions.
4. Add accessibility acceptance criteria.
5. Add anti-patterns and migration notes.
6. End with QA checklist.

## Required Output Structure
- Context and goals
- Design tokens and foundations
- Component-level rules (anatomy, variants, states, responsive behavior)
- Accessibility requirements and testable acceptance criteria
- Content and tone standards with examples
- Anti-patterns and prohibited implementations
- QA checklist

## Component Rule Expectations
- Include keyboard, pointer, and touch behavior.
- Include spacing and typography token requirements.
- Include long-content, overflow, and empty-state handling.

## Quality Gates
- Every non-negotiable rule must use "must".
- Every recommendation should use "should".
- Every accessibility rule must be testable in implementation.
- Prefer system consistency over local visual exceptions.

<!-- TYPEUI_SH_MANAGED_END -->

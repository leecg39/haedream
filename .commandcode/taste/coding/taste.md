# Coding

- Website clones must be pixel-perfect: exact computed styles from the original CSS (specific px values, colors, paddings), real content and assets, Korean labels, mobile-responsive behavior, and accessible forms — verified against the original before completion. Confidence: 0.8
- When requesting CRUD/backend features, expects operational hardening: server-side RBAC re-validation (never rely on hidden frontend buttons), strict schema allowlists against mass assignment, DB-level constraints and triggers, soft delete + restore + admin-only purge with confirmation, optimistic locking via version, tenant isolation/IDOR protection, append-only audit logs, request IDs, and an OpenAPI spec. Confidence: 0.75
- Reference-site content is extracted with Firecrawl/OCR into local JSON/MockDB so cloned screens show realistic, functional data instead of placeholders. Confidence: 0.65

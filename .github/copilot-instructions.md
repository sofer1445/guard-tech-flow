# Copilot Developer Rules

These rules are strict and must be followed at all times when contributing to this repository.

1. **Use Fastify strictly (no Express).** All HTTP server code must be written using the Fastify framework. Do not introduce Express or any Express-based middleware.

2. **Use Zod as the single source of truth for validation.** All input validation, schema definitions, and type inference must be done via Zod. Do not use Joi, Yup, or any other validation library.

3. **Use Mongoose for DB modeling.** All MongoDB interactions must go through Mongoose models and schemas. Do not use the native MongoDB driver directly for data modeling.

4. **Maintain Hebrew language and strict RTL for any frontend code.** All user-facing text in the frontend must be in Hebrew. All frontend layouts must enforce `direction: rtl` and be fully RTL-compatible.

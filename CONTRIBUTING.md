# Contribution Guidelines

Thank you for helping improve Awesome Stellar AI. The goal is a small, credible, and useful list rather than a complete directory of every project that mentions AI or Stellar.

All repository content, pull requests, issues, and commit messages must be written in English.

## Eligibility

A project should meet all of the following requirements:

- Stellar must be a meaningful part of the product or architecture.
- AI agents, agent tooling, or machine-to-machine workflows must be a substantive feature rather than a marketing label.
- The project must have a public repository or a usable deployment with public technical documentation.
- The linked source must explain what the project does and how Stellar is used.
- Any mainnet, testnet, standards-integration, or security claim must have public evidence.
- The project must add distinct value to its category.

Hackathon participation, grant funding, token issuance, or a landing page alone is not sufficient for inclusion.

Projects in development may be included when they contain substantial public work and are clearly described as in development. Inactive projects may be removed when they no longer provide unique reference value.

## Before Opening a Pull Request

1. Search the list and open pull requests for duplicates.
2. Choose the single category that best describes the project's primary function.
3. Read the project's source, documentation, and deployment evidence.
4. Verify that every link is public and directly relevant.
5. Disclose in the pull request if you maintain, fund, advise, or otherwise have a material relationship with the project.
6. Add or update the matching record in `catalog/evidence.json`.
7. Run `npm run check:catalog` and `npx --yes awesome-lint`.

Maintainer-affiliated projects are evaluated under the same criteria as all other entries.

## Editorial Review

Every accepted entry must also have a record in `catalog/evidence.json`. The record is an editorial audit trail, not a quality score. It identifies the primary URL, category, review date, and public sources used to verify the entry.

Reviewers evaluate submissions across four questions:

1. **Relevance:** Is Stellar essential to the agent workflow rather than incidental?
2. **Substance:** Is there working code, a usable deployment, or detailed technical documentation?
3. **Evidence:** Can a reader independently verify material claims?
4. **Distinctiveness:** Does the project add a capability or reference that the list does not already cover?

Stars, funding, hackathon placement, and maintainer relationships do not replace these questions. A project does not need to be production-ready, but its description must state its maturity accurately.

## Entry Format

Use this format:

```markdown
- [Project Name](https://github.com/owner/repository) - Concise factual description ending with a period.
```

Entries must:

- Be added in alphabetical order within their category.
- Link to the primary repository when one exists.
- Use the project's current public name.
- Explain why the project is useful, not repeat promotional language.
- End with a period.
- Avoid unsupported superlatives such as "first," "best," or "leading."
- Avoid adding a second entry for the same project in another category.

## Evidence and Status Claims

Use precise language:

- **Mainnet** requires a verifiable contract, transaction, account, or live mainnet interaction.
- **Testnet** requires a verifiable testnet deployment or transaction.
- **Live** requires a working public service when the pull request is reviewed.
- **Published** requires a package or release available from its stated distribution channel.
- **Integrated** requires code or on-chain evidence; a README mention is not enough.
- **In development** should be used when the public implementation is not ready for production use.

A repository is not itself "mainnet." The deployment or transaction is.

For standards such as Stellar 8004, x402, or MPP, link the exact integration evidence in the pull request. Registration, SDK integration, reputation reads, and reputation writes are different levels of adoption and should not be presented as equivalent.

## Pull Request Scope

Prefer one project per pull request. A pull request may update multiple entries when it fixes a single systematic issue, such as broken links or consistent wording.

In the pull request description, include:

- Why the project belongs in the list.
- How it uses Stellar and AI agents.
- Its current deployment status.
- Links supporting any status or integration claims.
- Your relationship to the project, if any.

By participating, you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Reverification and Removal

Entries are rechecked at least every 120 days. A project may be corrected, moved, or removed when its primary link breaks, its evidence disappears, its description becomes misleading, it is archived without lasting reference value, or its Stellar or agent functionality is no longer substantive.

Removal is not a judgment on a team or product. It means the entry no longer meets the list's current evidence standard. Projects may be resubmitted when the missing evidence or functionality is restored.

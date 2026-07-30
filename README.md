# Awesome Stellar AI [![Awesome](https://awesome.re/badge-flat2.svg)](https://awesome.re)

> A curated list of protocols, infrastructure, developer tools, and applications for AI agents on Stellar.

The list focuses on projects where Stellar is a meaningful part of the agent architecture: identity, payments, authorization, coordination, settlement, or verifiable on-chain activity. Projects are grouped by their primary function, not by where they first appeared.

## Contents

- [Core Protocols and Standards](#core-protocols-and-standards)
- [Identity, Reputation, and Discovery](#identity-reputation-and-discovery)
- [Agent Payments and Monetization](#agent-payments-and-monetization)
- [Wallets, Authorization, and Policy](#wallets-authorization-and-policy)
- [MCP Servers and Agent Tooling](#mcp-servers-and-agent-tooling)
- [Marketplaces and Coordination](#marketplaces-and-coordination)
- [Agents and Applications](#agents-and-applications)
- [Developer Resources](#developer-resources)
- [Hackathons](#hackathons)

## Core Protocols and Standards

- [Machine Payments Protocol SDK](https://github.com/stellar/stellar-mpp-sdk) - Stellar's SDK for MPP charge payments and off-chain payment channels with on-chain settlement.
- [Stellar 8004](https://github.com/trionlabs/stellar-8004) - Mainnet identity, reputation, and validation infrastructure for AI agents, with Soroban contracts, a TypeScript SDK, an indexer, and an explorer.
- [x402](https://github.com/x402-foundation/x402) - Open HTTP payment protocol with native Stellar support through the `@x402/stellar` package.

## Identity, Reputation, and Discovery

- [stellar-agent-search](https://github.com/berkingurcan/stellar-agent-search) - Read-only MCP server and CLI for discovering, ranking, and vetting agents registered with Stellar 8004; the local package is released and its hosted transport is pending.

## Agent Payments and Monetization

- [MPP Router](https://github.com/mpprouter/rozo-mpprouter) - Mainnet routing service that lets Stellar-funded clients reach paid MPP services through a stable API.
- [RouteDock](https://github.com/winsznx/routedock) - Unified client for x402, MPP charge, and MPP session payments on Stellar, with public testnet evidence.
- [TollPay](https://github.com/rajkaria/toll) - Middleware and SDKs for monetizing MCP tools with per-call USDC payments on Stellar, with documented mainnet transactions.
- [x402 MCP Stellar Template](https://github.com/ffarinas/x402-mcp-stellar-template) - Node.js, Python, and Go templates for paid MCP servers, wallet provisioning, and spending limits, with documented mainnet deployments.

## Wallets, Authorization, and Policy

- [Prism](https://github.com/Bekirerdem/prism) - Testnet smart treasury for AI agents with spending caps, session keys, allowlists, escrow, and optional Stellar 8004 reputation checks.
- [Stellar Agent Wallet Skill](https://github.com/mpprouter/stellar-agent-wallet-skill) - Agent skill for Stellar USDC balances, transfers, swaps, trustlines, and payments to x402- or MPP-gated services.

## MCP Servers and Agent Tooling

- [Pulsar](https://github.com/benelabs/pulsar) - MCP server for Stellar and Soroban development, including account queries, transaction simulation, contract deployment, and transaction submission.
- [Stellar Raven](https://github.com/kalepail/stellar-raven) - Hosted MCP gateway that combines official Stellar documentation, live ecosystem data, community intelligence, and tested development playbooks.

## Marketplaces and Coordination

- [AI-Net](https://github.com/Epta-Node/ai-net) - Experimental coordination network where specialized agents discover one another, delegate work, and settle payments on Stellar.
- [CleverCon](https://github.com/clevercon-protocol/clevercon) - Testnet service marketplace and orchestrator that decomposes tasks, hires specialist agents, and pays them through x402 or MPP.
- [Talos](https://github.com/enliven17/talos-stellar) - Framework for autonomous agent corporations that register services and earn USDC through x402 payments on Stellar.

## Agents and Applications

- [ASGCard](https://github.com/ASGCompute/asgcard-public) - Virtual Mastercard service for AI agents funded with USDC through x402 on Stellar.
- [Cards402](https://github.com/CTX-com/Cards402) - Mainnet service, SDK, CLI, and MCP server for issuing virtual Visa cards to agents after payment in USDC or XLM.
- [Nulucre Agents](https://github.com/vjshaw/nulucre-agents) - Wallet reputation and DeFi fact-verification agents that accept x402 micropayments on Stellar and Base.
- [RenderGate](https://github.com/tantk/rendergate) - Pay-per-render browser service for agents, with a live endpoint, testnet x402 payments, and an identity registered on Stellar 8004 mainnet.

## Developer Resources

- [Building with AI](https://developers.stellar.org/docs/build/building-with-ai) - Official guide to Stellar-focused AI assistants, MCP servers, skills, and documentation resources.
- [Lumen Loop](https://github.com/lumenloop/lumenloop-overview) - Open discovery and ecosystem intelligence layer for projects, builders, funding, and activity across Stellar.
- [Stellar Agentic Payments](https://developers.stellar.org/docs/build/agentic-payments) - Official documentation for building agent payment flows with x402 and MPP.
- [Stellar Dev Skill](https://github.com/stellar/stellar-dev-skill) - AI skill covering Stellar smart contracts, applications, assets, data, agentic payments, standards, and zero-knowledge development.
- [Stellar Light](https://github.com/Stellar-Light/stellarlight) - Open ecosystem discovery layer with project intelligence, GitHub activity, funding data, APIs, and MCP access.

## Hackathons

- [Stellar Hacks: Agents](https://dorahacks.io/hackathon/stellar-agents-x402-stripe-mpp/detail) - 2026 hackathon focused on agents and micropayments using x402 and MPP; its five winners were Cards402, CleverCon, RenderGate, x402 MCP Stellar Template, and TollPay.
- [Stellar Agents Hackathon Retrospective](https://developers.stellar.org/meetings/2026/04/23) - Stellar Development Foundation overview of notable submissions and the technical patterns that emerged from the event.

## Contributing

Contributions are welcome. Read the [contribution guidelines](CONTRIBUTING.md) before opening a pull request. This is a curated list, so inclusion is based on technical relevance, public evidence, and usefulness rather than submission alone.

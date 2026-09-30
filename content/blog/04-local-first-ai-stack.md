---
title: "The Air-Gap-Capable Business Runtime"
description: "*By Joshua Vaughn - RevealUI Studio*"
visibility: public
status: narrative
audience: user
author: Joshua Vaughn
---

Most software companies accept a particular bargain without thinking about it: your secrets live in someone else's vault, your AI calls someone else's API, and your dev environment is a pile of global installs that one `npm install -g` can break.

RevealUI doesn't accept that bargain.

This post is about a different way to run a software business  -  one where your secrets are encrypted on your own machine, your AI inference runs on your CPU, and your development environment is fully reproducible. Not because you're paranoid, but because owning your stack is simply better engineering.

## The four layers

RevealUI's local-first story comes from four independent pieces that happen to compose cleanly:

| Layer | Technology | What it does |
|-------|-----------|-------------|
| **Secrets** | RevVault (age encryption) | Credentials stay on your machine, encrypted at rest |
| **AI inference (default)** | A local inference runtime (open models) | Local LLM inference. Cloud AI model providers and chat-completions-compatible endpoints are pluggable via env vars but opt-in. |
| **Dev environment** | Nix flakes + direnv | Reproducible environment, zero manual tool installs |
| **Business logic** | RevealUI | Auth, content, payments, AI agents  -  all wired |

Each layer independently solves a real problem. Together, they give you something genuinely unusual: a full business software stack with local AI that can run without a network connection.

## RevVault: secrets that don't travel

RevealUI uses [RevVault](https://github.com/RevealUIStudio/revvault) for credential management. RevVault is an age-encrypted local secret store  -  a Git-friendly vault that keeps secrets on your filesystem, encrypted, and never phones home.

```bash
# Store a secret
revvault set my-project/payments/secret-key

# Retrieve it
revvault get my-project/payments/secret-key

# Load into environment (used by .envrc)
revvault export-env my-project > .env.local
```

The practical upside: your `.env` never touches the hosting provider's secret storage, your CI system, or any third-party dashboard unless you put it there explicitly. The `.envrc` in every RevealUI project calls `revvault export-env` at shell entry  -  credentials are decrypted on the fly, used in memory, never written to disk in plaintext.

Contrast this with the standard pattern: secrets in a hosting provider, a cloud provider's secrets manager, or a `.env` file checked into a private repo. All three involve trusting a third party with values that should only exist on hardware you control.

## Local inference: your models, your hardware

RevealUI's AI agents run on open source models locally. The recommended path is a signed local inference runtime: install one allowlisted open model, and the runtime selects an engine for the hardware. The product docs name the install command.

The runtime serves a chat-completions-compatible API locally. The `@revealui/ai` package detects the running runtime and routes agent calls to it. The same agent orchestration, memory system, and MCP integrations work with any supported inference path, because they all expose chat-completions-compatible `/v1/chat/completions` endpoints.

As a fallback, a second local runtime can serve any open GGUF chat model. Start that runtime and pull an open chat model. The product docs name the commands.

No API key. No usage bill. No data leaving your machine.

## Nix: the environment that installs itself

RevealUI uses Nix flakes + direnv. The entire development environment  -  Node, pnpm, Biome, and all build dependencies  -  is declared in `flake.nix` and activated automatically when you enter the project directory.

```bash
# First time
git clone https://github.com/RevealUIStudio/revealui
cd RevealUI
direnv allow        # Nix builds and activates the full dev environment

# Install one allowlisted open model (recommended).
# The product docs name the command.

# Or start a local inference runtime and pull an open chat model.
# The product docs name those commands.
```

No `apt install`, no `brew install`, no conda environment. Every developer on the project gets the same toolchain regardless of what's on their system. It works the same on a Ryzen laptop as it does on a Mac or a Linux CI runner.

## Putting it together

Here's the full picture of what "local-first RevealUI" looks like in practice:

```
.envrc
└── revvault export-env revealui     # Decrypts secrets into environment

flake.nix
└── devShell
    └── nodejs, pnpm, biome          # Standard RevealUI toolchain

install one allowlisted open model    # Or: pull an open chat model on a local runtime
└── chat-completions-compatible API served locally

@revealui/ai                         # Agent orchestration routes to local model
├── planning, memory, CRDT           # Full agent stack
└── @revealui/mcp                    # MCP tool integrations
```

The entire business stack with local AI  -  People, Content, Offers, Payments, and Agents, running without a cloud API call in sight.

## Who this is for

The "local-first" configuration is one of several inference paths. RevealUI supports a signed local runtime (planned recommended) and a local runtime for any open GGUF model. Cloud AI model providers and chat-completions-compatible endpoints are pluggable but opt-in via env vars. Pick the path that fits your trust and cost profile.

But there's a real and growing audience for whom those concerns matter:

- **Bootstrapped developers** who can't absorb unpredictable LLM API costs as they scale
- **Agencies** building client software where the client's data can't transit third-party systems
- **Companies with data residency requirements**  -  healthcare, finance, legal, government
- **Developers in bandwidth-constrained environments**  -  offline-capable software, edge deployments
- **Anyone who has been burned by a provider sunset**  -  your inference doesn't disappear when a company pivots

For these cases, RevealUI with local inference is the only full-stack agentic runtime option that doesn't require trusting a cloud provider with your most sensitive business data.

## What you don't give up

Running locally doesn't mean running poorly. The RevealUI agent stack has the same capabilities whether it's talking to a cloud model or a smaller local model:

- **Planning and tools**  -  agents can create todos, read and write files, execute shell commands
- **Memory**  -  episodic memory, working memory, CRDT-based persistence across sessions
- **MCP integrations**  -  14 first-party MCP servers (a payments processor, a database, and a hosting provider, plus Playwright, Code Validator, Next.js DevTools, and RevealUI-internal servers for content, email, memory, payments, and docs, the contracts introspection server, and the adapter base class)
- **Orchestration**  -  multi-agent coordination, sub-agent spawning, streaming

What you do give up: the raw capability of a 70B+ cloud model. Smaller local models are excellent for structured tasks  -  code generation, data processing, form filling, API orchestration  -  but won't match a frontier model on open-ended reasoning. For most business automation use cases, that's an acceptable trade.

## Setup guide

See [Local-First Setup](/local-first) for the step-by-step guide: hardware requirements, Nix setup, local inference runtime installation, connecting `@revealui/ai`, and configuring RevVault.

---

*RevealUI is MIT licensed and available on [the source repository](https://github.com/RevealUIStudio/revealui). Get started with `npx create-revealui`.*

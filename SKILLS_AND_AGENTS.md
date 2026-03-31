# SKILLS & AGENTS INDEX 🤖

This project uses a custom "Agentic Framework" located in the `.agents/` directory. These are not just code—they are high-level engineering instructions and workflows designed for AI agents.

## 1. Where to find them
- **Skills**: `.agents/skills/`
- **Workflows**: `.agents/workflows/`

## 2. How to use them
Each skill is a folder containing a `SKILL.md` file. Before performing a specific task, you should read the corresponding skill file for that domain.

### Available Skills:
| Skill | Path | Use case |
|---|---|---|
| **Frontend Design** | `.agents/skills/frontend-design/SKILL.md` | Building polished, premium React/CSS interfaces. |
| **Backend Engineering** | `.agents/skills/backend-engineering/SKILL.md` | API design, Next.js Server Actions, and business logic. |
| **Database Engineering** | `.agents/skills/database-engineering/SKILL.md` | PostgreSQL, Supabase, Migrations, and RLS. |
| **Systems Architecture** | `.agents/skills/systems-architecture/SKILL.md` | Large-scale structural changes and domain modeling. |
| **Testing & Quality** | `.agents/skills/testing-quality-engineering/SKILL.md` | Writing Playwright E2E and unit tests. |
| **Frontend Architecture** | `.agents/skills/frontend-architecture/SKILL.md` | State management and component hierarchy. |
| **Engineering Orchestrator** | `.agents/skills/engineering-orchestrator/SKILL.md` | High-level project coordination (Founding CTO role). |
| **SEO Optimization** | `.agents/skills/seo-optimization/SKILL.md` | Optimizing meta tags and page metadata. |
| **UX Writing** | `.agents/skills/ux-writing/SKILL.md` | Writing clear, concise copy for tooltips and labels. |
| **Content Writing** | `.agents/skills/content-writing/SKILL.md` | Drafting long-form docs/blogs in Nexus. |
| **DevOps & Deployment** | `.agents/skills/devops-deployment/SKILL.md` | Vercel and CI/CD configuration. |
| **Observability** | `.agents/skills/observability-monitoring/SKILL.md` | Error tracking and logging setups. |

## 3. Workflows
Workflows are step-by-step guides for common operations. 
- **Initialization**: `.agents/workflows/init.md` (Run this first in a new environment).

---

**Instruction for Agent:**
If the user asks you to build a feature, check the table above. Read the relevant `SKILL.md` files **BEFORE** you start writing code. This ensures you follow the project's established standards and engineering principles.

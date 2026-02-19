# 🤖 PR-Agent Setup Guide

> **What is PR-Agent?**  
> An AI-powered code review assistant that automatically reviews Pull Requests, generates descriptions, provides code suggestions, and enforces engineering standards.

---

## 🚀 Quick Start (3 Steps)

### 1. Add OpenRouter API Key to GitHub

**Repository Secret:**
- Go to: `https://github.com/YOUR_ORG/YOUR_REPO/settings/secrets/actions`
- Click "New repository secret"
- Name: `OPENROUTER_KEY`
- Value: Your OpenRouter API key (get from https://openrouter.ai/keys)

**Organization Secret (for multiple repos):**
- Go to: `https://github.com/organizations/YOUR_ORG/settings/secrets/actions`
- Follow same steps, select repository access

### 2. Create `docs/PRD.md`

```bash
mkdir -p docs
touch docs/PRD.md
```

### 3. (Optional) Customize

Only if needed - see [Configuration](#-configuration) for:
- Changing AI model
- Adjusting review depth  
- Modifying prompts

**Done!** Next PR will trigger PR-Agent with Django-optimized settings.

---

## 📁 What's Included

### `.github/workflows/pr_agent.yml`
GitHub Action that runs PR-Agent on every PR.

### `.pr_agent.toml`
Main configuration file with Django-specific checks pre-configured:
- N+1 query detection (missing select_related/prefetch_related)
- Migration validation after model changes
- QuerySet optimization checks
- Permission class validation
- Transaction safety with @atomic
- Raw SQL injection detection

### `AGENTS.MD`
Engineering standards (type safety, security, Django best practices) treated as binding rules by PR-Agent.

### `IGNORE.GLOB`
Files to skip during review. Default: migrations, *.pyc, __pycache__, *.po files

### `.github/pull_request_template.md`
PR template with AI markers (`pr_agent:type`, `pr_agent:summary`, etc.) that get auto-filled.

---

## ⚙️ Configuration

### Change AI Model

**Location:** `.pr_agent.toml` → `[config]`

| Model | Speed | Cost | Use Case |
|-------|-------|------|----------|
| `openai/z-ai/glm-4.7` (default) | Fast | Low | General reviews |
| `openai/deepseek/deepseek-v3.2` | Fast | Very Low | Cost-effective |
| `anthropic/claude-3.5-sonnet` | Medium | Medium | Deep analysis |
| `openai/gpt-4o` | Slow | High | Complex refactors |

### Adjust Review Depth

```toml
[pr_reviewer]
num_max_findings = 20  # More = thorough

[pr_code_suggestions]
num_code_suggestions = 10
suggestions_score_threshold = 2  # 0-10, higher = stricter
```

### Customize Prompts

Add project-specific checks to `extra_instructions` in `.pr_agent.toml`:

```toml
[pr_reviewer]
extra_instructions = """
...keep existing instructions...

ADDITIONAL CHECKS:
- Verify all new models have proper __str__ methods
- Check for database index optimization
"""
```

### Ignore More Files

Edit `IGNORE.GLOB`:

```toml
[ignore]
glob = [
  '*.txt',
  'migrations/**',
  'tests/**',
  '*.pyc',
  'staticfiles/**',
]
```

---

## 📋 PRD Template

```markdown
# Product Requirements Document

## Core Features
1. [Feature description]

## Technical Requirements
- Database: PostgreSQL
- Authentication: Django AllAuth
- API: Django REST Framework

## API Specifications
### POST /api/users/
Input: { "email": string, "password": string }
Output: { "id": int, "token": string }

## Security
- Password validation with custom validators
- CSRF protection enabled
- Rate limiting on authentication endpoints

## Performance
- Database query optimization with select_related/prefetch_related
- Caching strategy for frequently accessed data
```

---

## 🎯 Common Scenarios

### Fast & Cheap
```toml
model = "openai/deepseek/deepseek-v3.2"
num_max_findings = 10
num_code_suggestions = 5
```

### Maximum Quality
```toml
model = "anthropic/claude-3.5-sonnet"
num_max_findings = 30
num_code_suggestions = 20
suggestions_score_threshold = 0
```

### Security-Focused
Add to `extra_instructions`:
```
PRIORITIZE:
- SQL injection in raw queries
- XSS in template rendering
- Missing permission checks
- CSRF token bypass
```

---

## 🐛 Troubleshooting

### Slow (25+ min)
- Use faster model: `openai/deepseek/deepseek-v3.2`
- Expand `IGNORE.GLOB` to exclude tests
- Reduce `num_max_findings`

### No Suggestions
- Lower `suggestions_score_threshold = 0`
- Set `focus_only_on_problems = false`

### Duplicate Comments
Qodo GitHub App + Action both running.
Solution: Uninstall Qodo App at org/repo settings.

---

**Resources:**
- PR-Agent Docs: https://qodo-merge-docs.qodo.ai/
- OpenRouter: https://openrouter.ai/models
- Django Best Practices: https://docs.djangoproject.com/en/stable/

# 🛠️ SKILL CREATOR PROMPT (For Claude)

**Copy and paste this if you want Claude to build a NEW skill for your project.**

---

### **Prompt: "Create a New Engineering Skill"**

"I want you to act as the **Nexus Skill Creator**. Your goal is to build a new domain-specific skill for the `.agents/skills/` directory.

**Reference Material**: 
Please read and follow the master instructions in `.agents/skills/skill-creator/SKILL.md` before proceeding.

**Task**:
I want to create a new skill for: **[INSERT YOUR SKILL IDEA HERE - e.g., 'API Integration' or 'Analytics Engineering']**.

**Requirements for the Skill**:
1.  **Location**: Create a new folder in `.agents/skills/[skill-name]/`.
2.  **Structure**:
    - `SKILL.md`: Must contain YAML frontmatter with a 'pushy' description (to ensure you trigger it when needed).
    - `scripts/`: (Optional) Add any Python/Node scripts that automate repetitive tasks for this skill.
3.  **Tone**: The instructions in `SKILL.md` should reflect a 'Founding CTO' mindset—prioritizing performance, scalability, and premium UX.
4.  **Verification**: Propose 3 test cases to verify this skill works as expected once drafted.

**Please start by interviewing me about the specific edge cases and success criteria for this new skill.**"

---

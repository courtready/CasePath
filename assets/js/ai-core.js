// ===============================
// CASEPATH AI CORE (NATIONAL)
// ===============================

// ---------- MODELS ----------
const AI_MODELS = {
  FAST: "gpt-5.3-instant",
  SMART: "gpt-5.3"
}

// ---------- STATE LEGAL CONTEXT ----------
export function getLegalContext(state = "NSW") {
  const contexts = {
    NSW: {
      jurisdiction: "NSW",
      protectionOrder: "Apprehended Violence Order (AVO)",
      courtFamily: "Federal Circuit and Family Court of Australia",
      courtState: "Local Court of NSW"
    },
    QLD: {
      jurisdiction: "QLD",
      protectionOrder: "Domestic Violence Order (DVO)",
      courtFamily: "Federal Circuit and Family Court of Australia",
      courtState: "Magistrates Court of Queensland"
    },
    VIC: {
      jurisdiction: "VIC",
      protectionOrder: "Family Violence Intervention Order (FVIO)",
      courtFamily: "Federal Circuit and Family Court of Australia",
      courtState: "Magistrates' Court of Victoria"
    },
    WA: {
      jurisdiction: "WA",
      protectionOrder: "Family Violence Restraining Order (FVRO)",
      courtFamily: "Family Court of Western Australia",
      courtState: "Magistrates Court of Western Australia"
    },
    SA: {
      jurisdiction: "SA",
      protectionOrder: "Intervention Order",
      courtFamily: "Federal Circuit and Family Court of Australia",
      courtState: "Magistrates Court of South Australia"
    },
    TAS: {
      jurisdiction: "TAS",
      protectionOrder: "Family Violence Order (FVO)",
      courtFamily: "Federal Circuit and Family Court of Australia",
      courtState: "Magistrates Court of Tasmania"
    },
    ACT: {
      jurisdiction: "ACT",
      protectionOrder: "Protection Order",
      courtFamily: "Federal Circuit and Family Court of Australia",
      courtState: "Magistrates Court of the ACT"
    },
    NT: {
      jurisdiction: "NT",
      protectionOrder: "Domestic Violence Order (DVO)",
      courtFamily: "Federal Circuit and Family Court of Australia",
      courtState: "Local Court of the Northern Territory"
    }
  }

  return contexts[state] || contexts.NSW
}

// ---------- INTENT ----------
export function classifyIntent(input) {
  const t = input.toLowerCase()

  if (t.includes("affidavit") || t.includes("statement")) return "document"
  if (t.includes("parenting")) return "parenting_orders"
  if (t.includes("violence") || t.includes("order")) return "protection"
  if (t.includes("court") || t.includes("law")) return "legal_info"

  return "general"
}

// ---------- MODEL ----------
export function selectModel(intent) {
  return intent === "general" ? AI_MODELS.FAST : AI_MODELS.SMART
}

// ---------- PROMPT ----------
export function buildPrompt({ input, context }) {
  return `
You are a structured legal support assistant for Australia.

User jurisdiction: ${context.jurisdiction}

STRICT RULES:
- Do NOT give legal advice
- Do NOT invent facts
- Use correct legal terminology for the jurisdiction
- Protection order term: ${context.protectionOrder}
- Do NOT mix terminology between states
- Keep tone neutral and structured

User input:
${input}

Respond EXACTLY in this structure:

1. What this means
2. How it applies in ${context.jurisdiction}
3. What the user can do next
4. What the court considers (if relevant)
`
}

// ---------- ASSISTANT ----------
export async function runAssistant({ input, state }) {
  const context = getLegalContext(state)
  const intent = classifyIntent(input)
  const model = selectModel(intent)

  const prompt = buildPrompt({ input, context })
  return callAI(model, prompt)
}

// ---------- DOCUMENT HELPER ----------
export async function runDocumentHelper({ input, state }) {
  const context = getLegalContext(state)

  const prompt = `
Rewrite into a court-ready statement.

STRICT:
- No new facts
- No emotion
- Chronological
- Neutral tone
- Use ${context.jurisdiction} terminology (${context.protectionOrder})

INPUT:
${input}

OUTPUT:

BACKGROUND

INCIDENTS (chronological)

CONCERNS

ORDERS SOUGHT
`

  const result = await callAI(AI_MODELS.SMART, prompt)
  return validate(result)
}

// ---------- PARENTING ----------
export async function runParentingAnalysis({ partyA, partyB, state }) {
  const context = getLegalContext(state)

  const prompt = `
Compare parenting proposals.

State: ${context.jurisdiction}

A:
${partyA}

B:
${partyB}

Return:

1. Key Differences
2. Impact on Child
3. Conflict Risks
4. Court Considerations
5. Neutral Compromise Options
`

  return callAI(AI_MODELS.SMART, prompt)
}

// ---------- VALIDATION ----------
function validate(text) {
  const bad = ["i think", "maybe", "probably"]

  for (let w of bad) {
    if (text.toLowerCase().includes(w)) {
      return "⚠️ Validation failed. Retry."
    }
  }

  return text
}

// ---------- API CALL ----------
async function callAI(model, prompt) {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt })
  })

  const data = await res.json()
  return data.output
}

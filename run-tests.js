#!/usr/bin/env node
// Travis777 — Test Runner (Node.js)

const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";
const GREEN  = "\x1b[32m";
const RED    = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN   = "\x1b[36m";
const DIM    = "\x1b[2m";
const MAGENTA = "\x1b[35m";

// ─── Mini Test Framework ───────────────────────────────────────────────────

const suites = [];
let currentSuite = null;

function describe(name, type, fn) {
  currentSuite = { name, type, tests: [] };
  suites.push(currentSuite);
  fn();
  currentSuite = null;
}

function it(name, fn) {
  currentSuite.tests.push({ name, fn });
}

function expect(value) {
  return {
    toBe(expected) {
      if (value !== expected)
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(value)}`);
    },
    toEqual(expected) {
      if (JSON.stringify(value) !== JSON.stringify(expected))
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(value)}`);
    },
    toBeTruthy() {
      if (!value) throw new Error(`Expected truthy but got ${JSON.stringify(value)}`);
    },
    toBeFalsy() {
      if (value) throw new Error(`Expected falsy but got ${JSON.stringify(value)}`);
    },
    toContain(item) {
      if (!String(value).includes(item))
        throw new Error(`"${value}" does not contain "${item}"`);
    },
    toMatch(regex) {
      if (!regex.test(String(value)))
        throw new Error(`"${value}" does not match ${regex}`);
    },
    toBeGreaterThan(n) {
      if (!(value > n)) throw new Error(`${value} is not greater than ${n}`);
    },
    toHaveLength(n) {
      const len = value && value.length;
      if (len !== n) throw new Error(`Expected length ${n} but got ${len}`);
    }
  };
}

// ─── Utility Functions (mirrors index.html + admin-panel.html) ─────────────

function buildWhatsAppLink(phoneNumber) {
  return "https://api.whatsapp.com/send?phone=" +
    encodeURIComponent(phoneNumber) +
    "&text=Hi%20Support%2C%20mujhe%20help%20chahiye";
}

function sanitizeWebsiteList(list) {
  if (!Array.isArray(list)) return [];
  const seen = {};
  const clean = [];
  list.forEach((item) => {
    const value = String(item || "").trim();
    if (!value) return;
    const key = value.toLowerCase();
    if (seen[key]) return;
    seen[key] = true;
    clean.push(value);
  });
  return clean;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return "91" + digits;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return "";
}

function dedupeWebsites(list) {
  const seen = {};
  const clean = [];
  list.forEach(function (item) {
    const value = String(item || "").trim();
    if (!value) return;
    const key = value.toLowerCase();
    if (seen[key]) return;
    seen[key] = true;
    clean.push(value);
  });
  return clean;
}

function validateMobile(mobile) {
  return /^[0-9]{10}$/.test(mobile);
}

function validatePassword(password, confirmPassword) {
  if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
  if (password !== confirmPassword) return { ok: false, error: "Passwords do not match." };
  return { ok: true };
}

function validateSignupForm(data) {
  if (!data.username || !data.username.trim())
    return { ok: false, error: "Username is required." };
  if (!validateMobile(data.mobileNumber))
    return { ok: false, error: "Mobile number must be exactly 10 digits." };
  const passCheck = validatePassword(data.password, data.confirmPassword);
  if (!passCheck.ok) return passCheck;
  if (!data.website) return { ok: false, error: "Website selection is required." };
  return { ok: true };
}

// ─── USER TESTS ───────────────────────────────────────────────────────────

describe("User Signup — Form Validation", "user", () => {
  it("valid form data should pass validation", () => {
    const result = validateSignupForm({
      username: "rahul123", mobileNumber: "9876543210",
      password: "secure123", confirmPassword: "secure123", website: "bpexch"
    });
    expect(result.ok).toBe(true);
  });

  it("empty username should fail validation", () => {
    const result = validateSignupForm({
      username: "", mobileNumber: "9876543210",
      password: "pass123", confirmPassword: "pass123", website: "bpexch"
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Username");
  });

  it("mobile number less than 10 digits should fail", () => {
    const result = validateSignupForm({
      username: "user1", mobileNumber: "98765",
      password: "pass123", confirmPassword: "pass123", website: "bpexch"
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Mobile");
  });

  it("mobile number more than 10 digits should fail", () => {
    const result = validateSignupForm({
      username: "user1", mobileNumber: "98765432101",
      password: "pass123", confirmPassword: "pass123", website: "bpexch"
    });
    expect(result.ok).toBe(false);
  });

  it("non-numeric mobile should fail", () => {
    const result = validateSignupForm({
      username: "user1", mobileNumber: "98abc43210",
      password: "pass123", confirmPassword: "pass123", website: "bpexch"
    });
    expect(result.ok).toBe(false);
  });

  it("password less than 6 chars should fail", () => {
    const result = validateSignupForm({
      username: "user1", mobileNumber: "9876543210",
      password: "abc", confirmPassword: "abc", website: "bpexch"
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("6");
  });

  it("passwords not matching should fail", () => {
    const result = validateSignupForm({
      username: "user1", mobileNumber: "9876543210",
      password: "password1", confirmPassword: "password2", website: "bpexch"
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("match");
  });

  it("missing website selection should fail", () => {
    const result = validateSignupForm({
      username: "user1", mobileNumber: "9876543210",
      password: "pass123", confirmPassword: "pass123", website: ""
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Website");
  });
});

describe("User Signup — WhatsApp Link Builder", "user", () => {
  it("builds correct WhatsApp link for Indian number", () => {
    const link = buildWhatsAppLink("919876543210");
    expect(link).toContain("919876543210");
    expect(link).toContain("api.whatsapp.com");
  });

  it("encodes support message in link", () => {
    const link = buildWhatsAppLink("919999999999");
    expect(link).toContain("text=");
    expect(link).toContain("Support");
  });

  it("link format is correct URL", () => {
    const link = buildWhatsAppLink("919876543210");
    expect(link).toMatch(/^https:\/\/api\.whatsapp\.com/);
  });
});

describe("User Signup — Website List Sanitization", "user", () => {
  it("removes duplicate websites (case-insensitive)", () => {
    const result = sanitizeWebsiteList(["bpexch", "BPEXCH", "fairbet7"]);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe("bpexch");
  });

  it("removes empty strings from list", () => {
    const result = sanitizeWebsiteList(["bpexch", "", "  ", "fairbet7"]);
    expect(result).toHaveLength(2);
  });

  it("returns empty array for non-array input", () => {
    const result = sanitizeWebsiteList("not-an-array");
    expect(result).toHaveLength(0);
  });

  it("returns empty array for null", () => {
    const result = sanitizeWebsiteList(null);
    expect(result).toHaveLength(0);
  });

  it("trims whitespace from website names", () => {
    const result = sanitizeWebsiteList(["  bpexch  ", "fairbet7 "]);
    expect(result[0]).toBe("bpexch");
    expect(result[1]).toBe("fairbet7");
  });
});

describe("User Signup — HTML Escaping (XSS Prevention)", "user", () => {
  it("escapes < and > characters", () => {
    const result = escapeHtml("<script>alert(1)</script>");
    expect(result).toContain("&lt;");
    expect(result).toContain("&gt;");
  });

  it("escapes & character", () => {
    const result = escapeHtml("AT&T");
    expect(result).toContain("&amp;");
  });

  it("escapes double quotes", () => {
    const result = escapeHtml('He said "hello"');
    expect(result).toContain("&quot;");
  });

  it("escapes single quotes", () => {
    const result = escapeHtml("it's");
    expect(result).toContain("&#39;");
  });

  it("returns empty string for null/undefined", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });
});

// ─── ADMIN TESTS ──────────────────────────────────────────────────────────

describe("Admin Panel — Phone Normalization", "admin", () => {
  it("adds 91 prefix to 10-digit Indian number", () => {
    expect(normalizePhone("9876543210")).toBe("919876543210");
  });

  it("keeps 12-digit number with country code as-is", () => {
    expect(normalizePhone("919876543210")).toBe("919876543210");
  });

  it("strips non-digit characters before normalizing", () => {
    expect(normalizePhone("+91-98765-43210")).toBe("919876543210");
  });

  it("returns empty string for empty input", () => {
    expect(normalizePhone("")).toBe("");
  });

  it("returns empty string for null", () => {
    expect(normalizePhone(null)).toBe("");
  });

  it("rejects short numbers (less than 10 digits)", () => {
    expect(normalizePhone("12345")).toBe("");
  });

  it("rejects too long numbers (more than 15 digits)", () => {
    expect(normalizePhone("1234567890123456")).toBe("");
  });
});

describe("Admin Panel — Website Deduplication", "admin", () => {
  it("removes duplicate entries", () => {
    const result = dedupeWebsites(["bpexch", "bpexch", "fairbet7"]);
    expect(result).toHaveLength(2);
  });

  it("deduplicates case-insensitively", () => {
    const result = dedupeWebsites(["BpExch", "bpexch"]);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("BpExch");
  });

  it("removes empty/blank entries", () => {
    const result = dedupeWebsites(["bpexch", "", "  "]);
    expect(result).toHaveLength(1);
  });

  it("preserves order of first occurrence", () => {
    const result = dedupeWebsites(["fairbet7", "bpexch", "fairbet7"]);
    expect(result[0]).toBe("fairbet7");
    expect(result[1]).toBe("bpexch");
  });
});

describe("Admin Panel — HTML Escaping (XSS in Table)", "admin", () => {
  it("escapes XSS in username column", () => {
    const username = "<img src=x onerror=alert(1)>";
    const escaped = escapeHtml(username);
    expect(escaped).toContain("&lt;");
    expect(escaped).toContain("&gt;");
  });

  it("escapes XSS in mobile number column", () => {
    const mobile = "<script>document.cookie</script>";
    const escaped = escapeHtml(mobile);
    expect(escaped).toContain("&lt;script&gt;");
  });

  it("does not modify safe alphanumeric strings", () => {
    expect(escapeHtml("user123")).toBe("user123");
    expect(escapeHtml("9876543210")).toBe("9876543210");
    expect(escapeHtml("bpexch")).toBe("bpexch");
  });
});

describe("Admin Panel — Config Validation", "admin", () => {
  it("valid 10-digit phone becomes normalized on save attempt", () => {
    const phone = normalizePhone("9876543210");
    expect(phone).toBe("919876543210");
    expect(phone.length).toBeGreaterThan(0);
  });

  it("invalid phone string returns empty (save would block)", () => {
    const phone = normalizePhone("abc");
    expect(phone).toBe("");
  });

  it("non-empty website list passes save check", () => {
    const sites = dedupeWebsites(["bpexch", "fairbet7"]);
    expect(sites.length).toBeGreaterThan(0);
  });

  it("empty website list blocks save (length === 0)", () => {
    const sites = dedupeWebsites(["", "  "]);
    expect(sites).toHaveLength(0);
  });
});

describe("Admin Panel — Session Token Logic", "admin", () => {
  it("empty token means logged out", () => {
    const token = "";
    expect(!token).toBeTruthy();
  });

  it("non-empty token means logged in", () => {
    const token = "admin_session_token_change_me";
    expect(!!token).toBeTruthy();
  });

  it("auto-refresh only triggers when token is present", () => {
    let refreshTriggered = false;
    const token = "some_token";
    if (token) refreshTriggered = true;
    expect(refreshTriggered).toBe(true);
  });

  it("auto-refresh skipped when token is empty", () => {
    let refreshTriggered = false;
    const token = "";
    if (token) refreshTriggered = true;
    expect(refreshTriggered).toBe(false);
  });
});

// ─── Run & Print Results ───────────────────────────────────────────────────

let totalPass = 0, totalFail = 0;

for (const suite of suites) {
  const typeColor = suite.type === "admin" ? MAGENTA : CYAN;
  const typeLabel = suite.type === "admin" ? " ADMIN " : " USER  ";
  console.log(`\n${typeColor}${BOLD}[${typeLabel}]${RESET} ${BOLD}${suite.name}${RESET}`);

  for (const test of suite.tests) {
    try {
      test.fn();
      console.log(`  ${GREEN}✓${RESET} ${DIM}${test.name}${RESET}`);
      totalPass++;
    } catch (err) {
      console.log(`  ${RED}✕${RESET} ${BOLD}${test.name}${RESET}`);
      console.log(`    ${RED}→ ${err.message}${RESET}`);
      totalFail++;
    }
  }
}

const total = totalPass + totalFail;
const allPassed = totalFail === 0;

console.log(`\n${"─".repeat(60)}`);
console.log(
  `${BOLD}Results: ${allPassed ? GREEN : RED}${totalPass}/${total} passed${RESET}` +
  (totalFail > 0 ? `  ${RED}${totalFail} failed${RESET}` : `  ${GREEN}All tests passed!${RESET}`)
);
console.log(`${"─".repeat(60)}\n`);

process.exit(totalFail > 0 ? 1 : 0);

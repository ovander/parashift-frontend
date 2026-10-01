<template>
  <div class="landing">

    <!-- ── Navigation ──────────────────────────────────────────────────── -->
    <nav class="nav">
      <div class="container nav-inner">
        <RouterLink to="/" class="logo">
          <img src="/logo-dark.png" alt="ParaShift" class="logo-img" />
        </RouterLink>
        <ul class="nav-links">
          <li><a href="#features">Features</a></li>
          <li><a href="#how">How it works</a></li>
          <li><a href="#roles">For your team</a></li>
          <li><a href="#ai">AI engine</a></li>
        </ul>
        <div class="nav-cta">
          <RouterLink to="/login" class="btn btn-outline">Sign in</RouterLink>
          <a href="#cta" class="btn btn-primary">Request demo</a>
        </div>
      </div>
    </nav>

    <!-- ── Hero ────────────────────────────────────────────────────────── -->
    <section class="hero" id="hero">
      <div class="container hero-grid">
        <div>
          <div class="hero-eyebrow">
            <span class="dot" />
            Now in production
          </div>
          <h1>Shift planning that<br>actually enforces the rules</h1>
          <p class="hero-sub">
            AI-assisted scheduling, real-time compliance enforcement,
            and a self-service workflow for every role — built specifically
            for parapharmacies and regulated retail.
          </p>
          <div class="hero-actions">
            <a href="#cta" class="btn btn-primary">Request a demo →</a>
            <a href="#how" class="btn btn-outline">See how it works</a>
          </div>
          <div class="hero-stats">
            <div>
              <div class="stat-val">&lt; 10 min</div>
              <div class="stat-label">to publish a week's schedule</div>
            </div>
            <div>
              <div class="stat-val">0 invalid</div>
              <div class="stat-label">assignments reach the DB</div>
            </div>
            <div>
              <div class="stat-val">AI + rules</div>
              <div class="stat-label">work together, never against</div>
            </div>
          </div>
        </div>

        <!-- Planner UI mock -->
        <div class="ui-mock">
          <div class="mock-bar">
            <span class="mock-dot" style="background:#ff5f57" />
            <span class="mock-dot" style="background:#ffbd2e" />
            <span class="mock-dot" style="background:#28c840" />
            <span class="mock-url">parashift.io/planner · Week 14</span>
          </div>
          <div class="mock-body">
            <div class="mock-header">
              <div class="mock-th emp">Employee</div>
              <div class="mock-th">Mon</div>
              <div class="mock-th">Tue</div>
              <div class="mock-th">Wed</div>
              <div class="mock-th">Thu</div>
              <div class="mock-th">Fri</div>
            </div>
            <div v-for="row in plannerRows" :key="row.initials" class="mock-row">
              <div class="mock-emp">
                <div class="mock-avatar" :style="{ background: row.color }">{{ row.initials }}</div>
                {{ row.name }}
              </div>
              <div v-for="(cell, i) in row.cells" :key="i" class="mock-cell">
                <div v-if="cell" class="mock-shift" :class="cell.type">
                  {{ cell.label }}<span v-if="cell.badge" class="mock-badge" :class="cell.badge === 'warn' ? 'badge-amber' : 'badge-red'">{{ cell.badge === 'warn' ? '⚠' : '✕' }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="mock-ai-pill">
            <span>✦</span> AI suggestions ready — 3 shifts unassigned
          </div>
        </div>
      </div>
    </section>

    <!-- ── Trust bar ────────────────────────────────────────────────────── -->
    <div class="trust">
      <div class="container trust-inner">
        <span class="trust-label">Trusted by teams at</span>
        <div class="trust-logos">
          <span v-for="(name, i) in trustNames" :key="i" class="trust-logo">{{ name }}</span>
        </div>
      </div>
    </div>

    <!-- ── Features ─────────────────────────────────────────────────────── -->
    <section id="features" class="section">
      <div class="container">
        <div class="section-header">
          <span class="label">Core platform</span>
          <h2>Everything you need to run compliant schedules at scale</h2>
          <p>Purpose-built for the daily realities of regulated retail — not adapted from a generic HR tool.</p>
        </div>
        <div class="features-grid">
          <div v-for="f in features" :key="f.title" class="feature-card">
            <div class="feature-icon">{{ f.icon }}</div>
            <h3>{{ f.title }}</h3>
            <p>{{ f.body }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── How it works ──────────────────────────────────────────────────── -->
    <section id="how" class="section section-sky">
      <div class="container">
        <div class="section-header">
          <span class="label">How it works</span>
          <h2>From blank week to published schedule in under 10 minutes</h2>
          <p>Designed for the manager who needs to act fast — not navigate a menu buried five levels deep.</p>
        </div>
        <div class="steps">
          <div v-for="(step, i) in steps" :key="i" class="step">
            <div class="step-num">{{ i + 1 }}</div>
            <h3>{{ step.title }}</h3>
            <p>{{ step.body }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Roles ─────────────────────────────────────────────────────────── -->
    <section id="roles" class="section">
      <div class="container">
        <div class="section-header">
          <span class="label">Built for every role</span>
          <h2>One platform, two experiences</h2>
          <p>Managers get full planning control. Employees get transparency and self-service — no WhatsApp chains needed.</p>
        </div>
        <div class="roles-grid">
          <div v-for="role in roles" :key="role.tag" class="role-card">
            <div class="role-header" :class="role.cls">
              <div class="role-tag">{{ role.tag }}</div>
              <h3>{{ role.title }}</h3>
              <p>{{ role.sub }}</p>
            </div>
            <div class="role-body">
              <div v-for="feat in role.features" :key="feat" class="role-feature">
                <div class="check">✓</div>
                <p>{{ feat }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── AI ────────────────────────────────────────────────────────────── -->
    <section id="ai" class="section section-dark">
      <div class="container">
        <div class="ai-inner">
          <div>
            <span class="label" style="color:#cce0fa">AI engine</span>
            <h2 style="color:#fff">Smart suggestions.<br>Deterministic guardrails.</h2>
            <p style="color:rgba(255,255,255,.7);margin-top:16px">
              The AI layer augments the manager — it never overrides the rule engine.
              Every suggestion still passes through the same compliance checks as a manual assignment.
            </p>
            <ul class="ai-points">
              <li v-for="pt in aiPoints" :key="pt.title" class="ai-point">
                <span class="ai-icon">{{ pt.icon }}</span>
                <div>
                  <strong>{{ pt.title }}</strong>
                  <span>{{ pt.body }}</span>
                </div>
              </li>
            </ul>
          </div>

          <!-- Suggestion card mock -->
          <div class="suggestion-card">
            <div class="sug-header">
              <span class="sug-title">✦ AI suggestions · Shift 14:00–20:00</span>
              <span class="sug-badge">3 candidates</span>
            </div>
            <div v-for="(s, i) in aiSuggestions" :key="i" class="sug-item" :class="{ top: i === 0 }">
              <div class="sug-avatar" :style="{ background: s.color }">{{ s.initials }}</div>
              <div class="sug-name">
                <strong>{{ s.name }}</strong>
                <span>{{ s.sub }}</span>
              </div>
              <button class="sug-btn" :class="{ ghost: i > 0 }">{{ i === 0 ? 'Assign ✓' : 'Assign' }}</button>
            </div>
            <div class="sug-footer">
              Rule engine runs on every assignment — accept any suggestion with confidence.
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Testimonials ───────────────────────────────────────────────────── -->
    <section id="testimonials" class="section section-grey">
      <div class="container">
        <div class="section-header">
          <span class="label">From the field</span>
          <h2>What scheduling teams say</h2>
        </div>
        <div class="testimonials-grid">
          <div v-for="t in testimonials" :key="t.name" class="testimonial">
            <div class="stars">★★★★★</div>
            <blockquote>{{ t.quote }}</blockquote>
            <div class="testimonial-author">
              <div class="testimonial-avatar" :style="{ background: t.color }">{{ t.initials }}</div>
              <div>
                <div class="author-name">{{ t.name }}</div>
                <div class="author-role">{{ t.role }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── CTA ───────────────────────────────────────────────────────────── -->
    <section id="cta" class="section section-dark" style="text-align:center">
      <div class="container">
        <h2 style="color:#fff;max-width:600px;margin:0 auto 20px">Ready to close the spreadsheet for good?</h2>
        <p style="color:rgba(255,255,255,.65);max-width:480px;margin:0 auto 40px;font-size:1.05rem">
          See ParaShift running on your store's data — setup takes less than a day.
        </p>
        <div class="cta-actions">
          <a href="mailto:hello@parashift.io" class="btn btn-primary" style="font-size:1rem;padding:16px 32px">Request a demo →</a>
          <RouterLink to="/login" class="btn btn-ghost" style="font-size:1rem;padding:16px 32px">Sign in</RouterLink>
        </div>
        <p class="cta-note">No credit card required · Onboarding included · GDPR compliant</p>
      </div>
    </section>

    <!-- ── Footer ─────────────────────────────────────────────────────────── -->
    <footer class="footer">
      <div class="container">
        <div class="footer-inner">
          <div class="footer-brand">
            <img src="/logo-dark.png" alt="ParaShift" class="footer-logo-img" />
            <p>Workforce scheduling for parapharmacies and regulated retail. Compliant by design, fast by choice.</p>
          </div>
          <div class="footer-col">
            <h4>Product</h4>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#ai">AI engine</a></li>
              <li><a href="#roles">For managers</a></li>
              <li><a href="#roles">For employees</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>Company</h4>
            <ul>
              <li><a href="#">About</a></li>
              <li><a href="#">Blog</a></li>
              <li><a href="mailto:hello@parashift.io">Contact</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>Legal</h4>
            <ul>
              <li><a href="#">Privacy policy</a></li>
              <li><a href="#">Terms of service</a></li>
              <li><a href="#">GDPR</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© 2026 ParaShift. All rights reserved.</span>
          <span>Made with care in France 🇫🇷</span>
        </div>
      </div>
    </footer>

  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'

const plannerRows = [
  { initials: 'MD', name: 'M. Dupont',  color: '#1d6fce', cells: [
    { type: 'blue',  label: '09:00–17:00' }, { type: 'blue', label: '09:00–17:00' },
    null, { type: 'blue', label: '09:00–17:00' }, { type: 'amber', label: '08:00–16:00', badge: 'warn' },
  ]},
  { initials: 'SL', name: 'S. Laurent', color: '#16a34a', cells: [
    null, { type: 'green', label: '10:00–18:00' }, { type: 'green', label: '10:00–18:00' },
    { type: 'green', label: '10:00–18:00' }, { type: 'green', label: '10:00–18:00' },
  ]},
  { initials: 'AB', name: 'A. Bernard', color: '#7c3aed', cells: [
    { type: 'blue', label: '08:00–16:00' }, null,
    { type: 'red', label: '09:00–17:00', badge: 'block' }, null, { type: 'blue', label: '08:00–16:00' },
  ]},
  { initials: 'CR', name: 'C. Roux',    color: '#0891b2', cells: [
    { type: 'green', label: '14:00–20:00' }, { type: 'green', label: '14:00–20:00' },
    { type: 'green', label: '14:00–20:00' }, null, { type: 'green', label: '14:00–20:00' },
  ]},
]

const trustNames = ['Pharmacie du Centre', 'PharmaGroup SAS', 'Officine Express', 'Réseau Santé+', 'PharmaCoop']

const features = [
  { icon: '📅', title: 'Drag-and-drop weekly planner', body: 'Resource calendar with one column per employee. Drag unassigned shifts into place — the backend validates instantly while you work.' },
  { icon: '🛡️', title: 'Real-time rule engine', body: 'BLOCKING violations prevent invalid assignments and roll back automatically. WARNINGs stay live with an amber indicator so managers can make an informed call.' },
  { icon: '✦',  title: 'AI shift suggestions', body: 'Ranked employee recommendations with plain-language reasoning. One click to assign — the rule engine still runs so you can never skip compliance.' },
  { icon: '🗺️', title: 'Coverage heatmap', body: 'Day × hour staffing ratio updated silently after every assignment. Gaps surface in red, overstaffing in amber — coverage is never a surprise.' },
  { icon: '📋', title: 'A/B template editor', body: 'Define repeating shift patterns and publish them up to four weeks ahead. One confirmation dialog before any destructive generation.' },
  { icon: '🔒', title: 'Single sign-on, no token in the browser', body: 'Sign-in through Socrate (OAuth 2.1); the server keeps the tokens, the browser only an HttpOnly session cookie, and strict per-store tenant isolation keeps each location\'s data fully separate.' },
]

const steps = [
  { title: 'Open the planner', body: 'The resource calendar loads with the current ISO week, employees as columns, and unassigned shifts in the side panel.' },
  { title: 'Assign shifts', body: 'Drag a shift onto an employee. The assignment is committed optimistically while the backend validates in parallel — instant feedback, no waiting.' },
  { title: 'Review rule feedback', body: 'Violations appear as severity badges on the calendar. BLOCKING issues auto-revert. WARNINGs let you decide. Inspect the reason inline.' },
  { title: 'Publish', body: 'Check the coverage heatmap, approve any pending leave or swap requests, then publish the template for the next 1–4 weeks.' },
]

const roles = [
  {
    tag: 'For managers', cls: 'manager', title: 'Plan, enforce, and publish — without the spreadsheet',
    sub: 'Full scheduling authority with guardrails that prevent mistakes before they reach payroll.',
    features: [
      'Drag-and-drop planner with live rule validation',
      'AI-powered suggestions ranked by fit and availability',
      'Coverage heatmap updated after every assignment',
      'Leave and shift-swap approval queue in one view',
      'A/B template publishing for repeating cycles',
      'Configurable rules per store (hours, rest, qualifications)',
    ],
  },
  {
    tag: 'For employees', cls: 'employee', title: 'See your week, request leave, propose swaps — in seconds',
    sub: 'A self-service portal that reduces manager interruptions and gives employees real ownership of their schedule.',
    features: [
      'Personal schedule view with published shifts only',
      'Leave request submission with type and date selection',
      'Shift-swap proposals sent directly to the manager queue',
      'Real-time status updates on pending requests',
      'Mobile-friendly — works on any device, no app install',
      'No access to other employees\' personal data',
    ],
  },
]

const aiPoints = [
  { icon: '🎯', title: 'Ranked employee recommendations', body: 'Scored by contract fit, weekly hours remaining, and existing violations — not a black box.' },
  { icon: '🔄', title: 'Deterministic fallback', body: 'When the LLM is unavailable the heuristic engine takes over silently — scheduling never stops.' },
  { icon: '💡', title: 'Proactive insights', body: 'Coverage gaps, rest violations, workload imbalances, and cost signals surfaced before they become problems.' },
  { icon: '⚡', title: 'One-click assignment', body: 'Accept a suggestion in a single click. The rule engine fires, the heatmap updates, done.' },
]

const aiSuggestions = [
  { initials: 'SL', name: 'Sophie Laurent', sub: 'Best fit · 31 h this week, 7 h under contract', color: '#16a34a' },
  { initials: 'CR', name: 'Claire Roux',    sub: 'Good fit · 35 h this week, 3 h under contract', color: '#0891b2' },
  { initials: 'AB', name: 'Arnaud Bernard', sub: 'Available · min-rest warning if assigned',       color: '#7c3aed' },
]

const testimonials = [
  { initials: 'NV', color: '#1d6fce', name: 'Nathalie Vidal',  role: 'Pharmacy Manager · Lyon',
    quote: '"We went from 2 hours of WhatsApp coordination every Sunday evening to about 15 minutes in ParaShift. The rule engine catching overlap errors automatically saved us from a serious scheduling mistake within the first week."' },
  { initials: 'MB', color: '#16a34a', name: 'Marc Beaumont',   role: 'Operations Director · PharmaGroup SAS',
    quote: '"The coverage heatmap changed how I think about planning. I can see understaffed slots the moment I assign someone, not after I\'ve already sent the schedule to the team."' },
  { initials: 'CR', color: '#7c3aed', name: 'Céline Rousseau', role: 'Head Pharmacist · Officine Express',
    quote: '"Our préparateurs love the self-service leave requests. They submit, we approve in the queue, it\'s reflected on the planner immediately. No more emails, no more post-its on the office door."' },
]
</script>

<style scoped>
/* ── Tokens ──────────────────────────────────────────────────────────── */
.landing {
  --navy:      #0f2d5e;
  --navy-mid:  #1a3f7a;
  --blue:      #1d6fce;
  --blue-light:#3b8eea;
  --sky:       #e8f2fd;
  --sky-dark:  #cce0fa;
  --grey-50:   #f8fafc;
  --grey-100:  #f1f5f9;
  --grey-200:  #e2e8f0;
  --grey-400:  #94a3b8;
  --grey-600:  #475569;
  --grey-800:  #1e293b;
  --green:     #16a34a;
  --radius:    12px;
  --shadow:    0 4px 16px rgba(15,45,94,.10);
  --shadow-lg: 0 20px 60px rgba(15,45,94,.15);
  font-family: 'Inter', system-ui, sans-serif;
  color: var(--grey-800);
  line-height: 1.6;
}

/* ── Layout ──────────────────────────────────────────────────────────── */
.container { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
.section    { padding: 96px 0; background: #fff; }
.section-sky  { background: linear-gradient(180deg, var(--sky) 0%, #fff 100%); }
.section-grey { background: var(--grey-50); }
.section-dark { background: linear-gradient(135deg, var(--navy) 0%, #0d4f9e 100%); position: relative; overflow: hidden; }
.section-dark::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 80% 60% at 70% 40%, rgba(29,111,206,.22) 0%, transparent 70%);
  pointer-events: none;
}
.section-dark > .container { position: relative; z-index: 1; }

.section-header { text-align: center; max-width: 640px; margin: 0 auto 64px; }
.section-header p { margin-top: 16px; font-size: 1.1rem; color: var(--grey-600); }

h2 { font-size: clamp(1.8rem, 3.5vw, 2.6rem); font-weight: 700; color: var(--navy); letter-spacing: -.02em; line-height: 1.2; }
h3 { font-size: 1.1rem; font-weight: 600; color: var(--navy); line-height: 1.3; margin-bottom: 8px; }
p  { color: var(--grey-600); }

.label {
  display: inline-block;
  font-size: .75rem; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
  color: var(--blue); margin-bottom: 14px;
}

/* ── Buttons ─────────────────────────────────────────────────────────── */
.btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 24px; border-radius: 6px;
  font-size: .9rem; font-weight: 600; cursor: pointer;
  border: none; text-decoration: none; transition: all .18s;
}
.btn-primary { background: var(--blue); color: #fff; box-shadow: 0 2px 12px rgba(29,111,206,.35); }
.btn-primary:hover { background: var(--blue-light); transform: translateY(-1px); }
.btn-outline { background: transparent; color: #fff; border: 1.5px solid rgba(255,255,255,.45); }
.btn-outline:hover { background: rgba(255,255,255,.12); border-color: rgba(255,255,255,.8); }
.btn-ghost { background: var(--sky); color: var(--navy); }
.btn-ghost:hover { background: var(--sky-dark); }

/* ── Nav ─────────────────────────────────────────────────────────────── */
.nav {
  position: sticky; top: 0; z-index: 100;
  background: rgba(15,45,94,.97); backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.nav-inner { display: flex; align-items: center; justify-content: space-between; height: 64px; gap: 32px; }
.logo { display: flex; align-items: center; text-decoration: none; }
.logo-img { height: 30px; width: auto; display: block; }
.footer-logo-img { height: 28px; width: auto; display: block; margin-bottom: 12px; }
.nav-links { display: flex; align-items: center; gap: 28px; list-style: none; padding: 0; margin: 0; }
.nav-links a { font-size: .88rem; font-weight: 500; color: rgba(255,255,255,.7); text-decoration: none; transition: color .15s; }
.nav-links a:hover { color: #fff; }
.nav-cta { display: flex; align-items: center; gap: 10px; }
.nav-cta .btn { padding: 9px 18px; font-size: .85rem; }

/* ── Hero ────────────────────────────────────────────────────────────── */
.hero {
  background: linear-gradient(135deg, var(--navy) 0%, var(--navy-mid) 55%, #0d4f9e 100%);
  padding: 112px 0 96px; position: relative; overflow: hidden;
}
.hero::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(ellipse 80% 60% at 70% 40%, rgba(29,111,206,.22) 0%, transparent 70%);
  pointer-events: none;
}
.hero > .container { position: relative; z-index: 1; }
.hero-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: center; }

.hero-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.18);
  border-radius: 100px; padding: 6px 16px;
  font-size: .78rem; font-weight: 600; color: rgba(255,255,255,.85); letter-spacing: .04em;
  margin-bottom: 22px;
}
.dot { width: 7px; height: 7px; background: #4ade80; border-radius: 50%; animation: pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

h1 { font-size: clamp(2.2rem,4.5vw,3.4rem); font-weight: 800; color: #fff; letter-spacing: -.02em; line-height: 1.15; }

.hero-sub { font-size: 1.15rem; color: rgba(255,255,255,.72); margin: 20px 0 32px; max-width: 460px; line-height: 1.65; }
.hero-actions { display: flex; gap: 12px; flex-wrap: wrap; }
.hero-stats { display: flex; gap: 32px; margin-top: 48px; padding-top: 32px; border-top: 1px solid rgba(255,255,255,.12); }
.stat-val { font-size: 1.8rem; font-weight: 800; color: #fff; letter-spacing: -.02em; }
.stat-label { font-size: .78rem; color: rgba(255,255,255,.5); margin-top: 2px; }

/* ── Planner mock ────────────────────────────────────────────────────── */
.ui-mock {
  background: #0e1929; border-radius: 16px; overflow: hidden;
  box-shadow: var(--shadow-lg), 0 0 0 1px rgba(255,255,255,.08);
  position: relative;
}
.mock-bar {
  background: #162236; padding: 10px 16px; display: flex; align-items: center; gap: 8px;
  border-bottom: 1px solid rgba(255,255,255,.06);
}
.mock-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.mock-url { font-size: .68rem; color: rgba(255,255,255,.28); font-family: monospace; margin-left: 8px; }
.mock-body { padding: 10px 16px 56px; }
.mock-header, .mock-row { display: grid; grid-template-columns: 110px repeat(5,1fr); gap: 1px; }
.mock-header { background: rgba(255,255,255,.04); border-bottom: 1px solid rgba(255,255,255,.05); margin-bottom: 2px; }
.mock-th { padding: 8px 4px; font-size: .68rem; font-weight: 600; color: rgba(255,255,255,.4); text-align: center; letter-spacing: .04em; }
.mock-th.emp { text-align: left; color: rgba(255,255,255,.3); }
.mock-row { border-bottom: 1px solid rgba(255,255,255,.04); }
.mock-emp { padding: 8px 0; font-size: .7rem; color: rgba(255,255,255,.5); font-weight: 500; display: flex; align-items: center; gap: 6px; }
.mock-avatar { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .55rem; font-weight: 700; color: #fff; flex-shrink: 0; }
.mock-cell { padding: 4px 3px; display: flex; align-items: center; }
.mock-shift { width: 100%; padding: 4px 6px; border-radius: 4px; font-size: .62rem; font-weight: 600; color: #fff; line-height: 1.3; }
.mock-shift.blue  { background: rgba(29,111,206,.75); }
.mock-shift.green { background: rgba(22,163,74,.65); }
.mock-shift.amber { background: rgba(217,119,6,.70); border: 1px solid rgba(251,191,36,.35); }
.mock-shift.red   { background: rgba(220,38,38,.70); border: 1px solid rgba(252,165,165,.3); }
.mock-badge { font-size: .65rem; margin-left: 2px; }
.badge-amber { color: #fbbf24; }
.badge-red   { color: #f87171; }
.mock-ai-pill {
  position: absolute; bottom: 14px; right: 14px;
  background: linear-gradient(135deg, #1d6fce, #0d4f9e);
  border: 1px solid rgba(255,255,255,.15); border-radius: 100px;
  padding: 6px 14px; font-size: .68rem; font-weight: 600; color: #fff;
  display: flex; align-items: center; gap: 6px;
  box-shadow: 0 4px 20px rgba(13,79,158,.5);
}

/* ── Trust ───────────────────────────────────────────────────────────── */
.trust { padding: 36px 0; background: var(--grey-50); border-top: 1px solid var(--grey-200); border-bottom: 1px solid var(--grey-200); }
.trust-inner { display: flex; align-items: center; gap: 40px; flex-wrap: wrap; justify-content: center; }
.trust-label { font-size: .78rem; font-weight: 600; color: var(--grey-400); letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; }
.trust-logos { display: flex; align-items: center; gap: 32px; flex-wrap: wrap; justify-content: center; }
.trust-logo { font-size: .9rem; font-weight: 700; color: var(--grey-400); }
.trust-logo:nth-child(even) { opacity: .4; font-size: .7rem; }

/* ── Features ────────────────────────────────────────────────────────── */
.features-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; }
.feature-card { background: var(--grey-50); border: 1px solid var(--grey-200); border-radius: var(--radius); padding: 30px; transition: box-shadow .2s, transform .2s; }
.feature-card:hover { box-shadow: var(--shadow); transform: translateY(-2px); }
.feature-icon { width: 44px; height: 44px; border-radius: 10px; background: var(--sky); display: flex; align-items: center; justify-content: center; font-size: 1.3rem; margin-bottom: 18px; }
.feature-card p { font-size: .93rem; line-height: 1.65; }

/* ── Steps ───────────────────────────────────────────────────────────── */
.steps { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; position: relative; }
.steps::before { content: ''; position: absolute; top: 27px; left: calc(12.5% + 16px); right: calc(12.5% + 16px); height: 2px; background: var(--grey-200); z-index: 0; }
.step { text-align: center; position: relative; z-index: 1; padding: 0 10px; }
.step-num { width: 54px; height: 54px; border-radius: 50%; background: #fff; border: 2px solid var(--blue); display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 700; color: var(--blue); margin: 0 auto 18px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
.step p { font-size: .88rem; }

/* ── Roles ───────────────────────────────────────────────────────────── */
.roles-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
.role-card { border-radius: var(--radius); overflow: hidden; }
.role-header { padding: 30px 34px 22px; }
.role-header.manager { background: var(--navy); }
.role-header.employee { background: var(--blue); }
.role-tag { font-size: .7rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: rgba(255,255,255,.55); margin-bottom: 10px; }
.role-header h3 { font-size: 1.3rem; color: #fff; margin-bottom: 8px; }
.role-header p { color: rgba(255,255,255,.68); font-size: .93rem; }
.role-body { background: var(--grey-50); border: 1px solid var(--grey-200); border-top: none; border-radius: 0 0 var(--radius) var(--radius); padding: 20px 34px; }
.role-feature { display: flex; align-items: flex-start; gap: 11px; padding: 9px 0; border-bottom: 1px solid var(--grey-200); }
.role-feature:last-child { border-bottom: none; }
.check { width: 19px; height: 19px; border-radius: 50%; background: var(--sky); display: flex; align-items: center; justify-content: center; font-size: .6rem; color: var(--blue); flex-shrink: 0; margin-top: 2px; font-weight: 900; }
.role-feature p { font-size: .88rem; color: var(--grey-600); }

/* ── AI ──────────────────────────────────────────────────────────────── */
.ai-inner { display: grid; grid-template-columns: 1fr 1fr; gap: 72px; align-items: center; }
.ai-points { list-style: none; margin-top: 28px; display: flex; flex-direction: column; gap: 18px; padding: 0; }
.ai-point { display: flex; align-items: flex-start; gap: 14px; }
.ai-icon { font-size: 1.2rem; margin-top: 2px; flex-shrink: 0; }
.ai-point div strong { display: block; font-size: .93rem; color: #fff; margin-bottom: 2px; }
.ai-point div span { font-size: .85rem; color: rgba(255,255,255,.58); }

.suggestion-card { background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.12); border-radius: var(--radius); overflow: hidden; }
.sug-header { background: rgba(255,255,255,.05); padding: 13px 18px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,.08); }
.sug-title { font-size: .76rem; font-weight: 600; color: rgba(255,255,255,.55); letter-spacing: .04em; text-transform: uppercase; }
.sug-badge { background: rgba(29,111,206,.5); border: 1px solid rgba(59,142,234,.4); border-radius: 100px; padding: 3px 10px; font-size: .66rem; font-weight: 600; color: var(--sky-dark); }
.sug-item { display: flex; align-items: center; padding: 13px 18px; gap: 13px; border-bottom: 1px solid rgba(255,255,255,.06); }
.sug-item:last-child { border-bottom: none; }
.sug-item.top { background: rgba(29,111,206,.12); }
.sug-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .76rem; font-weight: 700; color: #fff; flex-shrink: 0; }
.sug-name { flex: 1; }
.sug-name strong { display: block; font-size: .86rem; color: #fff; }
.sug-name span { font-size: .73rem; color: rgba(255,255,255,.48); }
.sug-btn { background: var(--blue); border: none; border-radius: 4px; padding: 6px 13px; font-size: .73rem; font-weight: 600; color: #fff; cursor: pointer; transition: background .15s; }
.sug-btn:hover { background: var(--blue-light); }
.sug-btn.ghost { background: transparent; color: rgba(255,255,255,.38); }
.sug-footer { padding: 12px 18px; border-top: 1px solid rgba(255,255,255,.06); font-size: .7rem; color: rgba(255,255,255,.33); line-height: 1.5; }

/* ── Testimonials ────────────────────────────────────────────────────── */
.testimonials-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 22px; }
.testimonial { background: #fff; border: 1px solid var(--grey-200); border-radius: var(--radius); padding: 30px; }
.stars { color: #f59e0b; font-size: .95rem; letter-spacing: 2px; margin-bottom: 14px; }
.testimonial blockquote { font-size: .93rem; color: var(--grey-600); line-height: 1.7; font-style: italic; margin-bottom: 18px; }
.testimonial-author { display: flex; align-items: center; gap: 11px; }
.testimonial-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: .8rem; font-weight: 700; color: #fff; flex-shrink: 0; }
.author-name { font-size: .86rem; font-weight: 600; color: var(--navy); }
.author-role { font-size: .76rem; color: var(--grey-400); }

/* ── CTA ─────────────────────────────────────────────────────────────── */
.cta-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.cta-note { margin-top: 20px; font-size: .78rem; color: rgba(255,255,255,.32); }

/* ── Footer ──────────────────────────────────────────────────────────── */
.footer { background: var(--grey-800); padding: 48px 0 32px; }
.footer-inner { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 48px; padding-bottom: 36px; border-bottom: 1px solid rgba(255,255,255,.08); margin-bottom: 28px; }
.footer-brand .logo { font-size: 1.2rem; }
.footer-brand p { font-size: .85rem; color: rgba(255,255,255,.38); margin-top: 12px; max-width: 240px; line-height: 1.65; }
.footer-col h4 { font-size: .76rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: rgba(255,255,255,.45); margin-bottom: 14px; }
.footer-col ul { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 10px; }
.footer-col li a { font-size: .85rem; color: rgba(255,255,255,.38); text-decoration: none; transition: color .15s; }
.footer-col li a:hover { color: #fff; }
.footer-bottom { display: flex; justify-content: space-between; align-items: center; font-size: .78rem; color: rgba(255,255,255,.3); }

/* ── Responsive ──────────────────────────────────────────────────────── */
@media (max-width: 900px) {
  .hero-grid, .ai-inner, .roles-grid { grid-template-columns: 1fr; gap: 48px; }
  .features-grid { grid-template-columns: 1fr 1fr; }
  .steps { grid-template-columns: 1fr 1fr; }
  .steps::before { display: none; }
  .testimonials-grid { grid-template-columns: 1fr; }
  .footer-inner { grid-template-columns: 1fr 1fr; }
  .nav-links { display: none; }
}
@media (max-width: 600px) {
  .section { padding: 64px 0; }
  .features-grid, .steps, .footer-inner { grid-template-columns: 1fr; }
}
</style>
